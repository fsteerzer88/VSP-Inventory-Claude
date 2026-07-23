# TLS via SWAG + Cloudflare DNS-01

The app is fronted by [SWAG](https://docs.linuxserver.io/images/docker-swag/) (an nginx +
certbot image), which obtains a real, publicly-trusted Let's Encrypt certificate for
`inventory.indiconvision.com` using a **DNS-01** challenge against Cloudflare.

Because it's DNS-01, **traffic never has to leave your LAN** and no port forwarding is required —
Cloudflare is only used to prove you own the domain (by creating a temporary DNS TXT record), not
to proxy any actual app traffic. Every device that trusts the public Let's Encrypt CA (i.e. every
normal browser, with zero configuration) can use the app.

## One-time setup

### 1. Add the domain to Cloudflare

If `indiconvision.com` isn't already on Cloudflare, add it as a site there (free plan is fine).
You only need to change your domain's nameservers to Cloudflare's — the registrar can stay
wherever it is.

### 2. Create a scoped API token

In the Cloudflare dashboard: **My Profile → API Tokens → Create Token** → use the
**"Edit zone DNS"** template, scoped to the `indiconvision.com` zone only. Copy the token.

Avoid the older "Global API Key" — the scoped token can only edit DNS for this one zone.

### 3. Point the subdomain at your Unraid box

In Cloudflare's DNS settings for `indiconvision.com`, add an **A record**:

- Name: `inventory`
- Content: your Unraid box's LAN IP (e.g. `192.168.1.50`)
- Proxy status: **DNS only** (grey cloud, not the orange "proxied" cloud) — this must resolve
  directly to your LAN IP for local devices to reach it; Cloudflare's proxy would break that.

This DNS record is public (anyone can look up that `inventory.indiconvision.com` points to a
private IP), but since it's a private/internal IP, nobody outside your LAN can actually reach it.

### 4. Configure `.env`

Set in the repo's `.env` (see `.env.example`):

```
CLOUDFLARE_ROOT_DOMAIN=indiconvision.com
APP_SUBDOMAIN=inventory
APP_HOSTNAME=inventory.indiconvision.com
LETSENCRYPT_EMAIL=you@example.com
LETSENCRYPT_STAGING=true   # keep this true until step 6 succeeds, then set to false
```

### 5. First boot — fill in the Cloudflare credentials file

Start just the swag container so it lays down its default config files:

```sh
docker compose up -d swag
```

Edit `docker/swag/config/dns-conf/cloudflare.ini` (created automatically on first boot) so it
contains only:

```
dns_cloudflare_api_token = <your scoped token from step 2>
```

(Comment out or delete the `dns_cloudflare_email` / `dns_cloudflare_api_key` lines — those are
for the older Global API Key method, which we're not using.)

Then restart:

```sh
docker compose restart swag
```

### 6. Verify, then go live

Watch the logs:

```sh
docker compose logs -f swag
```

You should see it successfully complete the DNS challenge and obtain a certificate. Since
`LETSENCRYPT_STAGING=true`, this will be a **staging** cert (browsers will still show it as
untrusted — that's expected, it's just proving the DNS-01 flow works end to end without touching
Let's Encrypt's real, rate-limited production endpoint).

Once that succeeds, set `LETSENCRYPT_STAGING=false` in `.env` and bring the whole stack up:

```sh
docker compose up -d --build
```

SWAG will request a real certificate. Browse to `https://inventory.indiconvision.com` (with
`:HTTPS_PORT` appended if you didn't map it to the default 443) from any device — no per-device
cert installation needed, and camera/barcode-scanning access will work immediately.

Renewal is automatic — SWAG checks and renews well before the 90-day Let's Encrypt expiry.

## Troubleshooting

- **Cert issuance fails / times out**: double-check the API token is scoped to the right zone and
  has DNS edit permission, and that `CLOUDFLARE_ROOT_DOMAIN` matches the zone exactly.
- **Browser can't reach the site at all**: confirm the `inventory` A record resolves to your
  Unraid LAN IP (`nslookup inventory.indiconvision.com` from a LAN device) and that
  `HTTP_PORT`/`HTTPS_PORT` aren't colliding with Unraid's own webGUI.
- **Rate limited by Let's Encrypt**: this happens if you request real (non-staging) certs
  repeatedly while debugging. Set `LETSENCRYPT_STAGING=true` again while you troubleshoot, then
  switch back once things work.
