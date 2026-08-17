import QRCode from "qrcode";
import { env } from "../config/env";

export function locationUrl(locationId: string): string {
  return `${env.publicBaseUrl}/locations/${locationId}`;
}

export async function generateLocationQrSvg(locationId: string): Promise<string> {
  return QRCode.toString(locationUrl(locationId), {
    type: "svg",
    // Location URLs embed a full UUID, which already pushes the module count up for a
    // printed label - "L" trims it further (less redundancy, but still standard-compliant
    // and fine for a printed shelf label that isn't going to get scuffed like a shipping
    // label would).
    errorCorrectionLevel: "L",
    margin: 1,
  });
}
