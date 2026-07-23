# LAN HTTPS setup (required for barcode scanning / camera access)

Browsers only allow camera access (`getUserMedia`) on secure contexts: `https://`, or `http://localhost`.
A phone hitting the Unraid box by plain IP over HTTP will **not** be able to scan barcodes or take
photos. This is a one-time setup per device.

Until you complete this setup, `docker compose up` still works — the reverse-proxy container
generates a temporary self-signed certificate automatically so the stack comes up — but browsers
will show a security warning and camera access will be blocked until you install a trusted cert.

## 1. Pick a stable LAN hostname

Pick something like `inventory.lan`. Point it at your Unraid box's LAN IP via your router's local
DNS, Unraid's own DNS settings, or a per-device hosts-file entry. A stable hostname survives DHCP
IP changes; mkcert works with an IP too, but a hostname is easier to manage across devices.

## 2. Generate a certificate with mkcert

On a workstation (install [mkcert](https://github.com/FiloSottile/mkcert) first):

```sh
mkcert -install
mkcert inventory.lan 192.168.1.50   # replace with your hostname + Unraid LAN IP
```

This produces two files, e.g. `inventory.lan+1.pem` and `inventory.lan+1-key.pem`. Rename/copy them
into this repo as:

```
docker/reverse-proxy/certs/cert.pem
docker/reverse-proxy/certs/key.pem
```

Restart the `reverse-proxy` container (`docker compose restart reverse-proxy`) to pick them up.

## 3. Trust mkcert's root CA on every scanning device

`mkcert -install` creates a local certificate authority. Every phone/tablet/desktop that will use
the scanner needs to trust that CA once:

1. Find the root CA file: run `mkcert -CAROOT` on the workstation where you ran `mkcert -install` —
   it prints a folder containing `rootCA.pem`.
2. Get `rootCA.pem` onto the device (AirDrop, email, USB, or a temporary file share).
3. **iOS**: open the file → Settings will prompt to install a profile → after installing, go to
   Settings → General → About → Certificate Trust Settings → enable full trust for the new CA.
4. **Android**: Settings → Security → Encryption & credentials → Install a certificate → CA
   certificate → select the file.
5. **Desktop (Windows/macOS/Linux)**: import `rootCA.pem` into the OS or browser certificate store
   (mkcert does this automatically if you run `mkcert -install` on that machine directly).

## 4. Verify

Browse to `https://inventory.lan` from the device. The padlock should show a trusted connection
(no warning). On the app's home page, use the "Test camera access" button — it should prompt for
camera permission and show a live preview.

**This is the highest-risk unknown in the whole project** — validate it on a real phone before
relying on any scanning feature.
