import os
import jwt
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from supabase import create_client, Client

import models
import schemas
from database import engine, Base, get_db

load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Faltam chaves do Supabase no .env do backend!")
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Core Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        user_response = supabase_client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
            
        sb_user = user_response.user
        user_id = sb_user.id
        email = sb_user.email or "email_desconhecido"
        name = sb_user.user_metadata.get("full_name", email) if sb_user.user_metadata else email
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            user = models.User(
                id=user_id,
                username=email,
                name=name,
                hashed_password="oauth_managed"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        return user
        
    except Exception as e:
        print(f"❌ Erro na validação do token: {e}")
        raise HTTPException(status_code=401, detail="Acesso não autorizado.")

@app.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_user_transactions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()

@app.post("/transactions", response_model=schemas.TransactionResponse)
def create_transaction(tx: schemas.TransactionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_tx = models.Transaction(**tx.model_dump(), user_id=current_user.id)
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx

@app.delete("/users/me")
def delete_user_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"\n--- INICIANDO EXCLUSÃO: Utilizador {current_user.id} ---")
    
    try:
        print("⏳ A apagar do Supabase Auth...")
        response = supabase_client.auth.admin.delete_user(current_user.id)
        print(f"✅ Supabase Auth: Utilizador apagado (Resposta: {response})")
        
        print("⏳ A apagar da base de dados PostgreSQL local...")
        db.delete(current_user)
        db.commit()
        print("✅ PostgreSQL: Utilizador e transações removidas em cascata.")
        
        print("--- EXCLUSÃO CONCLUÍDA COM SUCESSO ---")
        return {"message": "Conta excluída com sucesso."}
        
    except Exception as e:
        print(f"❌ ERRO CRÍTICO NA EXCLUSÃO: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Falha na exclusão: {str(e)}")