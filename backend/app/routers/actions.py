from fastapi import APIRouter, HTTPException

from app.database import get_db

router = APIRouter(prefix="/api/contacts", tags=["actions"])


@router.post("/{jid}/dismiss")
async def dismiss(jid: str):
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET is_dismissed = 1, updated_at = datetime('now') WHERE jid = ?",
            (jid,),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "dismissed", "jid": jid}


@router.post("/{jid}/undismiss")
async def undismiss(jid: str):
    async with get_db() as db:
        cursor = await db.execute(
            "UPDATE contacts SET is_dismissed = 0, updated_at = datetime('now') WHERE jid = ?",
            (jid,),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"status": "undismissed", "jid": jid}
