import pytest

from app.database import init_db, get_db


@pytest.mark.asyncio
async def test_init_db_creates_all_tables():
    await init_db()
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row["name"] for row in await cursor.fetchall()]
        assert "contacts" in tables
        assert "messages" in tables
        assert "sync_state" in tables


@pytest.mark.asyncio
async def test_init_db_creates_indexes():
    await init_db()
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
        )
        indexes = [row["name"] for row in await cursor.fetchall()]
        assert "idx_messages_chat_ts" in indexes
        assert "idx_messages_from_me" in indexes
        assert "idx_contacts_dismissed" in indexes


@pytest.mark.asyncio
async def test_init_db_creates_view():
    await init_db()
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='view'"
        )
        views = [row["name"] for row in await cursor.fetchall()]
        assert "v_last_messages" in views


@pytest.mark.asyncio
async def test_init_db_is_idempotent():
    await init_db()
    await init_db()
    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 0


@pytest.mark.asyncio
async def test_wal_mode_enabled():
    await init_db()
    async with get_db() as db:
        cursor = await db.execute("PRAGMA journal_mode")
        row = await cursor.fetchone()
        assert row[0] == "wal"


@pytest.mark.asyncio
async def test_upsert_contact():
    await init_db()
    async with get_db() as db:
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
        assert row["phone"] == "123"
        assert row["is_dismissed"] == 0


@pytest.mark.asyncio
async def test_upsert_contact_updates_name():
    await init_db()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
            ("123@c.us", "Old Name", "123"),
        )
        await db.execute(
            """INSERT INTO contacts (jid, name, phone)
               VALUES (?, ?, ?)
               ON CONFLICT(jid) DO UPDATE SET name = excluded.name""",
            ("123@c.us", "New Name", "123"),
        )
        await db.commit()
        cursor = await db.execute("SELECT name FROM contacts WHERE jid = '123@c.us'")
        row = await cursor.fetchone()
        assert row["name"] == "New Name"


@pytest.mark.asyncio
async def test_message_insert_or_ignore():
    await init_db()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
            ("123@c.us", "User", "123"),
        )
        await db.execute(
            "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
            ("msg1", "123@c.us", 0, "Hello", 1000, "chat"),
        )
        await db.execute(
            "INSERT OR IGNORE INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
            ("msg1", "123@c.us", 0, "Different body", 2000, "chat"),
        )
        await db.commit()
        cursor = await db.execute("SELECT body FROM messages WHERE id = 'msg1'")
        row = await cursor.fetchone()
        assert row["body"] == "Hello"
