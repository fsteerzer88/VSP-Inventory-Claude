import QRCode from "qrcode";
import { env } from "../config/env";

export function locationUrl(locationId: string): string {
  return `${env.publicBaseUrl}/locations/${locationId}`;
}

export async function generateLocationQrSvg(locationId: string): Promise<string> {
  return QRCode.toString(locationUrl(locationId), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
  });
}
