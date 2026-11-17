from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0)
    date: str
    type: Literal["expense", "income", "investment"]
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

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str
    name: str


class UserResponse(UserBase):
    id: str

    model_config = ConfigDict(from_attributes=True)