
# Inventario Industrias Valeo S.A.S

## Descripción del Proyecto
Este proyecto es un Sistema Web de Gestión de Inventario para la empresa **Industrias Valeo S.A.S.**, desarrollado con FastAPI, SQLModel, HTML, CSS y JavaScript.
El sistema permite administrar el inventario real de la empresa, incluyendo categorías, productos, clientes y control de ventas.

El sistema está desplegado en una URL pública, accesible desde cualquier dispositivo, y la información se gestiona mediante formularios web fáciles de usar.

## Funcionalidades Principales

- **Gestión de Categorías**
  - Crear, listar, filtrar, actualizar y desactivar categorías (CRUD completo).

- **Gestión de Productos**
  - Registrar productos con imagen, descripción, precio y stock.
  - Actualizar, desactivar y visualizar toda la información.

- **Gestión de Clientes**
  - Registrar y consultar la información de clientes que realizan compras.

- **Registros de Ventas**
  - Control del ingreso y egreso de productos al inventario mediante ventas.

- **Relación entre datos del inventario**
  - Los productos se vinculan directamente a su categoría.

- **Dashboard Analítico en tiempo real 📊**
  - Estadísticas como:
    - Ingresos totales
    - Promedio mensual de ingresos
    - Cantidad de productos
    - Cantidad de categorías
    - Gráficas de ventas mensuales
    - Distribución de ventas por categoría
    - Top 5 productos más vendidos

- **Validaciones de datos en el Front y en el Back**
  - Para evitar información inconsistente.

- **Búsqueda y filtros dentro del mismo sitio**
  - Barra de navegación y filtros en cada módulo.


## Tecnologías Utilizadas

| Tecnología   | Uso                                      |
| ------------ | ---------------------------------------- |
| FastAPI      | Backend y funcionamiento de las APIs      |
| SQLModel     | Modelo y manipulación de datos            |
| HTML + CSS + Bootstrap | Interfaz gráfica moderna y responsiva |
| JavaScript   | Interacción dinámica con la API           |
| Render       | Despliegue de la aplicación en la nube    |
| Supabase     | Almacenamiento de imágenes                |

## Objetivo del Proyecto

Optimizar el control de inventarios de la empresa Industrias Valeo S.A.S., ofreciendo una herramienta centralizada para administrar productos, clientes y ventas, mejorando el proceso operativo y la toma de decisiones mediante reportes visuales.

## Tecnologías Utilizadas
**FastAPI**: Framework para construir APIs web rápidas y modernas.
**SQLModel**: Librería para trabajar con SQLAlchemy y Pydantic, facilitando el manejo de modelos de base de datos.
**SQLite**: Base de datos ligera y embebida.
**Pydantic**: Para validación de datos y esquemas.
**CSS**: Para el diseño y estilos de la interfaz web (ubicado en `static/css/style.css`).
**JavaScript**: Para la interacción dinámica en la web, formularios y llamadas a la API (ubicado en `static/js/productos_read.js` y scripts en los templates HTML).

## Instalación
1. Clona el repositorio:
   ```
   git clone <url-del-repositorio>
   cd tiendaoficial
   ```

2. Instala las dependencias:
   ```
   pip install fastapi sqlmodel uvicorn
   ```

3. Ejecuta la aplicación:
   ```
   uvicorn main:app --reload
   ```

La API estará disponible en `http://127.0.0.1:8000`.

## Uso
Una vez ejecutada, puedes acceder a la documentación interactiva de la API en `http://127.0.0.1:8000/docs` (Swagger UI) o `http://127.0.0.1:8000/redoc` (ReDoc).

### Endpoints Principales
#### Categorías
- `POST /categorias/`: Crear una nueva categoría.
- `GET /categorias/`: Obtener todas las categorías activas.
- `GET /categorias/{id}`: Obtener una categoría por ID.
- `GET /categorias/{id}/productos`: Obtener una categoría con sus productos.
- `PUT /categorias/{id}`: Actualizar una categoría.
- `PATCH /categorias/{id}/desactivar`: Desactivar una categoría.
- `DELETE /categorias/{id}`: Eliminar una categoría.

