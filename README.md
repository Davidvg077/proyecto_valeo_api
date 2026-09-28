# Industrias Valeo S.A.S.

Sitio web corporativo de Industrias Valeo S.A.S., empresa dedicada a la comercialización de repuestos para ventiladores, licuadoras y ollas a presión.

La página está construida con FastAPI, plantillas HTML, CSS y JavaScript. No usa `DATABASE_URL`, Supabase ni PostgreSQL. Las solicitudes de cotización se guardan localmente en SQLite.

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

## Despliegue en Hostinger VPS con Docker

Se requiere Docker Engine y el plugin Docker Compose en el VPS. Desde la raíz del repositorio, valida y levanta el sitio con:

```bash
docker compose config
docker compose up --build -d
```

La aplicación escucha en `0.0.0.0:8000` dentro del contenedor y publica el puerto `8000` del VPS. Consulta el estado y los registros con `docker compose ps` y `docker compose logs -f`; para detenerla usa `docker compose down`.

El servicio corre como usuario sin privilegios, con sistema de archivos de solo lectura y reinicio automático (`unless-stopped`). La base de datos se guarda en el volumen Docker `cotizaciones_data`, montado en `/app/data`; no elimines este volumen al actualizar o detener el servicio (`docker compose down -v` sí lo elimina). Configura `COTIZACIONES_ADMIN_TOKEN` con un secreto aleatorio de al menos 32 caracteres en el entorno protegido del VPS para habilitar el endpoint administrativo de consulta. Sin ese token, el endpoint de consulta permanece deshabilitado. No agregues credenciales ni archivos `.env` al repositorio o a la imagen.

## Solicitudes de cotización

El frontend envía las solicitudes a `POST /api/cotizaciones`. FastAPI valida nombre, ciudad, celular, productos, cantidades y variantes con Pydantic y guarda cada solicitud en `data/cotizaciones.db` con estado inicial `pendiente`. La API responde HTTP 201 solo después de guardar la cotización; ante errores de SQLite devuelve HTTP 500. La selección del navegador se conserva si ocurre un error.

Para consultar las solicitudes más recientes durante administración o pruebas, usa `GET /api/cotizaciones` con el token configurado:

```bash
curl -H "Authorization: Bearer $COTIZACIONES_ADMIN_TOKEN" \
  "https://tu-dominio.example/api/cotizaciones?limit=20"
```

El endpoint devuelve datos personales; queda deshabilitado (HTTP 404) si el token no está configurado, y requiere autenticación Bearer cuando sí lo está. Protege el token y limita el acceso administrativo a conexiones HTTPS.

El cuerpo de `POST /api/cotizaciones` usa esta estructura:

```json
{
  "nombre": "Nombre",
  "ciudad": "Ciudad",
  "celular": "Celular",
  "productos": [
    {
      "nombre": "Aspa Picoloro 18",
      "referencia": "ventiladores-03",
      "variantes": [
        { "color": "Azul", "cantidad": 24 },
        { "color": "Rojo", "cantidad": 12 }
      ]
    },
    {
      "nombre": "Frentera Turbo blanca",
      "referencia": "ventiladores-11",
      "cantidad": 50
    }
  ]
}
```

La respuesta exitosa tiene `ok`, `mensaje` y `cotizacion_id`. El enlace opcional de WhatsApp se prepara con el identificador asignado por SQLite.

## Despliegue en otros servicios

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Configura `VALEO_COTIZACIONES_DB` para que apunte a un disco persistente montado por el proveedor. Sin disco persistente, las cotizaciones pueden perderse al reiniciar o reemplazar la instancia.
- Configura `COTIZACIONES_ADMIN_TOKEN` con un secreto aleatorio de al menos 32 caracteres solo si necesitas habilitar la consulta administrativa.

## Estructura

- `main.py`: aplicación FastAPI, montaje de archivos estáticos, validación de cotizaciones, persistencia SQLite y consulta administrativa protegida.
- `Dockerfile` y `docker-compose.yml`: imagen y servicio de producción para el despliegue en VPS.
- `.dockerignore`: excluye entornos locales, archivos de configuración sensible, credenciales y bases locales del contexto de build.
- `templates/index.html`: página corporativa y sus secciones.
- `static/css/style.css`: estilos responsive, animaciones e interfaz de cotización.
- `static/js/site.js`: menú móvil, catálogo, filtros, selección local de cotización, envío a FastAPI/SQLite y año del footer.
- `static/maps/colombia-departments.svg`: mapa interactivo de 32 departamentos y Bogotá D.C.; datos geográficos con atribución/licencia en `static/maps/SOURCES.md`.
- `static/data/coverage-departments.json`: nombres oficiales de presentación y ciudades principales de referencia para el panel interactivo de cobertura.
- `static/images/logos/logo-valeo-horizontal.png`: logo oficial horizontal azul y negro, usado en el header y la portada.
- `static/images/logos/logo-valeo-principal.png`: variante oficial principal, archivada para usos futuros.
- `static/images/logos/logo-valeo-negro.png`: variante oficial negra, usada en el footer sobre fondo blanco.

Los archivos `crud.py`, `database.py`, `models.py`, `schemas.py`, `supabase_utils.py` y `valeo_db.sql` se conservan como respaldo del sistema anterior. La aplicación web actual no los importa ni los utiliza.

La información de tratamiento de datos de la página debe ser revisada y completada por la empresa con sus procedimientos, plazos de conservación y canales para ejercer derechos.
