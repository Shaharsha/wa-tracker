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
        }
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

    async def get_messages(
        self, chat_id: str, limit: int = 30
    ) -> list[dict[str, Any]]:
        try:
            resp = await self._client.get(
                f"/api/{self._session}/chats/{chat_id}/messages",
                params={"limit": limit, "downloadMedia": "false"},
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

    async def _delete_session(self) -> None:
        """Delete the session entirely (removes stored auth data)."""
        try:
            resp = await self._client.delete(f"/api/sessions/{self._session}")
            logger.info("Delete session: HTTP %s", resp.status_code)
        except Exception as e:
            logger.warning("Delete session failed (may not exist): %s", e)

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
        """Start the WAHA session. Cleans up any existing failed session first."""
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

        # Session exists — stop, delete, then start fresh
        logger.info("Session already exists, doing stop → delete → start")
        await self.stop_session()
        await self._delete_session()

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
