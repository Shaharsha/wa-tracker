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


def _auth_headers():
    return {"Authorization": "Bearer test-token"}


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_unanswered_requires_auth(client):
    resp = client.get("/api/contacts/unanswered")
    assert resp.status_code == 401


def test_unanswered_with_auth(client):
    asyncio.get_event_loop().run_until_complete(init_db())
    resp = client.get("/api/contacts/unanswered", headers=_auth_headers())
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_dismiss_and_undismiss(client):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(init_db())

    async def seed():
        db = await get_db()
        try:
            await db.execute(
                "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
                ("999@c.us", "Test", "999"),
            )
            await db.commit()
        finally:
            await db.close()

    loop.run_until_complete(seed())

    resp = client.post("/api/contacts/999@c.us/dismiss", headers=_auth_headers())
    assert resp.status_code == 200
    assert resp.json()["status"] == "dismissed"

    resp = client.post("/api/contacts/999@c.us/undismiss", headers=_auth_headers())
    assert resp.status_code == 200
    assert resp.json()["status"] == "undismissed"
