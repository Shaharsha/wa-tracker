import aiosqlite
from pathlib import Path

from app.config import settings

_SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS contacts (
    jid TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    profile_picture_url TEXT,
    first_seen_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_dismissed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    from_me INTEGER NOT NULL,
    body TEXT,
    timestamp INTEGER NOT NULL,
    message_type TEXT,
    FOREIGN KEY (chat_id) REFERENCES contacts(jid)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_me ON messages(chat_id, from_me, timestamp DESC);

CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(settings.database_path)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db():
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(settings.database_path)
    try:
        for statement in _SCHEMA.strip().split(";"):
            statement = statement.strip()
            if statement:
                await db.execute(statement)
        await db.commit()
    finally:
        await db.close()
