# Industrias Valeo S.A.S.

Sitio web corporativo de Industrias Valeo S.A.S., empresa dedicada a la comercialización de repuestos para ventiladores, licuadoras y ollas a presión.

La página está construida con FastAPI, plantillas HTML, CSS y JavaScript. No necesita base de datos, `DATABASE_URL`, Supabase ni credenciales para iniciar.

## Ejecución local

1. (Opcional) Crea y activa un entorno virtual.
2. Instala las dependencias:

   ```bash
   pip install -r requirements.txt
   ```

3. Inicia el servidor:

   ```bash
   uvicorn main:app --reload
   ```

4. Abre <http://127.0.0.1:8000>.

## Solicitudes de cotización

La selección se conserva en el navegador. Para recibir cotizaciones, configura `VALEO_QUOTE_SERVICE_URL` con la URL HTTPS de un servicio externo que acepte `POST` con los datos de contacto y las referencias solicitadas. Si el proveedor requiere autenticación Bearer, configura también `VALEO_QUOTE_SERVICE_TOKEN` como secreto. No se almacenan solicitudes en una base de datos.

Si `VALEO_QUOTE_SERVICE_URL` no está configurada, el endpoint responde con `503` y la página informa claramente que no se envió ni registró la solicitud. Un error o rechazo del servicio configurado tampoco se presenta como éxito. El servicio externo debe aceptar el contrato JSON enviado por `POST /api/quotes` y devolver un código HTTP 2xx.

El cuerpo que recibe el servicio configurado sigue esta estructura (cada producto se resuelve contra el catálogo local antes de reenviarse):

```json
{
  "company": "Industrias Valeo S.A.S.",
  "customer": { "name": "Nombre", "city": "Ciudad", "phone": "Celular" },
  "items": [
    {
      "productId": "licuadoras-01",
      "name": "Acople amarillo 6/14",
      "category": "Licuadoras",
      "group": "Acoples para la licuadora",
      "quantity": 2
    }
  ],
  "privacyConsent": true
}
```

Las variantes de color indicadas en el catálogo también incluyen `color` cuando el cliente lo selecciona. Se requiere HTTPS porque el envío contiene datos personales.

## Despliegue en Render

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Configura `VALEO_QUOTE_SERVICE_URL` (y, si aplica, `VALEO_QUOTE_SERVICE_TOKEN`) en el entorno del servicio.

## Estructura

- `main.py`: aplicación FastAPI sin base de datos, ruta principal, montaje de archivos estáticos y recepción/validación de solicitudes de cotización para un servicio externo configurado.
- `templates/index.html`: página corporativa y sus secciones.
- `static/css/style.css`: estilos responsive, animaciones e interfaz de cotización.
- `static/js/site.js`: menú móvil, catálogo, filtros, selección local de cotización, envío al servicio externo y año del footer.
- `static/maps/colombia-departments.svg`: mapa interactivo de 32 departamentos y Bogotá D.C.; datos geográficos con atribución/licencia en `static/maps/SOURCES.md`.
- `static/data/coverage-departments.json`: nombres oficiales de presentación y ciudades principales de referencia para el panel interactivo de cobertura.
- `static/images/logos/logo-valeo-horizontal.png`: logo oficial horizontal azul y negro, usado en el header y la portada.
- `static/images/logos/logo-valeo-principal.png`: variante oficial principal, archivada para usos futuros.
- `static/images/logos/logo-valeo-negro.png`: variante oficial negra, usada en el footer sobre fondo blanco.

Los archivos `crud.py`, `database.py`, `models.py`, `schemas.py`, `supabase_utils.py` y `valeo_db.sql` se conservan como respaldo del sistema anterior. La aplicación web actual no los importa ni los utiliza.

La información de tratamiento de datos de la página es una base informativa que la empresa debe revisar y completar con sus procedimientos, plazos y canales antes de habilitar el servicio externo en producción.
