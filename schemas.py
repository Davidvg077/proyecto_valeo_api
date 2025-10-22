from typing import Optional
from sqlmodel import SQLModel, Field

# --- Productos ---
class ProductoCreate(SQLModel):
    nombre: str = Field(min_length=2)
    precio: float = Field(gt=0)
    stock: int = Field(ge=0)

class ProductoUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2)
    precio: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)

# --- Clientes ---
class ClienteCreate(SQLModel):
    nombre: str = Field(min_length=2)
    ciudad: str
    canal: str

class ClienteUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2)
    ciudad: Optional[str] = None
    canal: Optional[str] = None
