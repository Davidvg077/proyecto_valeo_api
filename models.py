from typing import Optional
from sqlmodel import SQLModel, Field

class Producto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)
    precio: float
    stock: int

class Cliente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True)
    ciudad: str
    canal: str
