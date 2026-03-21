import pytest
from unittest.mock import AsyncMock, patch

from app.database import init_db, get_db
from app.services.sync_service import poll_and_update


def _mock_waha(status="WORKING", chats=None, messages=None):
    """Create mock patches for WAHA client."""
    mock = AsyncMock()
    mock.get_session_status.return_value = status
    mock.get_chats.return_value = chats or []
    mock.get_messages.return_value = messages or []
    return mock


@pytest.mark.asyncio
async def test_sync_skips_when_not_working():
    await init_db()
    with patch("app.services.sync_service.waha_client", _mock_waha(status="STOPPED")):
        await poll_and_update()

    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 0  # Nothing synced
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_sync_inserts_contacts_and_messages():
    await init_db()
    chats = [
        {"id": "111@c.us", "name": "Alice"},
        {"id": "222@c.us", "pushName": "Bob"},
        {"id": "group@g.us", "name": "Group Chat"},  # should be filtered
    ]
    messages = [
        {"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"},
        {"id": "msg2", "fromMe": True, "body": "Hi!", "timestamp": 1001, "type": "chat"},
    ]

    mock = _mock_waha(chats=chats, messages=messages)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    db = await get_db()
    try:
        # Should have 2 contacts (group filtered out)
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 2

        # Messages are INSERT OR IGNORE by id — same mock returns same ids
        # so only 2 unique messages inserted (not 4)
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        row = await cursor.fetchone()
        assert row["cnt"] == 2

        # Check contact names
        cursor = await db.execute("SELECT name FROM contacts WHERE jid = '111@c.us'")
        row = await cursor.fetchone()
        assert row["name"] == "Alice"

        cursor = await db.execute("SELECT name FROM contacts WHERE jid = '222@c.us'")
        row = await cursor.fetchone()
        assert row["name"] == "Bob"

        # Check sync state updated
        cursor = await db.execute("SELECT value FROM sync_state WHERE key = 'last_sync_at'")
        row = await cursor.fetchone()
        assert row is not None
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_sync_filters_group_and_newsletter_chats():
    await init_db()
    chats = [
        {"id": "111@c.us", "name": "Personal"},
        {"id": "group@g.us", "name": "Group"},
        {"id": "news@newsletter", "name": "Channel"},
        {"id": "status@broadcast", "name": "Status"},
    ]

    mock = _mock_waha(chats=chats)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 1  # Only personal chat
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_sync_skips_messages_without_id():
    await init_db()
    chats = [{"id": "111@c.us", "name": "Alice"}]
    messages = [
        {"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"},
        {"fromMe": False, "body": "No ID", "timestamp": 1001, "type": "chat"},  # no id
        {"id": None, "fromMe": False, "body": "Null ID", "timestamp": 1002, "type": "chat"},
    ]

    mock = _mock_waha(chats=chats, messages=messages)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        row = await cursor.fetchone()
        assert row["cnt"] == 1  # Only the one with valid id
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_sync_handles_message_fetch_failure():
    await init_db()
    chats = [
        {"id": "111@c.us", "name": "Alice"},
        {"id": "222@c.us", "name": "Bob"},
    ]

    mock = _mock_waha(chats=chats)
    # First chat succeeds, second fails
    mock.get_messages.side_effect = [
        [{"id": "msg1", "fromMe": False, "body": "Hi", "timestamp": 1000, "type": "chat"}],
        Exception("WAHA error"),
    ]

    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()  # Should not raise

    db = await get_db()
    try:
        # Both contacts should be inserted
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 2

        # Only first chat's messages
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        row = await cursor.fetchone()
        assert row["cnt"] == 1
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_sync_is_idempotent():
    await init_db()
    chats = [{"id": "111@c.us", "name": "Alice"}]
    messages = [
        {"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"},
    ]

    mock = _mock_waha(chats=chats, messages=messages)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()
        await poll_and_update()  # Run again

    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        row = await cursor.fetchone()
        assert row["cnt"] == 1  # No duplicates
    finally:
        await db.close()
