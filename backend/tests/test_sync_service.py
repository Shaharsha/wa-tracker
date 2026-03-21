import pytest
from unittest.mock import AsyncMock, patch

from app.database import init_db, get_db
from app.services.sync_service import poll_and_update


def _mock_waha(status="WORKING", chats=None, messages=None, contacts=None):
    mock = AsyncMock()
    mock.get_session_status.return_value = status
    mock.get_chats.return_value = chats or []
    mock.get_messages.return_value = messages or []
    mock.get_all_contacts.return_value = contacts or {}
    mock.get_profile_picture.return_value = None
    return mock


@pytest.mark.asyncio
async def test_sync_skips_when_not_working():
    await init_db()
    with patch("app.services.sync_service.waha_client", _mock_waha(status="STOPPED")):
        await poll_and_update()
    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        assert row["cnt"] == 0


@pytest.mark.asyncio
async def test_sync_inserts_contacts_and_messages():
    await init_db()
    chats = [
        {"id": "111@s.whatsapp.net", "name": "Alice"},
        {"id": "222@s.whatsapp.net", "pushName": "Bob"},
        {"id": "group@g.us", "name": "Group Chat"},
    ]
    messages = [
        {"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"},
    ]
    contact_names = {"111@s.whatsapp.net": "Alice Saved", "111@c.us": "Alice Saved"}

    mock = _mock_waha(chats=chats, messages=messages, contacts=contact_names)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        assert (await cursor.fetchone())["cnt"] == 2

        cursor = await db.execute("SELECT name FROM contacts WHERE jid = '111@s.whatsapp.net'")
        assert (await cursor.fetchone())["name"] == "Alice Saved"

        cursor = await db.execute("SELECT value FROM sync_state WHERE key = 'last_sync_at'")
        assert (await cursor.fetchone()) is not None


@pytest.mark.asyncio
async def test_sync_filters_group_and_newsletter_chats():
    await init_db()
    chats = [
        {"id": "111@s.whatsapp.net", "name": "Personal"},
        {"id": "group@g.us", "name": "Group"},
        {"id": "news@newsletter", "name": "Channel"},
        {"id": "status@broadcast", "name": "Status"},
    ]
    mock = _mock_waha(chats=chats)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        assert (await cursor.fetchone())["cnt"] == 1


@pytest.mark.asyncio
async def test_sync_skips_messages_without_id():
    await init_db()
    chats = [{"id": "111@s.whatsapp.net", "name": "Alice"}]
    messages = [
        {"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"},
        {"fromMe": False, "body": "No ID", "timestamp": 1001, "type": "chat"},
        {"id": None, "fromMe": False, "body": "Null ID", "timestamp": 1002, "type": "chat"},
    ]
    mock = _mock_waha(chats=chats, messages=messages)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        assert (await cursor.fetchone())["cnt"] == 1


@pytest.mark.asyncio
async def test_sync_handles_message_fetch_failure():
    await init_db()
    chats = [
        {"id": "111@s.whatsapp.net", "name": "Alice"},
        {"id": "222@s.whatsapp.net", "name": "Bob"},
    ]
    mock = _mock_waha(chats=chats)
    mock.get_messages.side_effect = [
        [{"id": "msg1", "fromMe": False, "body": "Hi", "timestamp": 1000, "type": "chat"}],
        Exception("WAHA error"),
    ]
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        assert (await cursor.fetchone())["cnt"] == 2
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        assert (await cursor.fetchone())["cnt"] == 1


@pytest.mark.asyncio
async def test_sync_is_idempotent():
    await init_db()
    chats = [{"id": "111@s.whatsapp.net", "name": "Alice"}]
    messages = [{"id": "msg1", "fromMe": False, "body": "Hello", "timestamp": 1000, "type": "chat"}]
    mock = _mock_waha(chats=chats, messages=messages)
    with patch("app.services.sync_service.waha_client", mock):
        await poll_and_update()
        await poll_and_update()

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM messages")
        assert (await cursor.fetchone())["cnt"] == 1
