import time

from fastapi import APIRouter

from app.database import get_db
from app.waha_client import waha_client

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats")
async def stats():
    async with get_db() as db:
        cursor = await db.execute("""
            SELECT COUNT(DISTINCT c.jid) as cnt
            FROM contacts c
            JOIN v_last_messages lm ON lm.chat_id = c.jid
            WHERE lm.from_me = 0 AND c.is_blocked = 0 AND (c.dismissed_until = 0 OR lm.timestamp > c.dismissed_until)
        """)
        row = await cursor.fetchone()
        total_unanswered = row["cnt"] if row else 0

        cursor = await db.execute("""
            SELECT MIN(lm.timestamp) as oldest_ts
            FROM contacts c
            JOIN v_last_messages lm ON lm.chat_id = c.jid
            WHERE lm.from_me = 0 AND c.is_blocked = 0 AND (c.dismissed_until = 0 OR lm.timestamp > c.dismissed_until)
        """)
        row = await cursor.fetchone()
        oldest_ts = row["oldest_ts"] if row and row["oldest_ts"] else None
        longest_waiting_hours = round((time.time() - oldest_ts) / 3600, 1) if oldest_ts else 0

        cursor = await db.execute("SELECT COUNT(*) as cnt FROM contacts")
        row = await cursor.fetchone()
        total_contacts_tracked = row["cnt"] if row else 0

        cursor = await db.execute(
            "SELECT value FROM sync_state WHERE key = 'last_sync_at'"
        )
        row = await cursor.fetchone()
        last_sync_at = row["value"] if row else None

    waha_status = await waha_client.get_session_status() or "UNKNOWN"

    return {
        "total_unanswered": total_unanswered,
        "longest_waiting_hours": longest_waiting_hours,
        "total_contacts_tracked": total_contacts_tracked,
        "last_sync_at": last_sync_at,
        "waha_status": waha_status,
    }


@router.get("/health")
async def health():
    return {"status": "ok"}
