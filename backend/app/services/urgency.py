from app.database import get_db

# Unanswered = last message is from them AND (not blocked) AND (not dismissed OR new msg since dismiss)
_BASE_QUERY = """
SELECT
    c.jid,
    c.name,
    c.phone,
    c.is_blocked,
    c.dismissed_until,
    c.profile_picture_url,
    lm.body AS last_message_preview,
    lm.timestamp AS last_message_timestamp,
    lm.from_me AS last_message_from_me,
    lm.message_type AS last_message_type,
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
  {filter}
ORDER BY lm.timestamp ASC
"""


def _to_contact(row) -> dict:
    d = dict(row)
    d["is_blocked"] = bool(d["is_blocked"])
    d["last_message_from_me"] = bool(d["last_message_from_me"])
    # For frontend compat
    d["is_dismissed"] = d["dismissed_until"] > 0 and d["dismissed_until"] >= d["last_message_timestamp"]
    return d


async def get_unanswered_contacts(include_dismissed: bool = False) -> list[dict]:
    async with get_db() as db:
        if include_dismissed:
            # Show all unanswered (not blocked)
            query = _BASE_QUERY.format(filter="AND c.is_blocked = 0")
        else:
            # Exclude blocked AND dismissed (unless new msg since dismiss)
            query = _BASE_QUERY.format(
                filter="AND c.is_blocked = 0 AND (c.dismissed_until = 0 OR lm.timestamp > c.dismissed_until)"
            )
        cursor = await db.execute(query)
        return [_to_contact(row) for row in await cursor.fetchall()]


async def get_dismissed_contacts() -> list[dict]:
    """Contacts that were dismissed and haven't sent a new message since."""
    async with get_db() as db:
        query = _BASE_QUERY.format(
            filter="AND c.is_blocked = 0 AND c.dismissed_until > 0 AND lm.timestamp <= c.dismissed_until"
        )
        cursor = await db.execute(query)
        return [_to_contact(row) for row in await cursor.fetchall()]


async def get_blocked_contacts() -> list[dict]:
    async with get_db() as db:
        query = _BASE_QUERY.format(filter="AND c.is_blocked = 1")
        cursor = await db.execute(query)
        return [_to_contact(row) for row in await cursor.fetchall()]
