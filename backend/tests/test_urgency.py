import time

import pytest

from app.database import init_db, get_db
from app.services.urgency import get_unanswered_contacts


async def _seed_data(db):
    now = int(time.time())

    # Contact who messaged us and we haven't replied
    await db.execute(
        "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
        ("111@c.us", "Alice", "111"),
    )
    await db.execute(
        "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
        ("msg1", "111@c.us", 0, "Hey are you there?", now - 3600, "chat"),
    )

    # Contact where we already replied (last message is from us)
    await db.execute(
        "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
        ("222@c.us", "Bob", "222"),
    )
    await db.execute(
        "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
        ("msg2", "222@c.us", 0, "Hello", now - 7200, "chat"),
    )
    await db.execute(
        "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
        ("msg3", "222@c.us", 1, "Hi Bob!", now - 3600, "chat"),
    )

    await db.commit()


@pytest.mark.asyncio
async def test_unanswered_returns_only_unreplied():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    jids = [c["jid"] for c in contacts]
    assert "111@c.us" in jids
    assert "222@c.us" not in jids


@pytest.mark.asyncio
async def test_unanswered_count():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    alice = next(c for c in contacts if c["jid"] == "111@c.us")
    assert alice["unanswered_count"] == 1
    assert alice["last_message_preview"] == "Hey are you there?"
