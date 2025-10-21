from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import Cliente
from schemas import ClienteCreate, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["clientes"])

# Crear cliente
@router.post("/", response_model=Cliente, status_code=201)
def create_cliente(data: ClienteCreate, session: Session = Depends(get_session)):
    cli = Cliente(**data.model_dump())
    session.add(cli)
    session.commit()
    session.refresh(cli)
    return cli

# Listar clientes
@router.get("/", response_model=list[Cliente])
def list_clientes(session: Session = Depends(get_session)):
    return session.exec(select(Cliente)).all()

# Obtener cliente por ID
@router.get("/{cliente_id}", response_model=Cliente)
def get_cliente(cliente_id: int, session: Session = Depends(get_session)):
    cli = session.get(Cliente, cliente_id)
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cli

# Actualizar cliente
@router.put("/{cliente_id}", response_model=Cliente)
def update_cliente(cliente_id: int, data: ClienteUpdate, session: Session = Depends(get_session)):
    cli = session.get(Cliente, cliente_id)
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(cli, key, value)
    session.add(cli)
    session.commit()
    session.refresh(cli)
    return cli  