#### Productos
- `POST /productos/`: Crear un nuevo producto.
- `GET /productos/`: Obtener todos los productos.
- `GET /productos/{id}`: Obtener un producto por ID.
- `GET /productos/{id}/categoria`: Obtener un producto con su categoría.
- `PUT /productos/{id}`: Actualizar un producto.
- `PATCH /productos/{id}/desactivar`: Desactivar un producto.
- `PATCH /productos/{id}/restar-stock`: Restar stock a un producto.
- `DELETE /productos/{id}`: Eliminar un producto.

## Estructura del Proyecto
- `models.py`: Definición de los modelos de base de datos (Categoria, Producto).
- `schemas.py`: Esquemas Pydantic para validación y respuestas.
- `database.py`: Configuración de la base de datos y inicialización.
- `crud.py`: Funciones CRUD para operaciones en la base de datos.
- `main.py`: Punto de entrada de la aplicación FastAPI.

## Modelos y Relaciones

### Clases de Modelos
- **Categoria**:
  - `id`: int (primary key)
  - `nombre`: str (unique, index)
  - `descripcion`: Optional[str]
  - `activa`: bool (default: True)
  - `deleted_at`: Optional[datetime]
  - Relación: `productos` (List[Producto]) - back_populates="categoria"

- **Producto**:
  - `id`: int (primary key)
  - `nombre`: str
  - `descripcion`: Optional[str]
  - `precio`: float
  - `stock`: int
  - `activo`: bool (default: True)
  - `deleted_at`: Optional[datetime]
  - `categoria_id`: int (foreign key to Categoria.id)
  - Relación: `categoria` (Optional[Categoria]) - back_populates="productos"

### Relaciones
- Una **Categoria** puede tener muchos **Producto** (one-to-many).
- Un **Producto** pertenece a una **Categoria** (many-to-one).

## Endpoints Detallados

### Categorías
- `POST /categorias/`: Crear una nueva categoría.
  - Body: `CategoriaCreate` (nombre, descripcion, activa)
  - Response: `Categoria`
- `GET /categorias/`: Obtener todas las categorías activas.
  - Response: `list[Categoria]`
- `GET /categorias/{id}`: Obtener una categoría por ID.
  - Response: `Categoria`
- `GET /categorias/{id}/productos`: Obtener una categoría con sus productos.
  - Response: dict con categoría y lista de productos
- `PUT /categorias/{id}`: Actualizar una categoría.
  - Body: `CategoriaUpdate`
  - Response: `Categoria`
- `PATCH /categorias/{id}/desactivar`: Desactivar una categoría.
  - Response: `Categoria`
- `DELETE /categorias/{id}`: Eliminar una categoría (soft delete).
  - Response: dict con mensaje
- `GET /categorias/eliminadas`: Obtener categorías eliminadas.
  - Response: list[dict]

### Productos
- `POST /productos/`: Crear un nuevo producto.
  - Body: `ProductoCreate` (nombre, descripcion, precio, stock, activo, categoria_id)
  - Response: `Producto`
- `GET /productos/`: Obtener todos los productos.
  - Response: `list[ProductoListResponse]`
- `GET /productos/{id}`: Obtener un producto por ID.
  - Response: `Producto`
- `GET /productos/{id}/categoria`: Obtener un producto con su categoría.
  - Response: `ProductoResponse`
- `PUT /productos/{id}`: Actualizar un producto.
  - Body: `ProductoUpdate`
  - Response: `Producto`
- `PATCH /productos/{id}/desactivar`: Desactivar un producto.
  - Response: `Producto`
- `PATCH /productos/{id}/restar-stock`: Restar stock a un producto.
  - Body: `RestarStock` (cantidad)
  - Response: `Producto`
- `DELETE /productos/{id}`: Eliminar un producto (soft delete).
  - Response: dict con mensaje
- `GET /productos/eliminados`: Obtener productos eliminados.
  - Response: list[dict]

## Autor
- **Nombre**: Omar David Valderrama Gutierrez
- **Código**: 67000516

