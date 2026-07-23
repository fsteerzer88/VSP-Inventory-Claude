# VSP Inventory Manager

Self-hosted inventory management app: scan product barcodes and label photos on intake, scan a
generated QR label to assign a shelf/bin location, and check items back out — all tracked per user.
Built to run on Unraid via Docker Compose, with a mobile-first scanning UI and a desktop-friendly
management/search UI.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, `@zxing/browser` for barcode/QR scanning
- Backend: Node + Express + TypeScript, Prisma ORM
- Database: PostgreSQL
- Access: [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
  (`cloudflared`), so the app is reachable at a real HTTPS hostname both on your LAN and remotely,
  with no port forwarding (see below)

## Running locally

```sh
cp .env.example .env   # fill in real secrets
docker compose up -d --build
```

Then browse to `https://<APP_HOSTNAME>` you configured (see the Cloudflare Tunnel setup below —
the app isn't reachable at all until that's wired up, since `cloudflared` is the only ingress).

### Camera access (barcode scanning / photo capture)

Browsers only allow camera access over HTTPS. Cloudflare's edge terminates TLS with a certificate
every browser already trusts, so **no device needs any manual certificate setup** — camera access
just works, the same as any other HTTPS site. See
[`docker/cloudflared/README.md`](docker/cloudflared/README.md) for the one-time setup (you need a
domain on a free Cloudflare account). That doc also covers locking the app down with Cloudflare
Access, since a Tunnel makes the hostname reachable from the public internet by default.

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
   nano .env   # set POSTGRES_PASSWORD, SESSION_SECRET, SEED_ADMIN_PASSWORD
   ```

3. **Set up Cloudflare Tunnel** — see [`docker/cloudflared/README.md`](docker/cloudflared/README.md)
   for the full one-time walkthrough (create the tunnel, point its public hostname at the
   `frontend` container, set `CLOUDFLARE_TUNNEL_TOKEN` in `.env`, and — important — lock it down
   with a Cloudflare Access policy). Nothing is reachable until this is done.

4. **Bring the stack up:**

   ```sh
   docker compose up -d --build
   ```

   No host ports need to be published — `cloudflared` only makes outbound connections to
   Cloudflare, so there's no port-forwarding to configure and no conflict with Unraid's own
   webGUI on 80/443.

   If your Unraid version doesn't have the `docker compose` CLI, install the **Compose Manager**
   plugin (by dcflachs) from Community Applications — it gives you a GUI to add this stack (point
   it at the `docker-compose.yml` here), start/stop it, and have it auto-start with the array,
   right alongside your other Docker containers in the Unraid UI.

5. **Browse to it**: `https://inventory.indiconvision.com` from any device — no per-device setup
   required, works both on your LAN and remotely.

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
`cloudflared` isn't part of CI since it needs a real Cloudflare tunnel token and domain — that's
only exercised in an actual deployment.
