import io
import logging
from functools import lru_cache

import boto3

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_s3_client():
    if not settings.r2_endpoint or not settings.r2_access_key:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        region_name="auto",
    )


def upload_to_r2(key: str, data: bytes, content_type: str = "application/octet-stream") -> str | None:
    """Upload bytes to R2. Returns the key on success, None on failure."""
    client = _get_s3_client()
    if not client:
        logger.debug("R2 not configured, skipping media upload")
        return None
    try:
        client.upload_fileobj(
            io.BytesIO(data),
            settings.r2_bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        logger.debug("Uploaded %s to R2 (%d bytes)", key, len(data))
        return key
    except Exception as e:
        logger.error("Failed to upload %s to R2: %s", key, e)
        return None


def get_from_r2(key: str) -> tuple[bytes, str] | None:
    """Download from R2. Returns (data, content_type) or None."""
    client = _get_s3_client()
    if not client:
        return None
    try:
        resp = client.get_object(Bucket=settings.r2_bucket, Key=key)
        data = resp["Body"].read()
        content_type = resp.get("ContentType", "application/octet-stream")
        return data, content_type
    except Exception as e:
        logger.error("Failed to get %s from R2: %s", key, e)
        return None
