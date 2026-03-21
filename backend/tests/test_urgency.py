import time

import pytest

from app.database import init_db, get_db
from app.services.urgency import get_unanswered_contacts, get_dismissed_contacts


async def _seed_data(db):
    now = int(time.time())

    # Alice: messaged us 1h ago, we haven't replied
    await db.execute(
        "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
        ("111@c.us", "Alice", "111"),
    )
    await db.execute(
        "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
        ("msg1", "111@c.us", 0, "Hey are you there?", now - 3600, "chat"),
    )

    # Bob: messaged us, but we replied — should NOT be unanswered
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

    # Charlie: messaged us 2h ago, dismissed
    await db.execute(
        "INSERT INTO contacts (jid, name, phone, is_dismissed) VALUES (?, ?, ?, ?)",
        ("333@c.us", "Charlie", "333", 1),
    )
    await db.execute(
        "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
        ("msg4", "333@c.us", 0, "Yo", now - 7200, "chat"),
    )

    # Diana: sent multiple messages, we haven't replied
    await db.execute(
        "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
        ("444@c.us", "Diana", "444"),
    )
    for i in range(3):
        await db.execute(
            "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
            (f"msg5_{i}", "444@c.us", 0, f"Message {i}", now - 1800 + i * 60, "chat"),
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
    assert "111@c.us" in jids  # unanswered
    assert "444@c.us" in jids  # unanswered
    assert "222@c.us" not in jids  # we replied
    assert "333@c.us" not in jids  # dismissed


@pytest.mark.asyncio
async def test_unanswered_excludes_dismissed():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts(include_dismissed=False)
    jids = [c["jid"] for c in contacts]
    assert "333@c.us" not in jids


@pytest.mark.asyncio
async def test_unanswered_includes_dismissed_when_requested():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts(include_dismissed=True)
    jids = [c["jid"] for c in contacts]
    assert "333@c.us" in jids


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

    diana = next(c for c in contacts if c["jid"] == "444@c.us")
    assert diana["unanswered_count"] == 3


@pytest.mark.asyncio
async def test_unanswered_sorted_longest_first():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    # Alice waited 1h, Diana waited ~30m → Alice should be first
    assert contacts[0]["jid"] == "111@c.us"


@pytest.mark.asyncio
async def test_unanswered_waiting_seconds():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    alice = next(c for c in contacts if c["jid"] == "111@c.us")
    assert alice["waiting_seconds"] > 3500  # ~1h


@pytest.mark.asyncio
async def test_dismissed_contacts():
    await init_db()
    db = await get_db()
    try:
        await _seed_data(db)
    finally:
        await db.close()

    contacts = await get_dismissed_contacts()
    jids = [c["jid"] for c in contacts]
    assert "333@c.us" in jids
    assert "111@c.us" not in jids


@pytest.mark.asyncio
async def test_no_messages_means_not_unanswered():
    await init_db()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
            ("empty@c.us", "Empty", "000"),
        )
        await db.commit()
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    jids = [c["jid"] for c in contacts]
    assert "empty@c.us" not in jids


@pytest.mark.asyncio
async def test_only_our_messages_means_not_unanswered():
    await init_db()
    db = await get_db()
    try:
        now = int(time.time())
        await db.execute(
            "INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)",
            ("we_only@c.us", "WeOnly", "000"),
        )
        await db.execute(
            "INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
            ("wm1", "we_only@c.us", 1, "Hey!", now - 100, "chat"),
        )
        await db.commit()
    finally:
        await db.close()

    contacts = await get_unanswered_contacts()
    jids = [c["jid"] for c in contacts]
    assert "we_only@c.us" not in jids
