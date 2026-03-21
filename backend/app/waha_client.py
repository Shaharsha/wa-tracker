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


waha_client = WAHAClient()
