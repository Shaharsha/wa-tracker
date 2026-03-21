from app.database import get_db

_BASE_QUERY = """
SELECT
    c.jid,
    c.name,
    c.phone,
    c.is_dismissed,
    c.profile_picture_url,
    lm.body AS last_message_preview,
    lm.timestamp AS last_message_timestamp,
    lm.from_me AS last_message_from_me,
    (SELECT COUNT(*) FROM messages m2
     WHERE m2.chat_id = c.jid
     AND m2.from_me = 0
     AND m2.timestamp > COALESCE(
         (SELECT MAX(m3.timestamp) FROM messages m3
          WHERE m3.chat_id = c.jid AND m3.from_me = 1), 0)
    ) AS unanswered_count,
    (strftime('%s', 'now') - lm.timestamp) AS waiting_seconds
FROM contacts c
JOIN v_last_messages lm ON lm.chat_id = c.jid
WHERE lm.from_me = 0
  {dismissed_filter}
ORDER BY lm.timestamp ASC
"""


def _to_contact(row) -> dict:
    d = dict(row)
    d["is_dismissed"] = bool(d["is_dismissed"])
    d["last_message_from_me"] = bool(d["last_message_from_me"])
    return d


async def get_unanswered_contacts(include_dismissed: bool = False) -> list[dict]:
    async with get_db() as db:
        if include_dismissed:
            query = _BASE_QUERY.format(dismissed_filter="")
            cursor = await db.execute(query)
        else:
            query = _BASE_QUERY.format(dismissed_filter="AND c.is_dismissed = 0")
            cursor = await db.execute(query)
        return [_to_contact(row) for row in await cursor.fetchall()]


async def get_dismissed_contacts() -> list[dict]:
    async with get_db() as db:
        query = _BASE_QUERY.format(dismissed_filter="AND c.is_dismissed = 1")
        cursor = await db.execute(query)
        return [_to_contact(row) for row in await cursor.fetchall()]
