from typing import List, Optional
from pydantic import BaseModel


class TransactionBase(BaseModel):
    description: str
    amount: float
    date: str
    type: str
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    payment_method: Optional[str] = None
    installments: Optional[int] = None
    notes: Optional[str] = None
    mood: Optional[str] = None
    vault_id: Optional[str] = None
    shared_with: Optional[List[str]] = []
    is_recurring: Optional[bool] = False
    warranty_end: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    synced: bool

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str
    name: str


class UserResponse(UserBase):
    id: str

    class Config:
        from_attributes = True
