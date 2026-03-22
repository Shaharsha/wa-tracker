import base64
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Session config passed on every start to ensure store is enabled
_SESSION_CONFIG = {
    "noweb": {
        "store": {
            "enabled": True,
            "fullSync": True,
        },
        "markOnline": False,
    }
}


class WAHAClient:
    def __init__(self):
        self._client = httpx.AsyncClient(
            base_url=settings.waha_base_url,
            headers={"X-Api-Key": settings.waha_api_key},
            timeout=30.0,
        )
        self._session = settings.waha_session_name

    async def close(self):
        await self._client.aclose()

    async def get_session_status(self) -> str | None:
        try:
            resp = await self._client.get(f"/api/sessions/{self._session}")
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status")
            logger.debug("Session status: %s", status)
            return status
        except Exception as e:
            logger.error("Failed to get session status: %s", e)
            return None

    async def get_chats(self, limit: int = 200) -> list[dict[str, Any]]:
        logger.info("Fetching chats (limit=%d)", limit)
        try:
            resp = await self._client.get(
                f"/api/{self._session}/chats",
                params={"limit": limit},
            )
            resp.raise_for_status()
            chats = resp.json()
            logger.info("Fetched %d chats from WAHA", len(chats))
            return chats
        except Exception as e:
            logger.error("Failed to fetch chats: %s", e)
            return []

    async def get_profile_picture(self, contact_id: str) -> str | None:
        """Get profile picture URL for a contact."""
        try:
            resp = await self._client.get(
                "/api/contacts/profile-picture",
                params={"contactId": contact_id, "session": self._session},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("profilePictureURL")
            return None
        except Exception as e:
            logger.debug("Failed to get profile pic for %s: %s", contact_id, e)
            return None

    async def download_media_from_url(self, url: str) -> tuple[bytes, str] | None:
        """Download media from a WAHA file URL. Returns (data, mimetype) or None."""
        try:
            # Extract path from the URL (e.g. http://localhost:3000/api/files/default/xxx.jpeg -> /api/files/default/xxx.jpeg)
            from urllib.parse import urlparse
            path = urlparse(url).path
            logger.info("Downloading media: %s", path)
            resp = await self._client.get(path, timeout=60.0)
            if resp.status_code == 200:
                mimetype = resp.headers.get("content-type", "application/octet-stream")
                logger.debug("Downloaded media (%d bytes, %s)", len(resp.content), mimetype)
                return resp.content, mimetype
            logger.warning("Media download returned HTTP %s for %s", resp.status_code, url)
            return None
        except Exception as e:
            logger.debug("Failed to download media from %s: %s", url, e)
            return None

    async def get_all_contacts(self) -> dict[str, str]:
        """Fetch all contacts and return a {phone@s.whatsapp.net: name} mapping."""
        try:
            resp = await self._client.get(
                "/api/contacts/all",
                params={"session": self._session, "limit": 10000},
            )
            resp.raise_for_status()
            contacts = resp.json()
            # Build mapping: contacts use @c.us IDs, chats use @s.whatsapp.net
            mapping: dict[str, str] = {}
            for c in contacts:
                name = c.get("name") or c.get("pushName") or c.get("verifiedName")
                if name:
                    cid = c.get("id", "")
                    phone = cid.split("@")[0]
                    mapping[f"{phone}@s.whatsapp.net"] = name
                    mapping[f"{phone}@c.us"] = name
            logger.info("Fetched %d contacts with names from WAHA", len(mapping) // 2)
            return mapping
        except Exception as e:
            logger.error("Failed to fetch contacts: %s", e)
            return {}

    async def send_message(self, chat_id: str, text: str) -> dict[str, Any] | None:
        """Send a text message to a chat."""
        try:
            resp = await self._client.post(
                f"/api/sendText",
                json={
                    "chatId": chat_id,
                    "text": text,
                    "session": self._session,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("Sent message to %s", chat_id)
            return data
        except Exception as e:
            logger.error("Failed to send message to %s: %s", chat_id, e)
            return None

    async def get_messages(
        self, chat_id: str, limit: int = 30
    ) -> list[dict[str, Any]]:
        try:
            resp = await self._client.get(
                f"/api/{self._session}/chats/{chat_id}/messages",
                params={"limit": limit, "downloadMedia": str(bool(settings.r2_endpoint)).lower()},
            )
            resp.raise_for_status()
            msgs = resp.json()
            logger.debug("Fetched %d messages for %s", len(msgs), chat_id)
            return msgs
        except Exception as e:
            logger.error("Failed to fetch messages for %s: %s", chat_id, e)
            return []

    async def get_session_info(self) -> dict[str, Any] | None:
        try:
            resp = await self._client.get(f"/api/sessions/{self._session}")
            resp.raise_for_status()
            data = resp.json()
            logger.info("Session info: status=%s", data.get("status"))
            return data
        except Exception as e:
            logger.error("Failed to get session info: %s", e)
            return None

    async def set_presence_offline(self) -> None:
        """Set presence to offline so phone receives notifications."""
        try:
            await self._client.post(
                f"/api/{self._session}/presence",
                json={"presence": "offline"},
            )
            logger.info("Presence set to offline")
        except Exception as e:
            logger.warning("Failed to set presence offline: %s", e)

    async def stop_session(self) -> None:
        try:
            resp = await self._client.post(
                "/api/sessions/stop",
                json={"name": self._session},
            )
            logger.info("Stop session: HTTP %s", resp.status_code)
        except Exception as e:
            logger.warning("Stop session failed: %s", e)

    async def start_session(self) -> dict[str, Any] | None:
        """Start the WAHA session. Restarts if already exists (preserves auth)."""
        logger.info("Starting WAHA session '%s'", self._session)

        start_body = {"name": self._session, "config": _SESSION_CONFIG}

        # Try starting directly
        try:
            resp = await self._client.post("/api/sessions/start", json=start_body)
            logger.info("Start session attempt 1: HTTP %s", resp.status_code)

            if resp.status_code in (200, 201):
                data = resp.json()
                logger.info("Session started: status=%s", data.get("status"))
                return data
        except Exception as e:
            logger.error("Start session request failed: %s", e)

        # Session already exists — stop and restart (preserves saved auth)
        logger.info("Session already exists, doing stop → start (preserving auth)")
        await self.stop_session()

        try:
            resp = await self._client.post("/api/sessions/start", json=start_body)
            logger.info("Start session attempt 2: HTTP %s", resp.status_code)

            if resp.status_code in (200, 201):
                data = resp.json()
                logger.info("Session started after cleanup: status=%s", data.get("status"))
                return data
            else:
                body = resp.text
                logger.error("Start session attempt 2 failed: HTTP %s — %s", resp.status_code, body)
        except Exception as e:
            logger.error("Start session attempt 2 failed: %s", e)

        return await self.get_session_info()

    async def get_qr_code(self) -> dict[str, Any] | None:
        try:
            resp = await self._client.get(
                f"/api/{self._session}/auth/qr",
                params={"format": "image"},
            )
            logger.debug("QR code request: HTTP %s, content-type=%s, size=%d",
                         resp.status_code, resp.headers.get("content-type", ""), len(resp.content))

            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "image" in content_type:
                    return {
                        "mimetype": content_type,
                        "data": base64.b64encode(resp.content).decode(),
                    }
                return resp.json()

            logger.warning("QR code returned HTTP %s: %s", resp.status_code, resp.text[:200])
            return None
        except Exception as e:
            logger.error("Failed to get QR code: %s", e)
            return None


waha_client = WAHAClient()
