import hmac
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from app.config import settings
from app.database import init_db
from app.poller import start_scheduler, stop_scheduler
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.auth_token:
        logger.warning("AUTH_TOKEN is not set — all API endpoints are unprotected!")
    if settings.auth_token and not settings.dashboard_password:
        logger.error("DASHBOARD_PASSWORD is empty — login will fail!")
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()
    await waha_client.close()


app = FastAPI(title="WA Tracker", lifespan=lifespan)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path.rstrip("/")
    if path.startswith("/api/") and path not in PUBLIC_PATHS:
        if settings.auth_token:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.removeprefix("Bearer ").strip()
            if not hmac.compare_digest(token, settings.auth_token):
                return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/login")
async def login(req: LoginRequest):
    if not settings.dashboard_password:
        raise HTTPException(status_code=503, detail="Authentication not configured")
    user_ok = hmac.compare_digest(req.username, settings.dashboard_username)
    pass_ok = hmac.compare_digest(req.password, settings.dashboard_password)
    if user_ok and pass_ok:
        return {"token": settings.auth_token}
    raise HTTPException(status_code=401, detail="Invalid credentials")


app.include_router(contacts.router)
app.include_router(actions.router)
app.include_router(stats.router)


@app.post("/api/sync")
async def manual_sync():
    await poll_and_update()  # sync_service handles its own lock
    return {"status": "sync_complete"}


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


@app.post("/api/waha/start")
async def waha_start_session():
    result = await waha_client.start_session()
    if result:
        return result
    return {"status": "STARTING", "message": "Session is being initialized, QR will appear shortly"}


@app.get("/api/media/{path:path}")
async def media_proxy(path: str):
    """Serve media from R2. Auth is handled by middleware."""
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
