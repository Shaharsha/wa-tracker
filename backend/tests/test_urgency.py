import time

import pytest

from app.database import init_db, get_db
from app.services.urgency import get_unanswered_contacts, get_dismissed_contacts, get_blocked_contacts


async def _seed_data():
    now = int(time.time())
    async with get_db() as db:
        # Alice: messaged us 1h ago, we haven't replied
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("111@c.us", "Alice", "111"))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("msg1", "111@c.us", 0, "Hey are you there?", now - 3600, "chat"))

        # Bob: we already replied
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("222@c.us", "Bob", "222"))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("msg2", "222@c.us", 0, "Hello", now - 7200, "chat"))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("msg3", "222@c.us", 1, "Hi Bob!", now - 3600, "chat"))

        # Charlie: dismissed (skipped), message was before dismiss time
        await db.execute("INSERT INTO contacts (jid, name, phone, dismissed_until) VALUES (?, ?, ?, ?)",
                         ("333@c.us", "Charlie", "333", now))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("msg4", "333@c.us", 0, "Yo", now - 7200, "chat"))

        # Diana: multiple unanswered messages
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("444@c.us", "Diana", "444"))
        for i in range(3):
            await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                             (f"msg5_{i}", "444@c.us", 0, f"Message {i}", now - 1800 + i * 60, "chat"))

        # Eve: blocked forever
        await db.execute("INSERT INTO contacts (jid, name, phone, is_blocked) VALUES (?, ?, ?, ?)",
                         ("555@c.us", "Eve", "555", 1))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("msg6", "555@c.us", 0, "Hi!", now - 100, "chat"))

        await db.commit()


@pytest.mark.asyncio
async def test_unanswered_returns_only_unreplied():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts()
    jids = [c["jid"] for c in contacts]
    assert "111@c.us" in jids
    assert "444@c.us" in jids
    assert "222@c.us" not in jids  # replied
    assert "333@c.us" not in jids  # dismissed
    assert "555@c.us" not in jids  # blocked


@pytest.mark.asyncio
async def test_dismissed_contact_reappears_on_new_message():
    await init_db()
    now = int(time.time())
    async with get_db() as db:
        # Dismissed 1 hour ago
        await db.execute("INSERT INTO contacts (jid, name, phone, dismissed_until) VALUES (?, ?, ?, ?)",
                         ("reappear@c.us", "Frank", "666", now - 3600))
        # But sent a new message 30 min ago (after dismiss)
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("new_msg", "reappear@c.us", 0, "Hello again", now - 1800, "chat"))
        await db.commit()

    contacts = await get_unanswered_contacts()
    jids = [c["jid"] for c in contacts]
    assert "reappear@c.us" in jids  # Should reappear!


@pytest.mark.asyncio
async def test_unanswered_includes_dismissed_when_requested():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts(include_dismissed=True)
    jids = [c["jid"] for c in contacts]
    assert "333@c.us" in jids
    assert "555@c.us" not in jids  # blocked still excluded


@pytest.mark.asyncio
async def test_unanswered_count():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts()
    alice = next(c for c in contacts if c["jid"] == "111@c.us")
    assert alice["unanswered_count"] == 1
    assert alice["last_message_preview"] == "Hey are you there?"
    diana = next(c for c in contacts if c["jid"] == "444@c.us")
    assert diana["unanswered_count"] == 3


@pytest.mark.asyncio
async def test_unanswered_sorted_longest_first():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts()
    assert contacts[0]["jid"] == "111@c.us"


@pytest.mark.asyncio
async def test_unanswered_waiting_seconds():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts()
    alice = next(c for c in contacts if c["jid"] == "111@c.us")
    assert alice["waiting_seconds"] > 3500


@pytest.mark.asyncio
async def test_boolean_types():
    await init_db()
    await _seed_data()
    contacts = await get_unanswered_contacts()
    alice = next(c for c in contacts if c["jid"] == "111@c.us")
    assert alice["is_blocked"] is False
    assert alice["last_message_from_me"] is False


@pytest.mark.asyncio
async def test_dismissed_contacts():
    await init_db()
    await _seed_data()
    contacts = await get_dismissed_contacts()
    jids = [c["jid"] for c in contacts]
    assert "333@c.us" in jids
    assert "111@c.us" not in jids


@pytest.mark.asyncio
async def test_blocked_contacts():
    await init_db()
    await _seed_data()
    contacts = await get_blocked_contacts()
    jids = [c["jid"] for c in contacts]
    assert "555@c.us" in jids
    assert "111@c.us" not in jids


@pytest.mark.asyncio
async def test_no_messages_means_not_unanswered():
    await init_db()
    async with get_db() as db:
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("empty@c.us", "Empty", "000"))
        await db.commit()
    contacts = await get_unanswered_contacts()
    assert "empty@c.us" not in [c["jid"] for c in contacts]


@pytest.mark.asyncio
async def test_only_our_messages_means_not_unanswered():
    await init_db()
    async with get_db() as db:
        now = int(time.time())
        await db.execute("INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)", ("we@c.us", "We", "000"))
        await db.execute("INSERT INTO messages (id, chat_id, from_me, body, timestamp, message_type) VALUES (?, ?, ?, ?, ?, ?)",
                         ("wm1", "we@c.us", 1, "Hey!", now - 100, "chat"))
        await db.commit()
    contacts = await get_unanswered_contacts()
    assert "we@c.us" not in [c["jid"] for c in contacts]
