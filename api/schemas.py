from pydantic import BaseModel

class TransactionBase(BaseModel):
    description: str
    amount: float
    date: str
    type: str

class TransactionCreate(TransactionBase):
    pass

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