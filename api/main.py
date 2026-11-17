import logging
import os
from typing import List

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from supabase import Client, create_client

import models
import schemas
from database import Base, engine, get_db

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pilar")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no api/.env.")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pilar API")

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        user_response = supabase_client.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

        sb_user = user_response.user
        email = sb_user.email or "email_desconhecido"
        name = sb_user.user_metadata.get("full_name", email) if sb_user.user_metadata else email

        user = db.query(models.User).filter(models.User.id == sb_user.id).first()
        if not user:
            user = models.User(id=sb_user.id, username=email, name=name, hashed_password="oauth_managed")
            db.add(user)
            db.commit()
            db.refresh(user)

        return user

    except HTTPException:
        raise
    except Exception as error:
        logger.warning("Falha na validação do token: %s", error)
        raise HTTPException(status_code=401, detail="Acesso não autorizado.")


@app.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_user_transactions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()


@app.put("/transactions/{tx_id}", response_model=schemas.TransactionResponse)
def upsert_transaction(
    tx_id: str,
    tx: schemas.TransactionBase,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.get(models.Transaction, tx_id)

    if record is not None:
        if str(record.user_id) != str(current_user.id):
            raise HTTPException(status_code=404, detail="Transação não encontrada.")
        for field, value in tx.model_dump().items():
            setattr(record, field, value)
    else:
        record = models.Transaction(id=tx_id, **tx.model_dump(), user_id=current_user.id)
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


@app.delete("/transactions/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    db.delete(record)
    db.commit()
    return Response(status_code=204)


@app.delete("/users/me")
def delete_user_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Excluindo a conta do usuário %s", current_user.id)

    try:
        supabase_client.auth.admin.delete_user(str(current_user.id))
        db.delete(current_user)
        db.commit()
    except Exception:
        logger.exception("Falha ao excluir a conta %s", current_user.id)
        raise HTTPException(status_code=500, detail="Falha ao excluir a conta.")

    logger.info("Conta %s excluída", current_user.id)
    return {"message": "Conta excluída com sucesso."}
