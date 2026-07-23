# Access via Cloudflare Tunnel

The app is fronted by [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/),
which makes an **outbound-only** connection from your Unraid box to Cloudflare's edge — no port
forwarding, no inbound firewall rules. Cloudflare terminates TLS with a certificate every browser
already trusts, so there's no per-device setup, and `https://inventory.indiconvision.com` works
the same from your LAN or from anywhere else.

The tradeoff versus a LAN-only setup: the hostname is reachable from the public internet by
default. **Step 4 below (Cloudflare Access) is not optional** — without it, anyone who guesses or
finds the hostname can reach the app's login page.

## One-time setup

### 1. Create the tunnel

In the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) →
**Networks → Tunnels → Create a tunnel** → choose **Cloudflared** → give it a name (e.g.
`vsp-inventory`) → on the "Install and run a connector" step, choose the **Docker** option.
You'll be shown a command containing a long `--token` value — copy just the token.

### 2. Configure the public hostname

Still in the tunnel setup (or under the tunnel's **Public Hostname** tab afterward):

- **Subdomain**: `inventory`
- **Domain**: `indiconvision.com`
- **Service Type**: `HTTP`
- **URL**: `frontend:80`

That's it — one route. The `frontend` container's nginx handles routing `/api/*` to the backend
internally (see `docker/frontend/nginx.conf`), so cloudflared only ever needs to know about the
one internal service.

### 3. Set `.env`

```
APP_HOSTNAME=inventory.indiconvision.com
CLOUDFLARE_TUNNEL_TOKEN=<the token from step 1>
```

### 4. Lock it down with Cloudflare Access

In the Zero Trust dashboard → **Access → Applications → Add an application** → **Self-hosted**:

- Application domain: `inventory.indiconvision.com`
- Add a policy restricting who can reach it — simplest option is **"Emails"**, listing just your
  own email address, with **One-time PIN** as the login method (Cloudflare emails you a code, no
  account/password to manage). You can add more emails later for other household members.

This adds a Cloudflare-hosted login gate *in front of* the app's own login — someone would need to
pass both to get in. Without this step, the app's own auth is the only thing standing between the
internet and your inventory data.

### 5. Bring the stack up

```sh
docker compose up -d --build
```

No ports need to be published on the host at all — `cloudflared` only makes outbound connections,
so this also sidesteps any conflict with Unraid's own webGUI on 80/443.

### 6. Verify

Browse to `https://inventory.indiconvision.com`. You should hit the Cloudflare Access login
first (one-time PIN emailed to you), then land on the app's own login page. Camera/barcode
scanning should work immediately — no certificate warnings, no per-device setup.

## Notes

- Local (LAN) access also goes through Cloudflare's edge with this setup — there's no direct
  LAN shortcut. For a home inventory app this is normally not noticeable, but it does mean the
  app is unreachable if your internet connection is down, even from the same LAN.
- Rotate the tunnel token (delete and recreate the tunnel) if it's ever exposed — it's a bearer
  credential, treat `.env` like a secret.
