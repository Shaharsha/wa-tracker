import pytest

from app.database import init_db, get_db


@pytest.mark.asyncio
async def test_init_db_creates_tables():
    await init_db()
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row["name"] for row in await cursor.fetchall()]
        assert "contacts" in tables
        assert "messages" in tables
        assert "sync_state" in tables
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_upsert_contact():
    await init_db()
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO contacts (jid, name, phone)
               VALUES (?, ?, ?)
               ON CONFLICT(jid) DO UPDATE SET name = excluded.name""",
            ("123@c.us", "Test User", "123"),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM contacts WHERE jid = '123@c.us'")
        row = await cursor.fetchone()
        assert row is not None
        assert row["name"] == "Test User"
    finally:
        await db.close()
