import asyncio
import json
import logging
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Industrias Valeo S.A.S.")
logger = logging.getLogger(__name__)
app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static",
)
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


class QuoteItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    product_id: Annotated[str, Field(alias="productId", min_length=1, max_length=80)]
    quantity: Annotated[int, Field(ge=1, le=1_000_000)]
    color: Annotated[str | None, Field(default=None, max_length=60)]


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: Annotated[str, Field(min_length=1, max_length=120)]
    city: Annotated[str, Field(min_length=1, max_length=120)]
    phone: Annotated[str, Field(min_length=7, max_length=30)]
    items: Annotated[list[QuoteItemRequest], Field(min_length=1, max_length=100)]
    privacyConsent: Literal[True]

    @field_validator("name", "city", "phone", mode="before")
    @classmethod
    def strip_contact_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class _RejectQuoteRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None


def _is_color_variant(product_name: str) -> bool:
    return bool(re.search(
        r"\bcolores\b|\b(?:gris,\s*)?blanc[oa]\s+y\s+negr[oa]\b|\bgris,\s*blanca\b",
        product_name,
        re.IGNORECASE,
    ))


def _send_quote_to_service(payload: dict[str, object], service_url: str, token: str) -> None:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        service_url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    opener = urllib.request.build_opener(_RejectQuoteRedirects())
    with opener.open(request, timeout=12) as response:
        if not 200 <= response.status < 300:
            raise urllib.error.URLError(f"Unexpected response status {response.status}")


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request},
    )


@app.post("/api/quotes", status_code=202)
async def submit_quote(quote: QuoteRequest):
    service_url = os.environ.get("VALEO_QUOTE_SERVICE_URL", "").strip()
    if not service_url:
        logger.error("Quote submission rejected: VALEO_QUOTE_SERVICE_URL is not configured.")
        raise HTTPException(
            status_code=503,
            detail="El servicio de recepción de cotizaciones aún no está conectado. No se envió ni registró la solicitud.",
        )
    parsed_service_url = urlsplit(service_url)
    try:
        service_port = parsed_service_url.port
        invalid_service_url = (
            parsed_service_url.scheme != "https"
            or not parsed_service_url.hostname
            or parsed_service_url.username is not None
            or parsed_service_url.password is not None
            or bool(parsed_service_url.fragment)
            or (service_port is not None and not 1 <= service_port <= 65535)
        )
    except ValueError:
        invalid_service_url = True
    if invalid_service_url:
        logger.error("Quote submission service URL is invalid.")
        raise HTTPException(
            status_code=500,
            detail="La configuración del servicio de cotizaciones no es válida. No se envió la solicitud.",
        )

    try:
        catalog = json.loads((BASE_DIR / "static" / "data" / "catalogo-productos.json").read_text(encoding="utf-8"))
        categories = {category["id"]: category["name"] for category in catalog["categories"]}
        products = {product["id"]: product for product in catalog["products"]}
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        logger.exception("Could not load the local catalog to validate the quote: %s", error)
        raise HTTPException(
            status_code=500,
            detail="No se pudo validar el catálogo. No se envió la solicitud.",
        ) from error

    validated_items: list[dict[str, object]] = []
    for item in quote.items:
        product = products.get(item.product_id)
        if product is None:
            raise HTTPException(status_code=422, detail="La solicitud incluye un producto que no pertenece al catálogo.")
        color = (item.color or "").strip()
        if color and not _is_color_variant(product["name"]):
            raise HTTPException(
                status_code=422,
                detail=f"El producto {product['name']} no tiene variantes de color indicadas en el catálogo.",
            )
        validated_items.append({
            "productId": product["id"],
            "name": product["name"],
            "category": categories[product["category"]],
            "group": product["group"],
            "quantity": item.quantity,
            **({"color": color} if color else {}),
        })

    payload: dict[str, object] = {
        "company": "Industrias Valeo S.A.S.",
        "customer": {"name": quote.name, "city": quote.city, "phone": quote.phone},
        "items": validated_items,
        "privacyConsent": quote.privacyConsent,
    }
    try:
        await asyncio.to_thread(
            _send_quote_to_service,
            payload,
            service_url,
            os.environ.get("VALEO_QUOTE_SERVICE_TOKEN", ""),
        )
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        logger.exception("Configured quote service did not accept a quote: %s", error)
        raise HTTPException(
            status_code=502,
            detail="No fue posible confirmar la solicitud con el servicio de recepción. No se registró; intenta de nuevo o contáctanos por WhatsApp.",
        ) from error

    return {"status": "accepted"}
