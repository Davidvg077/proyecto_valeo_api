from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, Session 
from database import get_session
from models import Producto
from schemas import ProductoCreate

router = APIRouter(prefix="/products", tags=["products"])

# Crear producto
@router.post("/", response_model=Producto, status_code=201)
def create_producto(data: ProductoCreate, session: Session = Depends(get_session)):
    producto = Producto(**data.model_dump())
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto

# Listamos productos
@router.get("/", response_model=list[Producto])
def list_productos(session: Session = Depends(get_session)):
    productos = session.exec(select(Producto)).all()
    return productos

# Obtener producto por ID
@router.get("/{producto_id}", response_model=Producto)
def get_producto(producto_id: int, session: Session = Depends(get_session)):
    producto = session.get(Producto, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

# Actualizar producto
@router.put("/{producto_id}", response_model=Producto)
def update_producto(producto_id: int, data: ProductoCreate, session: Session = Depends(get_session)):
    producto = session.get(Producto, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in data.model_dump().items():
        setattr(producto, key, value)
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto

# Eliminar producto
@router.delete("/{producto_id}", status_code=204)
def delete_producto(producto_id: int, session: Session = Depends(get_session)):
    producto = session.get(Producto, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    session.delete(producto)
    session.commit()    