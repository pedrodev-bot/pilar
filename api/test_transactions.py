from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app, get_current_user
import models

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
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


def test_upsert_creates_and_updates_transaction():
    """Ensure PUT creates a new transaction and updates it idempotently for the owner."""
    user = create_mock_user("user-crud-1", "crud@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user

    create_res = client.put(
        "/transactions/tx-crud-1",
        json={
            "description": "Groceries",
            "amount": 120.50,
            "date": "2026-11-20T10:00:00Z",
            "type": "expense",
            "category": "Food",
        },
    )
    assert create_res.status_code == 200
    assert create_res.json()["amount"] == 120.50

    update_res = client.put(
        "/transactions/tx-crud-1",
        json={
            "description": "Groceries Updated",
            "amount": 145.00,
            "date": "2026-11-20T10:00:00Z",
            "type": "expense",
            "category": "Food",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["description"] == "Groceries Updated"
    assert update_res.json()["amount"] == 145.00

    list_res = client.get("/transactions")
    assert len(list_res.json()) == 1


def test_delete_own_transaction():
    """Ensure owner can delete an existing transaction and receives 204."""
    user = create_mock_user("user-del-1", "del@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user

    client.put(
        "/transactions/tx-del-1",
        json={
            "description": "Subscription",
            "amount": 29.90,
            "date": "2026-11-20T10:00:00Z",
            "type": "expense",
        },
    )

    del_res = client.delete("/transactions/tx-del-1")
    assert del_res.status_code == 204
    assert client.get("/transactions").json() == []


@pytest.mark.parametrize(
    "invalid_payload",
    [
        {"description": "", "amount": 50.0, "date": "2026-11-20", "type": "expense"},
        {"description": "Zero amount", "amount": 0, "date": "2026-11-20", "type": "expense"},
        {"description": "Negative amount", "amount": -15.0, "date": "2026-11-20", "type": "income"},
        {"description": "Invalid type", "amount": 50.0, "date": "2026-11-20", "type": "transfer"},
    ],
)
def test_rejects_boundary_invalid_inputs(invalid_payload):
    """Ensure Pydantic rejects empty descriptions, non-positive amounts, and unsupported types."""
    user = create_mock_user("user-val-1", "val@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user

    res = client.put("/transactions/tx-invalid", json=invalid_payload)
    assert res.status_code == 422


def test_delete_user_account_cascades_transactions():
    """Ensure DELETE /users/me removes the user and all associated transactions."""
    user = create_mock_user("user-cascade-1", "cascade@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user

    client.put(
        "/transactions/tx-cascade-1",
        json={
            "description": "Salary",
            "amount": 3000.0,
            "date": "2026-11-20T10:00:00Z",
            "type": "income",
        },
    )

    with patch("main.supabase_client.auth.admin.delete_user") as mock_sb_delete:
        res = client.delete("/users/me")
        assert res.status_code == 200
        mock_sb_delete.assert_called_once_with("user-cascade-1")

    db = TestingSessionLocal()
    assert db.query(models.User).filter(models.User.id == "user-cascade-1").first() is None
    assert db.query(models.Transaction).filter(models.Transaction.user_id == "user-cascade-1").count() == 0
    db.close()


def test_delete_user_account_handles_supabase_failure():
    """Ensure Supabase Auth deletion failure returns 500 without deleting local records."""
    user = create_mock_user("user-fail-1", "fail@pilar.app")
    app.dependency_overrides[get_current_user] = lambda: user

    with patch("main.supabase_client.auth.admin.delete_user", side_effect=RuntimeError("Supabase timeout")):
        res = client.delete("/users/me")
        assert res.status_code == 500

    db = TestingSessionLocal()
    assert db.query(models.User).filter(models.User.id == "user-fail-1").first() is not None
    db.close()