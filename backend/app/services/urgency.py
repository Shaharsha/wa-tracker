from app.database import get_db

_UNANSWERED_QUERY = """
SELECT
    c.jid,
    c.name,
    c.phone,
    c.is_dismissed,
    last_msg.body AS last_message_preview,
    last_msg.timestamp AS last_message_timestamp,
    last_msg.from_me AS last_message_from_me,
    (SELECT COUNT(*) FROM messages m2
     WHERE m2.chat_id = c.jid
     AND m2.from_me = 0
     AND m2.timestamp > COALESCE(
         (SELECT MAX(m3.timestamp) FROM messages m3
          WHERE m3.chat_id = c.jid AND m3.from_me = 1), 0)
    ) AS unanswered_count,
    (strftime('%s', 'now') - last_msg.timestamp) AS waiting_seconds
FROM contacts c
JOIN messages last_msg ON last_msg.chat_id = c.jid
    AND last_msg.id = (
        SELECT id FROM messages
        WHERE chat_id = c.jid
        ORDER BY timestamp DESC LIMIT 1
    )
WHERE last_msg.from_me = 0
  AND c.is_dismissed = :dismissed
ORDER BY last_msg.timestamp ASC
"""

_ALL_UNANSWERED_QUERY = """
SELECT
    c.jid,
    c.name,
    c.phone,
    c.is_dismissed,
    last_msg.body AS last_message_preview,
    last_msg.timestamp AS last_message_timestamp,
    last_msg.from_me AS last_message_from_me,
    (SELECT COUNT(*) FROM messages m2
     WHERE m2.chat_id = c.jid
     AND m2.from_me = 0
     AND m2.timestamp > COALESCE(
         (SELECT MAX(m3.timestamp) FROM messages m3
          WHERE m3.chat_id = c.jid AND m3.from_me = 1), 0)
    ) AS unanswered_count,
    (strftime('%s', 'now') - last_msg.timestamp) AS waiting_seconds
FROM contacts c
JOIN messages last_msg ON last_msg.chat_id = c.jid
    AND last_msg.id = (
        SELECT id FROM messages
        WHERE chat_id = c.jid
        ORDER BY timestamp DESC LIMIT 1
    )
WHERE last_msg.from_me = 0
ORDER BY last_msg.timestamp ASC
"""


async def get_unanswered_contacts(include_dismissed: bool = False):
    db = await get_db()
    try:
        if include_dismissed:
            cursor = await db.execute(_ALL_UNANSWERED_QUERY)
        else:
            cursor = await db.execute(_UNANSWERED_QUERY, {"dismissed": 0})
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_dismissed_contacts():
    db = await get_db()
    try:
        cursor = await db.execute(_UNANSWERED_QUERY, {"dismissed": 1})
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()
