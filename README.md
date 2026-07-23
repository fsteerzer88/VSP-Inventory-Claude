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

## Deploying on Unraid

1. **Get the code onto the array/cache.** SSH into Unraid (or use the built-in web terminal) and
   pick a persistent location, e.g. `/mnt/user/appdata/vsp-inventory`:

   ```sh
   mkdir -p /mnt/user/appdata/vsp-inventory && cd /mnt/user/appdata/vsp-inventory
   curl -L https://github.com/fsteerzer88/VSP-Inventory-Claude/archive/refs/heads/main.tar.gz | tar xz --strip-components=1
   ```

   (Unraid doesn't ship `git` by default. If you'd rather use `git pull` for updates, install
   `git` via the **NerdTools** plugin from Community Applications first, then `git clone` instead.)

2. **Configure secrets and ports.**

   ```sh
   cp .env.example .env
   nano .env   # set POSTGRES_PASSWORD, SESSION_SECRET, SEED_ADMIN_PASSWORD, APP_HOSTNAME
   ```

   Unraid's own webGUI usually owns ports 80/443, which is why `.env.example` defaults this app
   to `8080`/`8443` instead. Only change those back to 80/443 if you've freed them up.

3. **Set up LAN HTTPS** (needed for camera/barcode scanning from a phone) — see
   [`docker/reverse-proxy/README.md`](docker/reverse-proxy/README.md) for the one-time `mkcert`
   steps, then drop `cert.pem`/`key.pem` into `docker/reverse-proxy/certs/` on the Unraid box.
   Without this the stack still comes up (self-signed fallback cert), you just won't get camera
   access until you do it.

4. **Bring the stack up:**

   ```sh
   docker compose up -d --build
   ```

   If your Unraid version doesn't have the `docker compose` CLI, install the **Compose Manager**
   plugin (by dcflachs) from Community Applications — it gives you a GUI to add this stack (point
   it at the `docker-compose.yml` here), start/stop it, and have it auto-start with the array,
   right alongside your other Docker containers in the Unraid UI.

5. **Browse to it**: `https://<APP_HOSTNAME>:<HTTPS_PORT>` (e.g. `https://inventory.lan:8443`)
   from any device that trusts the mkcert CA.

6. **Updating later**: pull the latest code (`git pull`, or re-run the `curl | tar` command from
   step 1) and re-run `docker compose up -d --build`. Containers use `restart: unless-stopped`, so
   they come back automatically after an Unraid reboot as long as Docker is enabled.

Postgres data and uploaded product images are stored in named Docker volumes
(`vsp-inventory_postgres_data`, `vsp-inventory_product_images`). If you want them included in
Unraid's appdata-backup flows instead, switch those two volumes in `docker-compose.yml` to bind
mounts (e.g. `./data/postgres` and `./data/images`) before first bringing the stack up.

## Development

- `frontend/` — `npm install && npm run dev`
- `backend/` — `npm install && npm run dev` (needs a reachable Postgres; see `backend/.env.example`)

## CI

GitHub Actions (`.github/workflows/ci.yml`) typechecks/builds both apps, builds both Docker images,
and runs a `docker compose` smoke test (login, auth check, create a location) on every push/PR to
`main`.
