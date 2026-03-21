import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


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
            return data.get("status")
        except Exception as e:
            logger.error("Failed to get session status: %s", e)
            return None

    async def get_chats(self, limit: int = 200) -> list[dict[str, Any]]:
        try:
            resp = await self._client.get(
                f"/api/{self._session}/chats",
                params={
                    "limit": limit,
                    "sortBy": "messageTimestamp",
                    "sortOrder": "desc",
                },
            )
            resp.raise_for_status()
            return resp.json()
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
            return resp.json()
        except Exception as e:
            logger.error("Failed to fetch messages for %s: %s", chat_id, e)
            return []

    async def get_contact_info(self, contact_id: str) -> dict[str, Any] | None:
        try:
            resp = await self._client.get(
                "/api/contacts",
                params={"contactId": contact_id, "session": self._session},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("Failed to get contact info for %s: %s", contact_id, e)
            return None

    async def get_session_info(self) -> dict[str, Any] | None:
        """Get full session info including QR code status."""
        try:
            resp = await self._client.get(f"/api/sessions/{self._session}")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("Failed to get session info: %s", e)
            return None

    async def start_session(self) -> dict[str, Any] | None:
        """Start/create the WAHA session. Handles already-existing sessions."""
        try:
            resp = await self._client.post(
                "/api/sessions/start",
                json={"name": self._session},
            )
            if resp.status_code in (200, 201):
                return resp.json()
            # Session might already exist — try getting its status instead
            logger.warning("Start session returned %s, checking status", resp.status_code)
        except Exception as e:
            logger.warning("Start session request failed: %s, checking status", e)

        # Fallback: return current session info regardless
        return await self.get_session_info()

    async def get_qr_code(self) -> dict[str, Any] | None:
        """Get QR code for session authentication."""
        try:
            resp = await self._client.get(
                f"/api/{self._session}/auth/qr",
                params={"format": "image"},
            )
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "image" in content_type:
                    import base64
                    return {
                        "mimetype": content_type,
                        "data": base64.b64encode(resp.content).decode(),
                    }
                return resp.json()
            return None
        except Exception as e:
            logger.error("Failed to get QR code: %s", e)
            return None


waha_client = WAHAClient()
