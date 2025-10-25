# 🚀 Proyecto Valeo — API de Gestión de Ventas e Inventario

API desarrollada con **FastAPI + SQLModel + SQLite**, enfocada en la gestión de **clientes**, **productos** y **pedidos** para la empresa **Industrias Valeo S.A.S**.  
El sistema permite realizar operaciones CRUD completas, controlar inventario automáticamente y manejar las relaciones entre entidades del modelo de datos.

---

## 🧠 Objetivo del Proyecto

Desarrollar una aplicación backend que permita administrar la información de clientes, productos y pedidos de manera eficiente, aplicando las reglas de negocio y las relaciones entre entidades.  
El proyecto busca servir como base para futuras integraciones con módulos de facturación y reportes analíticos.

---

## 🗺️ Mapa de Endpoints (API Valeo)

| Método | Endpoint | Descripción | Regla / Relación |
|--------|-----------|--------------|------------------|
| **GET** | `/` | Estado del API | Devuelve mensaje de conexión |
| **POST** | `/clientes/` | Crear cliente | Registra un nuevo cliente |
| **GET** | `/clientes/` | Listar clientes | Muestra todos los clientes |
| **GET** | `/clientes/{id}` | Obtener cliente | Busca cliente por ID |
| **PUT** | `/clientes/{id}` | Actualizar cliente | Modifica información |
| **DELETE** | `/clientes/{id}` | Eliminar cliente | Elimina cliente de la BD |
| **POST** | `/products/` | Crear producto | Registra un producto con precio y stock |
| **GET** | `/products/` | Listar productos | Muestra todos los productos |
| **GET** | `/products/{id}` | Obtener producto | Muestra detalles de un producto |
| **PUT** | `/products/{id}` | Actualizar producto | Actualiza campos del producto |
| **DELETE** | `/products/{id}` | Eliminar producto | Elimina producto de la BD |
| **POST** | `/pedidos/` | Crear pedido | Valida stock, calcula total y crea detalles |
| **GET** | `/pedidos/` | Listar pedidos | Muestra pedidos con sus productos |
| **GET** | `/pedidos/{id}` | Consultar pedido | Devuelve un pedido específico |
| **PUT** | `/pedidos/{id}` | Actualizar pedido | Permite cambiar cliente o productos |
| **DELETE** | `/pedidos/{id}` | Eliminar pedido | Elimina pedido y repone stock |

---

## 🧱 Modelos Principales

| Modelo | Descripción |
|---------|--------------|
| **Cliente** | Contiene datos de los clientes (`id`, `nombre`, `correo`, `telefono`). |
| **Producto** | Catálogo de productos (`id`, `nombre`, `precio`, `stock`). |
| **Pedido** | Encabezado del pedido (`id`, `id_cliente`, `fecha`, `total`). |
| **DetallePedido** | Detalle de productos en cada pedido (`id_pedido`, `id_producto`, `cantidad`, `subtotal`). |

---

### Relaciones directas (por clave foránea)
| # | Tipo | Entidad A | Entidad B | Implementación |
|---|------|-----------|-----------|----------------|
| 1 | **1 : N** | **Cliente** | **Pedido** | `Pedido.id_cliente → Cliente.id` |
| 2 | **1 : N** | **Pedido** | **DetallePedido** | `DetallePedido.id_pedido → Pedido.id` |
| 3 | **1 : N** | **Producto** | **DetallePedido** | `DetallePedido.id_producto → Producto.id` |

### Relación derivada (muchos a muchos)
| # | Tipo | Entidad A | Entidad B | Implementación |
|---|------|-----------|-----------|----------------|
| 4 | **N : M** | **Pedido** | **Producto** | **A través de** `DetallePedido` (combina #2 y #3) |

---

## Diagrama ENTIDAD RELACION 



    CLIENTE {
      int id PK
      string nombre
      string correo
      string telefono
    }

    PEDIDO {
      int id PK
      int id_cliente FK
      datetime fecha
      float total
    }

    DETALLE_PEDIDO {
      int id PK
      int id_pedido FK
      int id_producto FK
      int cantidad
      float precio_unitario
      float subtotal
    }

    PRODUCTO {
      int id PK
      string nombre
      float precio
      int stock
    }


---

## ⚙️ Tecnologías Utilizadas

- 🐍 **Python 3.11**
- ⚡ **FastAPI** — Framework backend moderno y rápido
- 🗃️ **SQLModel + SQLite** — ORM y base de datos local
- 🧩 **Uvicorn** — Servidor ASGI para ejecutar la API
- ✅ **Pydantic** — Validación y serialización de datos

---

## 🧮 Base de Datos

- Motor: **SQLite 3**
- Archivo local: `valeodb.sqlite3`
- ORM: **SQLModel**
- Las tablas se crean automáticamente mediante:
  ```python
  init_db()

##  👨‍💻 Autor

Omar David Valderrama Gutiérrez
📍 Universidad Católica de Colombia
📧 odvalderrama16@ucatolica.edu.co