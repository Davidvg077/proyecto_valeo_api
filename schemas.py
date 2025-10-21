from typing import Optional
from sqlmodel import SQLModel, Field

class ProductoCreate(SQLModel):
    nombre: str = Field(min_length=2)
    precio: float = Field(gt=0)
    stock: int = Field(ge=0)

