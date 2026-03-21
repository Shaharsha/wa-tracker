import asyncio
import logging
from datetime import datetime, timezone

from app.database import get_db
from app.waha_client import waha_client
from app.services.media import upload_to_r2

logger = logging.getLogger(__name__)

_sync_lock = asyncio.Lock()


def _is_personal_chat(chat_id: str) -> bool:
    return chat_id.endswith("@c.us") or chat_id.endswith("@s.whatsapp.net")


def _extract_phone(jid: str) -> str:
    return jid.split("@")[0]


async def poll_and_update():
    if _sync_lock.locked():
        logger.info("Sync already running, skipping")
        return

    async with _sync_lock:
        await _do_sync()


async def _do_sync():
    logger.info("Starting sync...")

    status = await waha_client.get_session_status()
    if status != "WORKING":
        logger.warning("WAHA session not working (status=%s), skipping sync", status)
        return

    # Fetch contacts and chats concurrently
    contact_names, chats = await asyncio.gather(
        waha_client.get_all_contacts(),
        waha_client.get_chats(limit=200),
    )
    personal_chats = [c for c in chats if _is_personal_chat(c.get("id", ""))]
    logger.info("Found %d personal chats out of %d total", len(personal_chats), len(chats))

    async with get_db() as db:
        # Get known latest timestamps and contacts with profile pics
        cursor = await db.execute(
            "SELECT chat_id, MAX(timestamp) as latest_ts FROM messages GROUP BY chat_id"
        )
        known_latest = {row["chat_id"]: row["latest_ts"] for row in await cursor.fetchall()}

        cursor = await db.execute(
            "SELECT jid FROM contacts WHERE profile_picture_url IS NOT NULL"
        )
        has_pic = {row["jid"] for row in await cursor.fetchall()}

        # Fetch profile pictures concurrently for contacts that need them
        needs_pic = [c["id"] for c in personal_chats if c["id"] not in has_pic]
        if needs_pic:
            pic_results = await asyncio.gather(
                *[waha_client.get_profile_picture(jid) for jid in needs_pic],
                return_exceptions=True,
            )
            pic_map = {
                jid: url
                for jid, url in zip(needs_pic, pic_results)
                if isinstance(url, str)
            }
            logger.info("Fetched %d new profile pictures", len(pic_map))
        else:
            pic_map = {}

        fetched_count = 0
        media_count = 0
        for chat in personal_chats:
            jid = chat["id"]
            name = contact_names.get(jid) or chat.get("name") or chat.get("pushName") or chat.get("formattedTitle")
            phone = _extract_phone(jid)
            pic_url = pic_map.get(jid)

            await db.execute(
                """INSERT INTO contacts (jid, name, phone, profile_picture_url, updated_at)
                   VALUES (?, ?, ?, ?, datetime('now'))
                   ON CONFLICT(jid) DO UPDATE SET
                       name = COALESCE(excluded.name, contacts.name),
                       phone = excluded.phone,
                       profile_picture_url = COALESCE(excluded.profile_picture_url, contacts.profile_picture_url),
                       updated_at = datetime('now')""",
                (jid, name, phone, pic_url),
            )

            # Only fetch messages if chat has newer activity
            chat_ts = chat.get("conversationTimestamp") or chat.get("timestamp") or 0
            our_latest = known_latest.get(jid, 0)

            if chat_ts > our_latest or jid not in known_latest:
                try:
                    messages = await waha_client.get_messages(jid, limit=20)
                    fetched_count += 1
                except Exception:
                    logger.warning("Failed to fetch messages for %s, skipping", jid)
                    continue

                # Insert messages + download media for new ones
                _MEDIA_TYPES = {"image", "video", "audio", "ptt", "sticker", "document"}
                for msg in messages:
                    msg_id = msg.get("id")
                    if not msg_id:
                        continue
                    msg_type = msg.get("type", "chat")
                    has_media = msg.get("hasMedia") or msg_type in _MEDIA_TYPES

                    # Check if message already exists
                    cursor = await db.execute("SELECT media_url FROM messages WHERE id = ?", (msg_id,))
                    existing = await cursor.fetchone()
                    if existing:
                        continue  # Already have this message

                    # Download + upload media to R2 (in memory, no disk)
                    media_url = None
                    if has_media:
                        media_result = await waha_client.download_media(msg_id)
                        if media_result:
                            data, mimetype = media_result
                            ext = mimetype.split("/")[-1].split(";")[0]
                            r2_key = f"{jid.split('@')[0]}/{msg_id}.{ext}"
                            uploaded = upload_to_r2(r2_key, data, mimetype)
                            if uploaded:
                                media_url = uploaded
                                media_count += 1

                    await db.execute(
                        """INSERT OR IGNORE INTO messages
                           (id, chat_id, from_me, body, timestamp, message_type, media_url)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (msg_id, jid, 1 if msg.get("fromMe") else 0,
                         msg.get("body", ""), msg.get("timestamp", 0), msg_type, media_url),
                    )

                    # If this message has a reaction from us, save it as a "reply"
                    # so the contact is marked as answered
                    reactions = msg.get("reactions") or msg.get("_data", {}).get("reactions") or []
                    for reaction in reactions:
                        r_key = reaction.get("key", {})
                        if r_key.get("fromMe"):
                            r_ts = reaction.get("senderTimestampMs", 0)
                            if isinstance(r_ts, (int, float)) and r_ts > 1000000000000:
                                r_ts = int(r_ts / 1000)  # ms → seconds
                            r_id = f"reaction_{msg_id}_{r_key.get('id', '')}"
                            await db.execute(
                                """INSERT OR IGNORE INTO messages
                                   (id, chat_id, from_me, body, timestamp, message_type)
                                   VALUES (?, ?, 1, ?, ?, 'reaction')""",
                                (r_id, jid, reaction.get("text", ""), r_ts),
                            )

        await db.execute(
            """INSERT INTO sync_state (key, value) VALUES ('last_sync_at', ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
            (datetime.now(timezone.utc).isoformat(),),
        )
        await db.commit()
        logger.info("Sync complete: %d chats, %d msg fetches, %d new pics, %d media uploaded",
                     len(personal_chats), fetched_count, len(pic_map), media_count)
