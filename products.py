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

