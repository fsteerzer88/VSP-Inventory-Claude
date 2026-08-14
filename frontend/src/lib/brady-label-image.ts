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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Used for location labels: a square label with the (larger) QR code on top and text
// centered below it.
async function renderSquareLabelCanvas(codeImageUrl: string, primaryText: string, secondaryText: string): Promise<HTMLCanvasElement> {
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

// Used for product labels: a Data Matrix code prints at most ~20mm square, much smaller
// than a QR code needs to be for the same data - so a square layout would waste most of
// the label as blank space. Instead the code runs full-height on the left, sized to the
// label's own height, with the text in the (now much wider) remaining space to its right.
async function renderLandscapeLabelCanvas(codeImageUrl: string, primaryText: string, secondaryText: string): Promise<HTMLCanvasElement> {
  const height = 320;
  const width = 720;
  const padding = 24;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const codeImage = await loadImage(codeImageUrl);
  const codeSize = height - padding * 2;
  ctx.drawImage(codeImage, padding, padding, codeSize, codeSize);

  const textX = padding + codeSize + padding;
  const textMaxWidth = width - textX - padding;

  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.font = "bold 42px monospace";
  ctx.fillText(primaryText, textX, height * 0.42, textMaxWidth);

  ctx.font = "28px sans-serif";
  const lines = wrapText(ctx, secondaryText, textMaxWidth).slice(0, 3);
  const lineHeight = 34;
  lines.forEach((line, i) => ctx.fillText(line, textX, height * 0.42 + 46 + i * lineHeight, textMaxWidth));

  return canvas;
}

// Brady's printBitmap accepts an HTMLImageElement only (not a canvas/data URL directly),
// and itself resizes-to-fit while preserving aspect ratio - so these don't need to match
// the connected printer's exact label dimensions, just render at a reasonable resolution
// with roughly the same proportions as the browser-print label.
function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return loadImage(canvas.toDataURL("image/png"));
}

// Triggers a real file download of the label as a PNG, so it can be sent to someone with
// physical access to a Brady printer (via Brady's own software, or this app on their own
// device). Deliberately uses a Blob + object URL rather than a data: URL for the anchor's
// href - Chrome silently drops data: URL downloads triggered via a synthetic anchor click
// in some versions/contexts, while Blob URLs are the standard, reliable mechanism for
// programmatic downloads.
async function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
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

export async function renderLocationLabelImage(location: Location): Promise<HTMLImageElement> {
  const canvas = await renderSquareLabelCanvas(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name);
  return canvasToImage(canvas);
}

export async function downloadLocationLabelImage(location: Location, filename: string): Promise<void> {
  const canvas = await renderSquareLabelCanvas(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name);
  return downloadCanvas(canvas, filename);
}

export async function renderProductLabelImage(product: Product): Promise<HTMLImageElement> {
  const canvas = await renderLandscapeLabelCanvas(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
  );
  return canvasToImage(canvas);
}

export async function downloadProductLabelImage(product: Product, filename: string): Promise<void> {
  const canvas = await renderLandscapeLabelCanvas(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
  );
  return downloadCanvas(canvas, filename);
}
