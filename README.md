# VSP Inventory Manager

Self-hosted inventory management app: scan product barcodes and label photos on intake, scan a
generated QR label to assign a shelf/bin location, and check items back out — all tracked per user.
Built to run on Unraid via Docker Compose, with a mobile-first scanning UI and a desktop-friendly
management/search UI.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, `@zxing/browser` for barcode/QR scanning
- Backend: Node + Express + TypeScript, Prisma ORM
- Database: PostgreSQL
- This stack does **not** terminate TLS itself — `frontend` serves plain HTTP on `HTTP_PORT`
  and expects to sit behind your own reverse proxy (e.g. Nginx Proxy Manager, optionally paired
  with your own Cloudflare Tunnel in front of that), which handles the public hostname and
  certificate (see below)

## Running locally

```sh
cp .env.example .env   # fill in real secrets
docker compose up -d --build
```

The app listens on plain HTTP at `http://<host>:HTTP_PORT` (default `8080`). Point your reverse
proxy's forward target there — see "Fronting with your own reverse proxy" below.

### Camera access (barcode scanning / photo capture)

Browsers only allow camera access over HTTPS. Since this stack doesn't handle TLS itself, that
means **your reverse proxy must terminate HTTPS with a certificate real browsers trust** (e.g. via
Nginx Proxy Manager's own Let's Encrypt integration, or a Cloudflare Tunnel/Access setup in front
of it) — see the section below for exactly what it needs to forward.

## Fronting with your own reverse proxy (e.g. Nginx Proxy Manager)

This app expects one thing from whatever sits in front of it: a plain-HTTP proxy pass to
`<unraid-ip>:HTTP_PORT` (default `8080`), with **`X-Forwarded-Proto` set to `https`** on the
forwarded request when the original client connection was HTTPS. `frontend`'s nginx passes that
header straight through to the backend, which uses it to decide whether to issue the session
cookie as `Secure` — if it's missing or wrong, logins will appear to silently fail (the login
call succeeds, but the session cookie never sticks).

In **Nginx Proxy Manager**, this is the default behavior for any Proxy Host with SSL enabled — no
extra config needed:

- Domain Names: `inventory.indiconvision.com` (or whatever `APP_HOSTNAME` you set in `.env`)
- Scheme: `http`
- Forward Hostname/IP: your Unraid box's LAN IP
- Forward Port: `HTTP_PORT` from your `.env` (default `8080`)
- SSL tab: request/attach a certificate and enable "Force SSL"

If you're also routing through your own separate Cloudflare Tunnel in front of NPM (rather than
NPM requesting its own Let's Encrypt cert), that's independent of this app — just make sure
whatever reaches NPM is HTTPS, since NPM forwards that scheme information on for you.

Set `APP_HOSTNAME` in `.env` to match whatever public hostname you configure there — the backend
uses it to build `CORS_ORIGIN`/`PUBLIC_BASE_URL` (the latter is also embedded in generated
location QR codes).

## Deploying on Unraid

1. **Get the code onto the array/cache.** SSH into Unraid (or use the built-in web terminal) and
   pick a persistent location, e.g. `/mnt/user/appdata/vsp-inventory`:

   ```sh
   mkdir -p /mnt/user/appdata/vsp-inventory && cd /mnt/user/appdata/vsp-inventory
   curl -L https://github.com/fsteerzer88/VSP-Inventory-Claude/archive/refs/heads/main.tar.gz | tar xz --strip-components=1
   ```

   (Unraid doesn't ship `git` by default. If you'd rather use `git pull` for updates, install
   `git` via the **NerdTools** plugin from Community Applications first, then `git clone` instead.)

2. **Configure secrets.**

   ```sh
   cp .env.example .env
   nano .env   # set POSTGRES_PASSWORD, SESSION_SECRET, SEED_ADMIN_PASSWORD, APP_HOSTNAME
   ```

   `HTTP_PORT` defaults to `8080` since Unraid's own webGUI usually owns 80/443.

3. **Bring the stack up:**

   ```sh
   docker compose up -d --build
   ```

   If your Unraid version doesn't have the `docker compose` CLI, install the **Compose Manager**
   plugin (by dcflachs) from Community Applications — it gives you a GUI to add this stack (point
   it at the `docker-compose.yml` here), start/stop it, and have it auto-start with the array,
   right alongside your other Docker containers in the Unraid UI.

4. **Point your reverse proxy at it** — see "Fronting with your own reverse proxy" above.

5. **Browse to it**: `https://inventory.indiconvision.com` (or whatever `APP_HOSTNAME` you set)
   from any device.

6. **Updating later**: pull the latest code (`git pull`, or re-run the `curl | tar` command from
   step 1) and re-run `docker compose up -d --build`. Containers use `restart: unless-stopped`, so
   they come back automatically after an Unraid reboot as long as Docker is enabled.

Postgres data and uploaded product images are stored in named Docker volumes
(`vsp-inventory_postgres_data`, `vsp-inventory_product_images`). If you want them included in
Unraid's appdata-backup flows too, switch those two to bind mounts (e.g. `./data/postgres` and
`./data/images`) in `docker-compose.yml` before first bringing the stack up.

## Development

- `frontend/` — `npm install && npm run dev`
- `backend/` — `npm install && npm run dev` (needs a reachable Postgres; see `backend/.env.example`)

## CI

GitHub Actions (`.github/workflows/ci.yml`) typechecks/builds both apps, builds the backend and
frontend Docker images, and runs a `docker compose` smoke test (backend health/auth checks, and
the full request path through the frontend's nginx `/api` proxy) on every push/PR to `main`.
