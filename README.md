# watracker

Self-hosted dashboard that tracks unanswered WhatsApp messages, so you never forget to reply.

**Live at** [your-domain.com](https://your-domain.com)

## What it does

- Connects to your personal WhatsApp via [WAHA](https://waha.devlike.pro)
- Syncs messages every 15 minutes
- Shows who's waiting for a reply, sorted by how long they've been waiting
- **Skip** a contact (reappears when they message again) or **Block** forever
- Reply directly from the dashboard with emoji support
- Media (images, videos, voice notes) stored on Cloudflare R2

## Stack

| Layer | Tech |
|-------|------|
| WhatsApp API | [WAHA](https://waha.devlike.pro) (NOWEB engine) |
| Backend | Python, FastAPI, SQLite, APScheduler |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
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
# Edit .env with your secrets (see .env.example for required vars)

# Start
docker compose up -d

# Open WAHA dashboard to scan QR: http://localhost:3000/dashboard
# Or use the web UI at http://localhost:8500
```

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

# Tests
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

- **Presence**: Never appears "online" (`WAHA_PRESENCE_AUTO_ONLINE=False`)
- **Media**: Streams WAHA → memory → R2 (never touches server disk)
- **Auth**: Username/password login → bearer token
- **Session persistence**: Saved in Docker volume, survives restarts

## License

Private project.
