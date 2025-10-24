# 🚀 Proyecto Valeo — API de Gestión de Ventas e Inventario

API desarrollada con **FastAPI + SQLModel + SQLite**, enfocada en la gestión de clientes, productos y pedidos de la empresa **Industrias Valeo S.A.S**.  
Permite realizar operaciones CRUD completas, manejar relaciones entre entidades y generar reportes automáticos.

---

## 🧠 Objetivo del proyecto

Desarrollar una aplicación backend que permita administrar la información de clientes, productos, pedidos y facturación de manera eficiente, aplicando las reglas de negocio y relaciones entre entidades del modelo de datos.  
El proyecto busca servir como sistema base de gestión y punto de integración futura con módulos de reportes y análisis.

---

## 🗺️ Mapa de Endpoints (API Valeo)

| Método | Endpoint | Descripción | Relación / Regla de negocio |
|--------|-----------|--------------|------------------------------|
| **GET** | `/` | Estado del API | Devuelve mensaje de conexión |
| **POST** | `/clientes` | Crear cliente | Registra un nuevo cliente con datos coherentes |
| **GET** | `/clientes` | Listar clientes | Retorna todos los clientes activos |
| **GET** | `/clientes/{id}` | Obtener cliente | Muestra datos de un cliente por ID |
| **PUT** | `/clientes/{id}` | Actualizar cliente | Modifica información completa |
| **PATCH** | `/clientes/{id}` | Actualización parcial | Cambia solo correo o teléfono |
| **DELETE** | `/clientes/{id}` | Eliminar cliente | *Soft delete*, marca como inactivo |
| **POST** | `/clientes/{id}/restore` | Restaurar cliente | Reactiva cliente eliminado |
| **POST** | `/products` | Crear producto | Registra un producto con stock y precio |
| **GET** | `/products` | Listar productos | Muestra productos activos |
| **GET** | `/products/{id}` | Obtener producto | Muestra detalles de un producto |
| **PUT** | `/products/{id}` | Actualizar producto | Actualiza todos los campos |
| **PATCH** | `/products/{id}` | Actualizar stock/precio | Solo campos específicos |
| **DELETE** | `/products/{id}` | Eliminar producto | *Soft delete*, no elimina físicamente |
| **POST** | `/pedidos` | Crear pedido | Valida stock, calcula total y crea los detalles |
| **GET** | `/pedidos` | Listar pedidos | Muestra pedidos con sus productos |
| **POST** | `/facturas/{id_pedido}` | Crear factura | Crea factura asociada (relación 1:1) |
| **GET** | `/facturas/{id_pedido}` | Consultar factura | Devuelve la factura por pedido |
| **GET** | `/reports/ventas-producto` | Reporte CSV | Ventas por producto (rango de fechas) |

---

## 🧩 Relaciones entre los modelos

| Relación | Descripción |
|-----------|-------------|
| **1:N** | Cliente → Pedido |
| **N:M** | Pedido ↔ Producto (a través de DetallePedido) |
| **1:1** | Pedido ↔ Factura |

---

## 🗂️ Modelos principales

| Modelo | Descripción |
|---------|--------------|
| **Cliente** | Información de los clientes (nombre, correo, teléfono). |
| **Producto** | Datos de los productos (nombre, precio, stock). |
| **Pedido** | Encabezado del pedido con total, fecha y cliente asociado. |
| **DetallePedido** | Productos incluidos en cada pedido (cantidad, precio, subtotal). |
| **Factura** | Documento asociado 1:1 con un pedido, incluye medio de pago y número de factura. |

---

## ⚙️ Tecnologías utilizadas

- 🐍 **Python 3.11**
- ⚡ **FastAPI**
- 🗃️ **SQLModel + SQLite**
- 🧩 **Uvicorn**
- 📊 **Pandas / ReportLab / OpenPyXL** (para reportes)

---

## 🧪 Ejecución del proyecto
