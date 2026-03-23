# watracker

Self-hosted dashboard that tracks unanswered WhatsApp messages, so you never forget to reply.

## What it does

- Connects to your personal WhatsApp via [WAHA](https://waha.devlike.pro)
- Shows who's waiting for a reply, sorted by how long they've been waiting
- **Reply** directly from the dashboard — with emoji picker and shortcode support
- **Skip** a contact (reappears when they message again) or **Block** forever
- Emoji **reactions** count as replies (contact leaves the unanswered list)
- View images, videos, and voice messages inline (optional, via Cloudflare R2)
- Contact names and profile pictures from your phone's address book
- Configurable sync interval (1–60 min, default 15)
- RTL text support (Hebrew, Arabic)
- Mobile-responsive

## Stack

| Layer | Tech |
|-------|------|
| WhatsApp API | [WAHA](https://waha.devlike.pro) (NOWEB engine, free tier) |
| Backend | Python, FastAPI, SQLite, APScheduler, uv |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, emoji-mart |
| Media storage | Cloudflare R2 *(optional)* |
| Deployment | Docker Compose |

Runs on any Linux server, VPS, or even a Raspberry Pi. Expose via Cloudflare Tunnel, Nginx, Caddy, or any reverse proxy.

## Setup

```bash
git clone https://github.com/Shaharsha/wa-tracker.git
cd wa-tracker
cp .env.example .env    # edit with your secrets
docker compose up -d
```

Open `http://localhost:8500`, click **Start Session**, and scan the QR code with your phone.

### Environment variables

See [`.env.example`](.env.example) for all options.

**Required:**
- `WAHA_API_KEY` — random string for WAHA API auth (`openssl rand -hex 32`)
- `WAHA_DASHBOARD_PASS` — WAHA dashboard password
- `DASHBOARD_AUTH_TOKEN` — random string for dashboard API auth (`openssl rand -hex 32`)
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` — login credentials

**Optional (media):**
- `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` / `R2_BUCKET` — Cloudflare R2 for storing images, videos, voice notes. If not set, media messages show as "Photo" / "Video" placeholders. No errors, no degraded behavior — just no inline media.

## Development

```bash
# Backend
cd backend && uv sync && uv run uvicorn main:app --reload

# Frontend (proxies /api to backend)
cd frontend && npm install && npm run dev

# Tests (77 total)
cd backend && uv run pytest tests/ -x -n auto   # 49 tests, parallel
cd frontend && npm test                           # 28 tests
```

## Architecture

```
[WhatsApp] ←WebSocket→ [WAHA :3000] ←HTTP→ [FastAPI :8500] ←SQLite→ [DB]
                                                  ↕                    ↕
                                          [React SPA]        [Cloudflare R2]
                                                  ↕                (optional)
                                         [Reverse proxy]
```

- **Presence**: Never appears "online" — `markOnline: false` + explicit offline presence after every sync
- **Media**: Streams WAHA → memory → R2 (never stored on server disk). Skipped entirely if R2 is not configured.
- **Auth**: Username/password login → bearer token, rate-limited (5 attempts/5 min)
- **Session persistence**: Saved in Docker volume, survives restarts and deploys without QR re-scan
- **Phone notifications**: Preserved — WAHA runs in passive mode so phone push notifications keep working

## Security

- Rate-limited login (5 attempts per IP per 5 minutes)
- Fail-closed: app refuses to start without `AUTH_TOKEN` and `DASHBOARD_PASSWORD`
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- WAHA bound to `127.0.0.1` only — not accessible from outside the server
- R2 bucket is private — media served through authenticated proxy
- No secrets in git history

## License

MIT
