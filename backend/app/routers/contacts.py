from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.services.urgency import get_unanswered_contacts, get_dismissed_contacts, get_blocked_contacts

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("/unanswered")
async def unanswered(include_dismissed: bool = False):
    return await get_unanswered_contacts(include_dismissed=include_dismissed)


@router.get("/dismissed")
async def dismissed():
    return await get_dismissed_contacts()


@router.get("/blocked")
async def blocked():
    return await get_blocked_contacts()


@router.get("/{jid}/messages")
async def messages(jid: str, limit: int = 50):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC LIMIT ?",
            (jid, limit),
        )
        rows = await cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No messages found")
        return [{**dict(row), "from_me": bool(row["from_me"])} for row in rows]
