import QRCode from "qrcode";
import { env } from "../config/env";

// Encodes the location's fullCode (e.g. "CR01-01") rather than its id - a full UUID would
// force a much denser QR code, which stops being reliably scannable at the small physical
// sizes labels get printed at. /l/:code is resolved client-side via the existing
// /locations/lookup endpoint (see LocationShortLinkPage.tsx).
export function locationUrl(fullCode: string): string {
  return `${env.publicBaseUrl}/l/${encodeURIComponent(fullCode)}`;
}

export async function generateLocationQrSvg(fullCode: string): Promise<string> {
  return QRCode.toString(locationUrl(fullCode), {
    type: "svg",
    // "L" keeps the module count as low as practical for small printed labels (less
    // redundancy than the default, but still standard-compliant and fine for a printed
    // shelf label that isn't going to get scuffed like a shipping label would).
    errorCorrectionLevel: "L",
    margin: 1,
  });
}
