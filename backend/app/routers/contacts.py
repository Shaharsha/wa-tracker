from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.services.urgency import get_unanswered_contacts, get_dismissed_contacts

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("/unanswered")
async def unanswered(include_dismissed: bool = False):
    contacts = await get_unanswered_contacts(include_dismissed=include_dismissed)
    return contacts


@router.get("/dismissed")
async def dismissed():
    contacts = await get_dismissed_contacts()
    return contacts


@router.get("/{jid}/messages")
async def messages(jid: str, limit: int = 50):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC LIMIT ?",
            (jid, limit),
        )
        rows = await cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No messages found")
        return [dict(row) for row in rows]
    finally:
        await db.close()
