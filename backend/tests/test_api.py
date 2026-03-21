import asyncio

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

with patch("app.poller.start_scheduler"), patch("app.poller.stop_scheduler"):
    from main import app

from app.database import init_db, get_db


@pytest.fixture
def client():
    return TestClient(app)


def _auth(token="test-token"):
    return {"Authorization": f"Bearer {token}"}


def _run(coro):
    asyncio.get_event_loop().run_until_complete(coro)


async def _seed_contact(jid="999@c.us", name="Test"):
    await init_db()
    async with get_db() as db:
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", (jid, name, jid.split("@")[0]))
        await db.commit()


# --- Health ---

def test_health_no_auth_required(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# --- Auth ---

def test_api_requires_auth(client):
    resp = client.get("/api/contacts/unanswered")
    assert resp.status_code == 401


def test_api_wrong_token_rejected(client):
    resp = client.get("/api/contacts/unanswered", headers=_auth("wrong"))
    assert resp.status_code == 401


def test_api_correct_token_accepted(client):
    _run(init_db())
    resp = client.get("/api/contacts/unanswered", headers=_auth())
    assert resp.status_code == 200


def test_auth_trailing_slash_still_enforced(client):
    resp = client.get("/api/contacts/unanswered/")
    assert resp.status_code in (401, 307)


# --- Login ---

def test_login_correct_credentials(client):
    resp = client.post("/api/login", json={"username": "admin", "password": "test-password"})
    assert resp.status_code == 200
    assert resp.json()["token"] == "test-token"


def test_login_wrong_password(client):
    resp = client.post("/api/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_login_wrong_username(client):
    resp = client.post("/api/login", json={"username": "hacker", "password": "test-password"})
    assert resp.status_code == 401


def test_login_empty_body(client):
    resp = client.post("/api/login", json={})
    assert resp.status_code == 422


def test_login_no_auth_required(client):
    resp = client.post("/api/login", json={"username": "wrong", "password": "wrong"})
    assert resp.status_code == 401


# --- Contacts ---

def test_unanswered_empty(client):
    _run(init_db())
    resp = client.get("/api/contacts/unanswered", headers=_auth())
    assert resp.status_code == 200
    assert resp.json() == []


def test_dismissed_empty(client):
    _run(init_db())
    resp = client.get("/api/contacts/dismissed", headers=_auth())
    assert resp.status_code == 200
    assert resp.json() == []


def test_messages_not_found(client):
    _run(init_db())
    resp = client.get("/api/contacts/nonexistent@c.us/messages", headers=_auth())
    assert resp.status_code == 404


# --- Dismiss / Undismiss ---

def test_dismiss_contact(client):
    _run(_seed_contact())
    resp = client.post("/api/contacts/999@c.us/dismiss", headers=_auth())
    assert resp.status_code == 200
    assert resp.json()["status"] == "dismissed"


def test_undismiss_contact(client):
    _run(_seed_contact())
    client.post("/api/contacts/999@c.us/dismiss", headers=_auth())
    resp = client.post("/api/contacts/999@c.us/undismiss", headers=_auth())
    assert resp.status_code == 200
    assert resp.json()["status"] == "undismissed"


def test_dismiss_nonexistent_contact(client):
    _run(init_db())
    resp = client.post("/api/contacts/ghost@c.us/dismiss", headers=_auth())
    assert resp.status_code == 404


def test_undismiss_nonexistent_contact(client):
    _run(init_db())
    resp = client.post("/api/contacts/ghost@c.us/undismiss", headers=_auth())
    assert resp.status_code == 404


# --- Messages ---

def test_get_messages(client):
    async def _seed():
        await init_db()
        async with get_db() as db:
            await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("555@c.us", "Charlie", "555"))
            await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)", ("m1", "555@c.us", 0, "Hey", 1000, "chat"))
            await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)", ("m2", "555@c.us", 1, "Hi!", 1001, "chat"))
            await db.commit()
    _run(_seed())

    resp = client.get("/api/contacts/555@c.us/messages", headers=_auth())
    assert resp.status_code == 200
    msgs = resp.json()
    assert len(msgs) == 2
    assert msgs[0]["from_me"] is False
    assert msgs[1]["from_me"] is True


def test_get_messages_respects_limit(client):
    async def _seed():
        await init_db()
        async with get_db() as db:
            await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("555@c.us", "Charlie", "555"))
            for i in range(10):
                await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)", (f"m{i}", "555@c.us", 0, f"msg {i}", 1000 + i, "chat"))
            await db.commit()
    _run(_seed())

    resp = client.get("/api/contacts/555@c.us/messages?limit=3", headers=_auth())
    assert resp.status_code == 200
    assert len(resp.json()) == 3


# --- Stats ---

def test_stats_empty(client):
    _run(init_db())
    resp = client.get("/api/stats", headers=_auth())
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_unanswered"] == 0
    assert data["longest_waiting_hours"] == 0
    assert data["total_contacts_tracked"] == 0
    assert data["last_sync_at"] is None


# --- SPA fallback ---

def test_spa_fallback_returns_404_without_static(client):
    resp = client.get("/some-page")
    assert resp.status_code == 404


def test_api_prefix_returns_404(client):
    resp = client.get("/api/nonexistent", headers=_auth())
    assert resp.status_code == 404
