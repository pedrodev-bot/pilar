import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app, get_current_user
import models

# Banco SQLite em memória isolado para testes
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def create_mock_user(user_id: str, email: str) -> models.User:
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        user = models.User(id=user_id, username=email, name=email, hashed_password="oauth_managed")
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user


# --- 1. TESTES DE AUTENTICAÇÃO ---

def test_unauthenticated_access_blocked():
    """Garante que endpoints protegidos rejeitam requisições sem Bearer token."""
    app.dependency_overrides.pop(get_current_user, None)
    
    res_get = client.get("/transactions")
    res_put = client.put("/transactions/tx-1", json={"description": "Teste", "amount": 10.0, "date": "2026-11-17", "type": "expense"})
    res_del = client.delete("/transactions/tx-1")
    
    # HTTPBearer do FastAPI retorna 403 quando falta o header Authorization (ou 401 se inválido)
    assert res_get.status_code in (401, 403)
    assert res_put.status_code in (401, 403)
    assert res_del.status_code in (401, 403)


def test_invalid_token_rejected():
    """Garante que um token forjado falha na validação com o Supabase e retorna 401."""
    app.dependency_overrides.pop(get_current_user, None)
    
    res = client.get("/transactions", headers={"Authorization": "Bearer token-falso-123"})
    assert res.status_code == 401


# --- 2. TESTES DE ISOLAMENTO ENTRE USUÁRIOS (IDOR / BOLA) ---

def test_user_cannot_read_other_user_transactions():
    """Usuário B não deve enxergar transações criadas pelo Usuário A."""
    user_a = create_mock_user("user-a-uuid", "a@pilar.app")
    user_b = create_mock_user("user-b-uuid", "b@pilar.app")

    # Usuário A cria transação
    app.dependency_overrides[get_current_user] = lambda: user_a
    res_create = client.put("/transactions/tx-secret-a", json={
        "description": "Salário A",
        "amount": 5000.0,
        "date": "2026-11-17T10:00:00Z",
        "type": "income"
    })
    assert res_create.status_code == 200

    # Usuário B lista transações
    app.dependency_overrides[get_current_user] = lambda: user_b
    res_list = client.get("/transactions")
    assert res_list.status_code == 200
    assert res_list.json() == []


def test_user_cannot_overwrite_or_delete_other_user_transaction():
    """Usuário B não pode alterar (PUT) nem apagar (DELETE) uma transação do Usuário A pelo ID."""
    user_a = create_mock_user("user-a-uuid", "a@pilar.app")
    user_b = create_mock_user("user-b-uuid", "b@pilar.app")

    # Usuário A cria transação
    app.dependency_overrides[get_current_user] = lambda: user_a
    client.put("/transactions/tx-shared-id", json={
        "description": "Aluguel A",
        "amount": 1500.0,
        "date": "2026-11-17T10:00:00Z",
        "type": "expense"
    })

    # Usuário B tenta sobrescrever o mesmo ID
    app.dependency_overrides[get_current_user] = lambda: user_b
    res_put = client.put("/transactions/tx-shared-id", json={
        "description": "Hackeado por B",
        "amount": 1.0,
        "date": "2026-11-17T10:00:00Z",
        "type": "expense"
    })
    assert res_put.status_code == 404

    # Usuário B tenta deletar o mesmo ID
    res_del = client.delete("/transactions/tx-shared-id")
    assert res_del.status_code == 404

    # Confirma que os dados do Usuário A permanecem intactos
    app.dependency_overrides[get_current_user] = lambda: user_a
    res_check = client.get("/transactions")
    data = res_check.json()
    assert len(data) == 1
    assert data[0]["description"] == "Aluguel A"
    assert data[0]["amount"] == 1500.0


# --- 3. TESTES DE VALIDAÇÃO DE ENTRADA (SCHEMA) ---

def test_rejects_malformed_payload():
    """Garante que tipos inválidos ou campos obrigatórios ausentes retornam 422."""
    user_a = create_mock_user("user-a-uuid", "a@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user_a

    res = client.put("/transactions/tx-bad", json={
        "description": "Sem valor numérico",
        "amount": "nao-e-numero",
        "date": "2026-11-17",
        "type": "expense"
    })
    assert res.status_code == 422