#!/bin/sh
set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "No TLS certificate found at $CERT_DIR - generating a temporary self-signed cert."
  echo "Camera/barcode scanning will NOT work over the LAN until you replace this with a"
  echo "real mkcert certificate (see README for the one-time LAN HTTPS setup)."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" \
    -subj "/CN=inventory.local" >/dev/null 2>&1
fi
