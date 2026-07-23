# VSP Inventory Manager

Self-hosted inventory management app: scan product barcodes and label photos on intake, scan a
generated QR label to assign a shelf/bin location, and check items back out — all tracked per user.
Built to run on Unraid via Docker Compose, with a mobile-first scanning UI and a desktop-friendly
management/search UI.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, `@zxing/browser` for barcode/QR scanning
- Backend: Node + Express + TypeScript, Prisma ORM
- Database: PostgreSQL
- Reverse proxy: nginx, terminating TLS (see below)

## Running locally

```sh
cp .env.example .env   # fill in real secrets
docker compose up -d --build
```

Then browse to `https://localhost` (or whatever `HTTP_PORT`/`HTTPS_PORT` you set in `.env`).

### Camera access (barcode scanning / photo capture)

Browsers only allow camera access over HTTPS (or `localhost`). To scan barcodes from a phone on
your LAN, you need a trusted certificate for a LAN hostname — see
[`docker/reverse-proxy/README.md`](docker/reverse-proxy/README.md) for the one-time `mkcert` setup.
Without it, the stack still runs (a temporary self-signed cert is generated automatically), but
camera access will be blocked by the browser.

## Development

- `frontend/` — `npm install && npm run dev`
- `backend/` — `npm install && npm run dev` (needs a reachable Postgres; see `backend/.env.example`)

## CI

GitHub Actions (`.github/workflows/ci.yml`) typechecks/builds both apps, builds both Docker images,
and runs a `docker compose` smoke test (login, auth check, create a location) on every push/PR to
`main`.
