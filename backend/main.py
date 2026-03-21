import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.database import init_db
from app.poller import start_scheduler, stop_scheduler
from app.waha_client import waha_client
from app.routers import contacts, actions, stats
from app.services.sync_service import poll_and_update

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

STATIC_DIR = Path(__file__).parent / "static"

# Endpoints that don't require auth
PUBLIC_PATHS = {"/api/health", "/api/login"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()
    await waha_client.close()


app = FastAPI(title="WA Tracker", lifespan=lifespan)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path not in PUBLIC_PATHS:
        if settings.auth_token:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.removeprefix("Bearer ").strip()
            if token != settings.auth_token:
                return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/login")
async def login(req: LoginRequest):
    if req.username == settings.dashboard_username and req.password == settings.dashboard_password:
        return {"token": settings.auth_token}
    raise HTTPException(status_code=401, detail="Invalid credentials")


app.include_router(contacts.router)
app.include_router(actions.router)
app.include_router(stats.router)


@app.post("/api/sync")
async def manual_sync():
    await poll_and_update()
    return {"status": "sync_complete"}


@app.get("/api/waha/session")
async def waha_session():
    """Get WAHA session status + QR if needed."""
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
    """Start the WAHA session (triggers QR generation)."""
    result = await waha_client.start_session()
    if result:
        return result
    raise HTTPException(status_code=500, detail="Failed to start WAHA session")


# SPA fallback — must be last
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    if STATIC_DIR.exists():
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        idx = STATIC_DIR / "index.html"
        if idx.exists():
            return FileResponse(idx)
    raise HTTPException(status_code=404, detail="No frontend build found")
