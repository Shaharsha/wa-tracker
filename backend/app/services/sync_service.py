import logging
from datetime import datetime, timezone

from app.database import get_db
from app.waha_client import waha_client

logger = logging.getLogger(__name__)


def _is_personal_chat(chat_id: str) -> bool:
    return chat_id.endswith("@c.us") or chat_id.endswith("@s.whatsapp.net")


def _extract_phone(jid: str) -> str:
    return jid.split("@")[0]


async def poll_and_update():
    logger.info("Starting sync...")

    status = await waha_client.get_session_status()
    if status != "WORKING":
        logger.warning("WAHA session not working (status=%s), skipping sync", status)
        return

    # Only fetch 50 most recent chats — reduces API calls to WAHA
    chats = await waha_client.get_chats(limit=50)
    personal_chats = [c for c in chats if _is_personal_chat(c.get("id", ""))]
    logger.info("Found %d personal chats out of %d total", len(personal_chats), len(chats))

    db = None
    try:
        db = await get_db()

        # Get the latest message timestamp we have for each chat
        cursor = await db.execute(
            "SELECT chat_id, MAX(timestamp) as latest_ts FROM messages GROUP BY chat_id"
        )
        known_latest = {row["chat_id"]: row["latest_ts"] for row in await cursor.fetchall()}

        fetched_count = 0
        for chat in personal_chats:
            jid = chat["id"]
            name = chat.get("name") or chat.get("pushName") or chat.get("formattedTitle")
            phone = _extract_phone(jid)

            await db.execute(
                """INSERT INTO contacts (jid, name, phone, updated_at)
                   VALUES (?, ?, ?, datetime('now'))
                   ON CONFLICT(jid) DO UPDATE SET
                       name = COALESCE(excluded.name, contacts.name),
                       phone = excluded.phone,
                       updated_at = datetime('now')""",
                (jid, name, phone),
            )

            # Check if this chat has new messages based on WAHA's lastMessage timestamp
            chat_ts = chat.get("conversationTimestamp") or chat.get("timestamp") or 0
            our_latest = known_latest.get(jid, 0)

            # Only fetch messages if the chat has newer activity than what we know
            if chat_ts > our_latest or jid not in known_latest:
                try:
                    messages = await waha_client.get_messages(jid, limit=20)
                    fetched_count += 1
                except Exception:
                    logger.warning("Failed to fetch messages for %s, skipping", jid)
                    continue

                for msg in messages:
                    msg_id = msg.get("id")
                    if not msg_id:
                        continue
                    await db.execute(
                        """INSERT OR IGNORE INTO messages (id, chat_id, from_me, body, timestamp, message_type)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (
                            msg_id,
                            jid,
                            1 if msg.get("fromMe") else 0,
                            msg.get("body", ""),
                            msg.get("timestamp", 0),
                            msg.get("type", "chat"),
                        ),
                    )

        await db.execute(
            """INSERT INTO sync_state (key, value) VALUES ('last_sync_at', ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
            (datetime.now(timezone.utc).isoformat(),),
        )
        await db.commit()
        logger.info("Sync complete: %d chats processed, %d message fetches", len(personal_chats), fetched_count)
    except Exception:
        logger.exception("Error during sync")
    finally:
        if db:
            await db.close()
