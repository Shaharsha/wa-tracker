import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.services.urgency import get_unanswered_contacts, get_dismissed_contacts, get_blocked_contacts
from app.waha_client import waha_client

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
        # Get the LAST N messages (subquery gets newest, outer query re-orders ASC for display)
        cursor = await db.execute(
            """SELECT * FROM (
                SELECT * FROM messages WHERE chat_id = ?
                ORDER BY timestamp DESC, seq DESC LIMIT ?
            ) ORDER BY timestamp ASC, seq ASC""",
            (jid, limit),
        )
        rows = await cursor.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No messages found")
        return [{**dict(row), "from_me": bool(row["from_me"])} for row in rows]


class SendMessageRequest(BaseModel):
    text: str


@router.post("/{jid}/send")
async def send_message(jid: str, req: SendMessageRequest):
    result = await waha_client.send_message(jid, req.text)
    if not result:
        raise HTTPException(status_code=502, detail="Failed to send message")

    # Save the sent message to our DB immediately
    msg_id = result.get("key", {}).get("id") or result.get("id") or f"sent_{int(time.time() * 1000)}"
    async with get_db() as db:
        await db.execute(
            """INSERT OR IGNORE INTO messages (id, chat_id, from_me, body, timestamp, message_type)
               VALUES (?, ?, 1, ?, ?, 'chat')""",
            (msg_id, jid, req.text, int(time.time())),
        )
        await db.commit()

    return {"status": "sent", "id": msg_id}
