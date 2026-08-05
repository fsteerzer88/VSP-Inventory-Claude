import { locationQrCodeUrl } from "@/api/locations";
import type { Location } from "@/types/models";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Brady's printBitmap accepts an HTMLImageElement only (not a canvas/data URL directly),
// and itself resizes-to-fit while preserving aspect ratio - so this doesn't need to match
// the connected printer's exact label dimensions, just render at a reasonable resolution
// with roughly the same square-ish proportions as the browser-print label.
export async function renderLocationLabelImage(location: Location): Promise<HTMLImageElement> {
  const size = 600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const qrImage = await loadImage(locationQrCodeUrl(location.id));
  const qrSize = size * 0.7;
  ctx.drawImage(qrImage, (size - qrSize) / 2, size * 0.04, qrSize, qrSize);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = "bold 48px monospace";
  ctx.fillText(location.fullCode ?? location.code, size / 2, size * 0.86);

  ctx.font = "28px sans-serif";
  ctx.fillText(location.name, size / 2, size * 0.94);

  return loadImage(canvas.toDataURL("image/png"));
}
