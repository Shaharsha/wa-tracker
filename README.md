# watracker

Self-hosted dashboard that tracks unanswered WhatsApp messages, so you never forget to reply.

## What it does

- Connects to your personal WhatsApp via [WAHA](https://waha.devlike.pro)
- Syncs messages every 15 minutes
- Shows who's waiting for a reply, sorted by how long they've been waiting
- **Skip** a contact (reappears when they message again) or **Block** forever
- **Reply** directly from the dashboard — with emoji picker and shortcode support
- Emoji **reactions** count as replies (contact leaves the unanswered list)
- View images, videos, and voice messages inline (stored on Cloudflare R2)
- Contact names and profile pictures from your phone's address book
- RTL text support (Hebrew, Arabic)
- Mobile-responsive — works on phone and desktop

## Stack

| Layer | Tech |
|-------|------|
| WhatsApp API | [WAHA](https://waha.devlike.pro) (NOWEB engine) |
| Backend | Python, FastAPI, SQLite, APScheduler, uv |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, emoji-mart |
| Media storage | Cloudflare R2 |
| Deployment | Docker Compose, GitHub Actions, Cloudflare Tunnel |
| Server | Hetzner VPS (Ubuntu) |

## Setup

```bash
# Clone
git clone https://github.com/Shaharsha/wa-tracker.git
cd wa-tracker

# Create .env from example
cp .env.example .env
# Edit .env — all fields are required (app refuses to start without them)

# Start
docker compose up -d

# Open https://your-domain or http://localhost:8500
# Click "Start Session" and scan the QR code with your phone
```

### Required environment variables

See `.env.example` for the full list. Key ones:
- `WAHA_API_KEY` — random string for WAHA API auth
- `DASHBOARD_AUTH_TOKEN` — random string for dashboard API auth
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` — login credentials
- `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET_KEY` — Cloudflare R2 for media

## Development

```bash
# Backend
cd backend
uv sync
uv run uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :8500)

# Tests (77 total)
cd backend && uv run pytest tests/ -x -n auto   # 49 tests, parallel
cd frontend && npm test                           # 28 tests
```

## Architecture

```
[WhatsApp] ←WebSocket→ [WAHA :3000] ←HTTP→ [FastAPI :8500] ←SQLite→ [DB]
                                                  ↕                    ↕
                                          [React SPA]          [Cloudflare R2]
                                                  ↕
                                     [Cloudflare Tunnel → your-domain.com]
```

- **Presence**: Never appears "online" — `markOnline: false` + explicit offline presence after every sync
- **Media**: Streams WAHA → memory → R2 (never touches server disk)
- **Auth**: Username/password login → bearer token, rate-limited (5 attempts/5 min), security headers
- **Session persistence**: Saved in Docker volume, survives restarts and deploys without QR re-scan
- **Phone notifications**: Preserved via offline presence (WAHA doesn't suppress phone push notifications)

## Security

- Rate-limited login (5 attempts per IP per 5 minutes)
- Fail-closed: app refuses to start without `AUTH_TOKEN` and `DASHBOARD_PASSWORD`
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- WAHA bound to localhost only (not exposed through Cloudflare Tunnel)
- R2 bucket is private — media served through authenticated proxy
- No secrets in git history

## License

Private project.
