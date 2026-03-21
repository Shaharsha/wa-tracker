import time

from fastapi import APIRouter, HTTPException

from app.database import get_db

router = APIRouter(prefix="/api/contacts", tags=["actions"])


@router.post("/{jid}/dismiss")
async def dismiss(jid: str):
    """Dismiss for now — contact reappears if they send a new message."""
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET dismissed_until = ?, updated_at = datetime('now') WHERE jid = ?",
            (int(time.time()), jid),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "dismissed", "jid": jid}


@router.post("/{jid}/undismiss")
async def undismiss(jid: str):
    """Undo dismiss — contact reappears in unanswered."""
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET dismissed_until = 0, updated_at = datetime('now') WHERE jid = ?",
            (jid,),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "undismissed", "jid": jid}


@router.post("/{jid}/block")
async def block(jid: str):
    """Block forever — contact never appears in unanswered."""
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET is_blocked = 1, updated_at = datetime('now') WHERE jid = ?",
            (jid,),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "blocked", "jid": jid}


@router.post("/{jid}/unblock")
async def unblock(jid: str):
    """Unblock — contact can appear in unanswered again."""
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET is_blocked = 0, updated_at = datetime('now') WHERE jid = ?",
            (jid,),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "unblocked", "jid": jid}
