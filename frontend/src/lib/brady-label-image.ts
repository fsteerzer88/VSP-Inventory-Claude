import { locationQrCodeUrl } from "@/api/locations";
import { productDataMatrixUrl } from "@/api/products";
import { resolveCanvasSize, resolveCssSize, type LabelSizeSettings } from "@/lib/label-size";
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

// Exported so the ZPL export path (zpl-export.ts) can fall back to the same default label
// shape/size (converted to mm) when the user hasn't set an explicit max width/height.
export const STACKED_DEFAULT_PX = { width: 600, height: 600 };
export const STACKED_ASPECT = STACKED_DEFAULT_PX.width / STACKED_DEFAULT_PX.height;

export const SIDE_BY_SIDE_DEFAULT_PX = { width: 720, height: 320 };
export const SIDE_BY_SIDE_ASPECT = SIDE_BY_SIDE_DEFAULT_PX.width / SIDE_BY_SIDE_DEFAULT_PX.height;

// Used for location labels: the code on top, text centered below. All positioning is
// proportional to the canvas's own width/height (rather than fixed pixel values) so a
// custom max width/height (see label-size.ts) scales the whole layout instead of just
// cropping it. The code image itself always stays square, sized off the smaller of the
// two dimensions, so it's never stretched even when width and height differ.
async function renderStackedLabelCanvas(
  codeImageUrl: string,
  primaryText: string,
  secondaryText: string,
  dims: { width: number; height: number },
): Promise<HTMLCanvasElement> {
  const { width, height } = dims;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const codeImage = await loadImage(codeImageUrl);
  const codeSize = Math.min(width, height) * 0.7;
  ctx.drawImage(codeImage, (width - codeSize) / 2, height * 0.04, codeSize, codeSize);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.round(height * 0.08)}px monospace`;
  ctx.fillText(primaryText, width / 2, height * 0.86, width * 0.9);

  ctx.font = `${Math.round(height * 0.047)}px sans-serif`;
  ctx.fillText(secondaryText, width / 2, height * 0.94, width * 0.9);

  return canvas;
}

// Used for product labels: a Data Matrix code prints at most ~20mm square, much smaller
// than a QR code needs to be for the same data - so a stacked layout would waste most of
// the label as blank space. Instead the code runs full-height on the left, sized to the
// label's own height, with the text in the (now much wider) remaining space to its right.
// Positioning is proportional to the canvas's own dimensions for the same reason as above.
async function renderSideBySideLabelCanvas(
  codeImageUrl: string,
  primaryText: string,
  secondaryText: string,
  dims: { width: number; height: number },
): Promise<HTMLCanvasElement> {
  const { width, height } = dims;
  const padding = height * 0.075;
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
  const textMaxWidth = Math.max(width - textX - padding, 10);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.round(height * 0.13)}px monospace`;
  ctx.fillText(primaryText, textX, height * 0.42, textMaxWidth);

  ctx.font = `${Math.round(height * 0.0875)}px sans-serif`;
  const lines = wrapText(ctx, secondaryText, textMaxWidth).slice(0, 3);
  const lineHeight = height * 0.106;
  lines.forEach((line, i) => ctx.fillText(line, textX, height * 0.42 + height * 0.144 + i * lineHeight, textMaxWidth));

  return canvas;
}

// Brady's printBitmap accepts an HTMLImageElement only (not a canvas/data URL directly),
// and itself resizes-to-fit while preserving aspect ratio - so the actual physical print
// size for direct Bluetooth printing is ultimately set by the label stock loaded in the
// printer. A configured max width/height still matters there: it sets the bitmap's own
// aspect ratio and the code's proportion relative to the text.
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

export async function renderLocationLabelImage(location: Location, settings: LabelSizeSettings): Promise<HTMLImageElement> {
  const dims = resolveCanvasSize(settings, STACKED_ASPECT, STACKED_DEFAULT_PX);
  const canvas = await renderStackedLabelCanvas(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name, dims);
  return canvasToImage(canvas);
}

export async function downloadLocationLabelImage(location: Location, filename: string, settings: LabelSizeSettings): Promise<void> {
  const dims = resolveCanvasSize(settings, STACKED_ASPECT, STACKED_DEFAULT_PX);
  const canvas = await renderStackedLabelCanvas(locationQrCodeUrl(location.id), location.fullCode ?? location.code, location.name, dims);
  return downloadCanvas(canvas, filename);
}

export async function renderProductLabelImage(product: Product, settings: LabelSizeSettings): Promise<HTMLImageElement> {
  const dims = resolveCanvasSize(settings, SIDE_BY_SIDE_ASPECT, SIDE_BY_SIDE_DEFAULT_PX);
  const canvas = await renderSideBySideLabelCanvas(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
    dims,
  );
  return canvasToImage(canvas);
}

export async function downloadProductLabelImage(product: Product, filename: string, settings: LabelSizeSettings): Promise<void> {
  const dims = resolveCanvasSize(settings, SIDE_BY_SIDE_ASPECT, SIDE_BY_SIDE_DEFAULT_PX);
  const canvas = await renderSideBySideLabelCanvas(
    productDataMatrixUrl(product.id),
    product.sku || product.partNumber || product.name,
    product.name,
    dims,
  );
  return downloadCanvas(canvas, filename);
}

export function locationLabelCssSize(settings: LabelSizeSettings) {
  return resolveCssSize(settings, STACKED_ASPECT);
}

export function productLabelCssSize(settings: LabelSizeSettings) {
  return resolveCssSize(settings, SIDE_BY_SIDE_ASPECT);
}
