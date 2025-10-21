from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Cliente
from schemas import ClienteCreate

router = APIRouter(prefix="/clientes", tags=["clientes"])

@router.post("/", response_model=Cliente, status_code=201)
def create_cliente(data: ClienteCreate, session: Session = Depends(get_session)):
    cli = Cliente(**data.model_dump())
    session.add(cli)
    session.commit()
    session.refresh(cli)
    return cli

@router.get("/", response_model=list[Cliente])
def list_clientes(session: Session = Depends(get_session)):
    return session.exec(select(Cliente)).all()
