import aiosqlite
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import settings

_SCHEMA_STATEMENTS = [
    "PRAGMA journal_mode=WAL",
    """CREATE TABLE IF NOT EXISTS contacts (
        jid TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        profile_picture_url TEXT,
        first_seen_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        dismissed_until INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0
    )""",
    """CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        from_me INTEGER NOT NULL,
        body TEXT,
        timestamp INTEGER NOT NULL,
        message_type TEXT,
        FOREIGN KEY (chat_id) REFERENCES contacts(jid)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chat_id, timestamp DESC)",
    "CREATE INDEX IF NOT EXISTS idx_messages_from_me ON messages(chat_id, from_me, timestamp DESC)",
    "CREATE INDEX IF NOT EXISTS idx_contacts_blocked ON contacts(is_blocked)",
    """CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT
    )""",
    """CREATE VIEW IF NOT EXISTS v_last_messages AS
        SELECT m.* FROM messages m
        WHERE m.id = (
            SELECT id FROM messages
            WHERE chat_id = m.chat_id
            ORDER BY timestamp DESC LIMIT 1
        )""",
]

# Migration: add new columns if upgrading from old schema
_MIGRATIONS = [
    "ALTER TABLE contacts ADD COLUMN dismissed_until INTEGER DEFAULT 0",
    "ALTER TABLE contacts ADD COLUMN is_blocked INTEGER DEFAULT 0",
    "CREATE INDEX IF NOT EXISTS idx_contacts_blocked ON contacts(is_blocked)",
]


@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(settings.database_path, timeout=30)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    async with get_db() as db:
        for statement in _SCHEMA_STATEMENTS:
            await db.execute(statement)
        # Run migrations (ignore errors for columns that already exist)
        for migration in _MIGRATIONS:
            try:
                await db.execute(migration)
            except Exception:
                pass
        await db.commit()
