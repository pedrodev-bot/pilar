from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False, default="oauth_managed")

    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False)
    type = Column(String, nullable=False)
    synced = Column(Boolean, default=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    payment_method = Column(String, nullable=True)
    installments = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    mood = Column(String, nullable=True)
    vault_id = Column(String, nullable=True)
    shared_with = Column(JSON, nullable=True)
    is_recurring = Column(Boolean, default=False)
    warranty_end = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="transactions")