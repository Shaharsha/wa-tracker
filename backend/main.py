import hmac
import logging
import re
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from app.config import settings
from app.database import init_db
from app.poller import start_scheduler, stop_scheduler, reschedule, get_interval_minutes
from app.waha_client import waha_client
from app.routers import contacts, actions, stats
from app.services.sync_service import poll_and_update
from app.services.media import get_from_r2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR_RESOLVED = STATIC_DIR.resolve()

PUBLIC_PATHS = {"/api/health", "/api/login"}
# Paths that use query-param auth instead of header auth
MEDIA_PREFIX = "/api/media/"

# Rate limiter for login: {ip: [(timestamp, ...)])}
_login_attempts: dict[str, list[float]] = defaultdict(list)
_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    attempts = _login_attempts[ip]
    # Prune old attempts
    _login_attempts[ip] = [t for t in attempts if now - t < _LOGIN_WINDOW_SECONDS]
    return len(_login_attempts[ip]) >= _LOGIN_MAX_ATTEMPTS


def _record_attempt(ip: str):
    _login_attempts[ip].append(time.time())


def _get_client_ip(request: Request) -> str:
    # Cloudflare sends real IP in CF-Connecting-IP header
    return (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.client.host
        if request.client
        else "unknown"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.auth_token:
        raise RuntimeError("AUTH_TOKEN must be set. Refusing to start without authentication.")
    if not settings.dashboard_password:
        raise RuntimeError("DASHBOARD_PASSWORD must be set. Refusing to start without a password.")
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()
    await waha_client.close()


app = FastAPI(title="WA Tracker", lifespan=lifespan)


# Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# Auth middleware
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path.rstrip("/")
    if path.startswith("/api/") and path not in PUBLIC_PATHS:
        # Media endpoints accept token as query param (for <img> tags)
        if path.startswith(MEDIA_PREFIX):
            token = request.query_params.get("token", "")
        else:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.removeprefix("Bearer ").strip()
        if not hmac.compare_digest(token, settings.auth_token):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/login")
async def login(request: Request, req: LoginRequest):
    ip = _get_client_ip(request)

    if _is_rate_limited(ip):
        logger.warning("Login rate limited for IP %s", ip)
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")

    user_ok = hmac.compare_digest(req.username, settings.dashboard_username)
    pass_ok = hmac.compare_digest(req.password, settings.dashboard_password)

    if user_ok and pass_ok:
        _login_attempts.pop(ip, None)  # Clear on success
        return {"token": settings.auth_token}

    _record_attempt(ip)
    remaining = _LOGIN_MAX_ATTEMPTS - len(_login_attempts[ip])
    logger.warning("Failed login attempt from %s (%d attempts remaining)", ip, remaining)
    raise HTTPException(status_code=401, detail="Invalid credentials")


app.include_router(contacts.router)
app.include_router(actions.router)
app.include_router(stats.router)


@app.post("/api/sync")
async def manual_sync():
    await poll_and_update()
    return {"status": "sync_complete"}


@app.get("/api/settings")
async def get_settings():
    return {"sync_interval_minutes": get_interval_minutes()}


class UpdateSettingsRequest(BaseModel):
    sync_interval_minutes: int


@app.post("/api/settings")
async def update_settings(req: UpdateSettingsRequest):
    if not 1 <= req.sync_interval_minutes <= 60:
        raise HTTPException(status_code=400, detail="Interval must be between 1 and 60 minutes")
    reschedule(req.sync_interval_minutes)
    return {"sync_interval_minutes": req.sync_interval_minutes}


@app.get("/api/waha/session")
async def waha_session():
    info = await waha_client.get_session_info()
    if not info:
        return {"status": "UNKNOWN", "qr": None}
    status = info.get("status", "UNKNOWN")
    result = {"status": status}
    if status in ("SCAN_QR_CODE", "STARTING"):
        qr = await waha_client.get_qr_code()
        result["qr"] = qr
    return result


@app.post("/api/waha/stop")
async def waha_stop_session():
    await waha_client.stop_session()
    return {"status": "stopped"}


@app.post("/api/waha/start")
async def waha_start_session():
    result = await waha_client.start_session()
    if result:
        return result
    return {"status": "STARTING", "message": "Session is being initialized, QR will appear shortly"}


@app.get("/api/media/{path:path}")
async def media_proxy(path: str):
    # Validate path format to prevent enumeration
    if not re.match(r'^[\d]+/[\w.@%-]+$', path):
        raise HTTPException(status_code=400, detail="Invalid media path")
    result = get_from_r2(path)
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")
    data, content_type = result
    return Response(content=data, media_type=content_type, headers={
        "Cache-Control": "public, max-age=31536000, immutable",
    })


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    if STATIC_DIR.exists():
        candidate = (STATIC_DIR / full_path).resolve()
        if not str(candidate).startswith(str(STATIC_DIR_RESOLVED)):
            raise HTTPException(status_code=403, detail="Forbidden")
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        idx = STATIC_DIR / "index.html"
        if idx.exists():
            return FileResponse(idx)
    raise HTTPException(status_code=404, detail="No frontend build found")
