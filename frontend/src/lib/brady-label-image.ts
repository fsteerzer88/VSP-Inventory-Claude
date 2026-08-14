import { locationQrCodeUrl } from "@/api/locations";
import { productDataMatrixUrl } from "@/api/products";
import type { Location, Product } from "@/types/models";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function renderLabelCanvas(codeImageUrl: string, primaryText: string, secondaryText: string): Promise<HTMLCanvasElement> {
  const size = 600;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const codeImage = await loadImage(codeImageUrl);
  const codeSize = size * 0.7;
  ctx.drawImage(codeImage, (size - codeSize) / 2, size * 0.04, codeSize, codeSize);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = "bold 48px monospace";
  ctx.fillText(primaryText, size / 2, size * 0.86);

  ctx.font = "28px sans-serif";
  ctx.fillText(secondaryText, size / 2, size * 0.94);

  return canvas;
}

// Brady's printBitmap accepts an HTMLImageElement only (not a canvas/data URL directly),
// and itself resizes-to-fit while preserving aspect ratio - so this doesn't need to match
// the connected printer's exact label dimensions, just render at a reasonable resolution
// with roughly the same square-ish proportions as the browser-print label.
async function renderLabelImage(codeImageUrl: string, primaryText: string, secondaryText: string): Promise<HTMLImageElement> {
  const canvas = await renderLabelCanvas(codeImageUrl, primaryText, secondaryText);
  return loadImage(canvas.toDataURL("image/png"));
}

// Triggers a real file download of the label as a PNG, so it can be sent to someone with
// physical access to a Brady printer (via Brady's own software, or this app on their own
// device). Deliberately uses a Blob + object URL rather than a data: URL for the anchor's
// href - Chrome silently drops data: URL downloads triggered via a synthetic anchor click
// in some versions/contexts, while Blob URLs are the standard, reliable mechanism for
// programmatic downloads.
async function downloadLabelImage(
  codeImageUrl: string,
  primaryText: string,
  secondaryText: string,
  filename: string,
): Promise<void> {
  const canvas = await renderLabelCanvas(codeImageUrl, primaryText, secondaryText);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not generate the label image");

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function renderLocationLabelImage(location: Location): Promise<HTMLImageElement> {
  return renderLabelImage(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name);
}

export function downloadLocationLabelImage(location: Location, filename: string): Promise<void> {
  return downloadLabelImage(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name, filename);
}

export function renderProductLabelImage(product: Product): Promise<HTMLImageElement> {
  return renderLabelImage(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
  );
}

export function downloadProductLabelImage(product: Product, filename: string): Promise<void> {
  return downloadLabelImage(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
    filename,
  );
}
