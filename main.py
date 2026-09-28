import asyncio
import hmac
import json
import logging
import os
import re
import sqlite3
from contextlib import asynccontextmanager, closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_QUOTES_DB_PATH = BASE_DIR / "data" / "cotizaciones.db"
QUOTES_DB_PATH = Path(os.environ.get("VALEO_COTIZACIONES_DB", DEFAULT_QUOTES_DB_PATH))
logger = logging.getLogger(__name__)


class QuoteVariantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    color: Annotated[str, Field(min_length=1, max_length=60)]
    cantidad: Annotated[int, Field(gt=0, le=1_000_000, strict=True)]

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        if value.casefold() in {"null", "undefined", "nan", "[object object]"}:
            raise ValueError("El color no es válido.")
        return value


class QuoteProductRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nombre: Annotated[str, Field(min_length=1, max_length=160)]
    referencia: Annotated[str | None, Field(default=None, max_length=80)]
    cantidad: Annotated[int | None, Field(default=None, gt=0, le=1_000_000, strict=True)]
    variantes: Annotated[list[QuoteVariantRequest] | None, Field(default=None, max_length=20)]

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, value: object) -> object:
        if isinstance(value, dict) and any(
            key in value and value[key] is None
            for key in ("referencia", "cantidad", "variantes")
        ):
            raise ValueError("Omite los campos opcionales que no apliquen; no envíes null.")
        return value

    @field_validator("nombre", "referencia")
    @classmethod
    def validate_text_fields(cls, value: str | None) -> str | None:
        if value == "":
            raise ValueError("El valor no puede estar vacío.")
        if value is not None and value.casefold() in {"null", "undefined", "nan", "[object object]"}:
            raise ValueError("El valor no es válido.")
        return value

    @model_validator(mode="after")
    def validate_quantity_or_variants(self):
        if self.variantes is None and self.cantidad is None:
            raise ValueError("Cada producto debe incluir cantidad o variantes.")
        if self.variantes is not None and not self.variantes:
            raise ValueError("La lista de variantes no puede estar vacía.")
        if self.variantes is not None and self.cantidad is not None:
            raise ValueError("Indica cantidad o variantes, no ambos.")
        return self


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nombre: Annotated[str, Field(min_length=1, max_length=120)]
    ciudad: Annotated[str, Field(min_length=1, max_length=120)]
    celular: Annotated[str, Field(min_length=7, max_length=30)]
    productos: Annotated[list[QuoteProductRequest], Field(min_length=1, max_length=100)]

    @field_validator("nombre", "ciudad", "celular")
    @classmethod
    def validate_contact_fields(cls, value: str) -> str:
        if value.casefold() in {"null", "undefined", "nan", "[object object]"}:
            raise ValueError("El dato de contacto no es válido.")
        return value


def _connect_quotes_db() -> sqlite3.Connection:
    connection = sqlite3.connect(QUOTES_DB_PATH, timeout=10)
    os.chmod(QUOTES_DB_PATH.parent, 0o700)
    os.chmod(QUOTES_DB_PATH, 0o600)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def _initialize_quotes_db() -> None:
    QUOTES_DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(QUOTES_DB_PATH.parent, 0o700)
    with closing(_connect_quotes_db()) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS cotizaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_hora TEXT NOT NULL,
                nombre TEXT NOT NULL,
                ciudad TEXT NOT NULL,
                celular TEXT NOT NULL,
                productos_json TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente'
            )
            """
        )
        connection.commit()


def _store_quote(quote: QuoteRequest) -> int:
    products_json = json.dumps(
        [product.model_dump(mode="json", exclude_none=True) for product in quote.productos],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with closing(_connect_quotes_db()) as connection:
        with connection:
            cursor = connection.execute(
                """
                INSERT INTO cotizaciones (fecha_hora, nombre, ciudad, celular, productos_json, estado)
                VALUES (?, ?, ?, ?, ?, 'pendiente')
                """,
                (created_at, quote.nombre, quote.ciudad, quote.celular, products_json),
            )
            return int(cursor.lastrowid)


def _list_quotes(limit: int) -> list[dict[str, object]]:
    with closing(_connect_quotes_db()) as connection:
        rows = connection.execute(
            """
            SELECT id, fecha_hora, nombre, ciudad, celular, productos_json, estado
            FROM cotizaciones
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "fecha_hora": row["fecha_hora"],
            "nombre": row["nombre"],
            "ciudad": row["ciudad"],
            "celular": row["celular"],
            "productos": json.loads(row["productos_json"]),
            "estado": row["estado"],
        }
        for row in rows
    ]


@asynccontextmanager
async def lifespan(_: FastAPI):
    await asyncio.to_thread(_initialize_quotes_db)
    yield


app = FastAPI(title="Industrias Valeo S.A.S.", lifespan=lifespan)
app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static",
)
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/cotizaciones", status_code=201)
async def create_quote(quote: QuoteRequest):
    try:
        quote_id = await asyncio.to_thread(_store_quote, quote)
    except (OSError, sqlite3.Error) as error:
        logger.exception("No fue posible guardar la cotización en SQLite: %s", error)
        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar la solicitud en este momento.",
        ) from error
    return {
        "ok": True,
        "mensaje": "Solicitud recibida correctamente",
        "cotizacion_id": quote_id,
    }


@app.get("/api/cotizaciones")
async def list_quotes(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    admin_token = os.environ.get("COTIZACIONES_ADMIN_TOKEN", "")
    if len(admin_token) < 32 or not admin_token.isascii() or admin_token != admin_token.strip():
        raise HTTPException(status_code=404, detail="Endpoint no disponible.")
    authorization = request.headers.get("authorization", "")
    scheme, _, provided_token = authorization.partition(" ")
    if (
        scheme.casefold() != "bearer"
        or not provided_token
        or not provided_token.isascii()
        or not hmac.compare_digest(provided_token, admin_token)
    ):
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return {"cotizaciones": await asyncio.to_thread(_list_quotes, limit)}
    except (OSError, sqlite3.Error, json.JSONDecodeError) as error:
        logger.exception("No fue posible consultar las cotizaciones: %s", error)
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar las solicitudes.",
        ) from error
