# WA Tracker — WhatsApp Unanswered Message Dashboard

FastAPI + React + SQLite backend. WAHA (WhatsApp HTTP API) for WhatsApp integration. Media stored on Cloudflare R2. Deployed on Hetzner via Docker Compose + Cloudflare Tunnel.

## Structure
- `backend/` — FastAPI app, WAHA client, SQLite, APScheduler polling
- `frontend/` — React 19 + Vite + TypeScript + Tailwind v4
- `docker-compose.yml` — WAHA container + app container
- `.github/workflows/deploy.yml` — Parallel test jobs → SSH deploy

## Commands
- Backend tests (parallel): `cd backend && uv run pytest tests/ -x -n auto`
- Frontend tests: `cd frontend && npm test`
- Frontend typecheck: `cd frontend && npx tsc --noEmit`
- Frontend build: `cd frontend && npm run build`
- Local backend: `cd backend && uv run uvicorn main:app --reload`
- Local frontend: `cd frontend && npm run dev` (proxies /api to :8500)
- Deploy: push to main (CI runs both test jobs, then deploys via SSH)

## Architecture
- WAHA NOWEB engine — lightweight (~200MB), connects via WebSocket
- SQLite with WAL mode, async via aiosqlite, context manager pattern (`async with get_db() as db:`)
- Sync every 15 min: fetches chats + contacts + messages, uploads media to R2
- Auth: bearer token from /api/login, stored in localStorage
- Skip/Block system: Skip = temporary (dismissed_until timestamp), Block = permanent (is_blocked flag)
- SQL view `v_last_messages` for efficient "last message per chat" queries
- Schema migrations run before views/indexes in init_db()

## Workflow
- Run relevant test file after changes, not the full suite
- `npx tsc --noEmit` after any TypeScript changes
- Backend tests use isolated SQLite DBs (uuid-based paths) for parallel safety
- Normal deploys only restart the `app` container — WAHA stays running
- Full WAHA restart needed only when changing WAHA env vars (user must re-scan QR)

## Known Pitfalls
- WAHA NOWEB uses `@s.whatsapp.net` for personal chats, not `@c.us` — filter for both
- NEVER delete WAHA sessions — it destroys saved WhatsApp auth. Only stop + start
- WAHA needs `WHATSAPP_NOWEB_STORE_ENABLED=True` to access chats/messages API
- The WAHA free tier has no `/api/health` endpoint — healthcheck uses `/api/sessions`
- Media pipeline: WAHA → memory → R2. Never write media to server disk
- WAHA NOWEB returns `type: null` for media — detect from `_data.message.imageMessage` etc.
- Emoji reactions are in `msg.reactions[]` with `fromMe` flag — save as synthetic messages
- iOS Safari auto-zooms inputs with font-size < 16px — use `text-base` on mobile
- Hebrew text needs `dir="auto"` on text elements for correct RTL rendering
- `CREATE TABLE IF NOT EXISTS` doesn't add new columns — use ALTER TABLE migrations
- Profile picture URLs from WhatsApp expire — cached in DB, re-fetched if missing
- npm overrides needed for emoji-mart + React 19 compatibility
