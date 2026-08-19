import QRCode from "qrcode";
import bwipjs from "bwip-js/node";
import { locationUrl } from "./qrcode.service";
import { productUrl } from "./datamatrix.service";

export interface ZplLabelSize {
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300;
  // Printer feeds the label stock sideways relative to the design (common on some Zebra
  // desktop printers depending on how the roll is loaded) - rotates the whole layout 90°
  // clockwise into a physical page with width/height swapped, rather than just rotating text.
  rotate: boolean;
}

// Shared query-param parsing for the /zpl bulk endpoints (locations and products) - widthMm
// and heightMm are required since ZPL needs concrete dot dimensions with no "auto" fallback
// the way the SVG/canvas paths have; the caller (frontend) is responsible for resolving a
// default before requesting this endpoint.
export function parseZplLabelSize(query: Record<string, unknown>): ZplLabelSize {
  const widthMm = Number(query.widthMm);
  const heightMm = Number(query.heightMm);
  const dpi = Number(query.dpi);
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw new Error("widthMm must be a positive number");
  if (!Number.isFinite(heightMm) || heightMm <= 0) throw new Error("heightMm must be a positive number");
  if (dpi !== 203 && dpi !== 300) throw new Error("dpi must be 203 or 300");
  const rotate = query.rotate === "1" || query.rotate === "true";
  return { widthMm, heightMm, dpi, rotate };
}

// Rotates a field's top-left origin (and switches its orientation to "R") so the whole
// label layout turns 90° clockwise into a physical page whose width/height are swapped.
// ZPL defines (x,y) for a rotated field as the top-left corner of the *rotated* footprint,
// so this is the standard image-rotation corner mapping: (x,y) -> (canvasHeight - y -
// boxHeight, x). boxHeight is the field's own unrotated height (font height for text,
// side length for the square QR/Data Matrix codes).
function rotateOrigin(x: number, y: number, boxHeight: number, canvasHeight: number): { x: number; y: number } {
  return { x: canvasHeight - y - boxHeight, y: x };
}

function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

function qrModuleCount(text: string): number {
  return QRCode.create(text, { errorCorrectionLevel: "L" }).modules.size;
}

// bwip-js's raw() returns a union type shared with 1D symbologies (bbs/bhs/sbs bar widths)
// - 2D matrix symbologies like datamatrix always yield the pixel-grid shape instead
// (pixs/pixx/pixy), which is what's needed here to compute a physical module count.
function dataMatrixModuleCount(text: string): number {
  const symbol = bwipjs.raw({ bcid: "datamatrix", text })[0];
  if (!("pixx" in symbol)) throw new Error("Unexpected Data Matrix encoding result");
  return symbol.pixx;
}

// ^ and ~ are ZPL's command/control prefixes - stripped from any user-entered text before
// it goes into a ^FD field so a product/location name can't inject ZPL commands into the
// printed stream.
function escapeZpl(text: string): string {
  return text.replace(/[\^~]/g, "");
}

// There's no ZPL primitive to measure text width ahead of printing, so this shrinks the
// font until the text is estimated to fit a known field width rather than letting ^FB
// silently truncate it. The 0.72 ratio was tuned against Zebra's built-in "0" font using
// Labelary's ZPL renderer (see zpl.service verification) - conservative on purpose, since
// truncated text is worse than slightly-smaller text.
const AVG_CHAR_WIDTH_RATIO = 0.72;
function fitFontHeight(text: string, maxWidthDots: number, desiredHeightDots: number, minHeightDots: number): number {
  const estimatedWidth = text.length * desiredHeightDots * AVG_CHAR_WIDTH_RATIO;
  if (estimatedWidth <= maxWidthDots) return desiredHeightDots;
  return Math.max(minHeightDots, Math.floor(maxWidthDots / (text.length * AVG_CHAR_WIDTH_RATIO)));
}

// Stacked layout (code on top, text below) mirroring the location Brady label - encodes the
// same short-code URL the printed QR/PNG paths use (see qrcode.service.ts).
export function buildLocationZpl(fullCode: string, name: string, size: ZplLabelSize): string {
  const { dpi, rotate } = size;
  const w = mmToDots(size.widthMm, dpi);
  const h = mmToDots(size.heightMm, dpi);
  const url = locationUrl(fullCode);
  const modules = qrModuleCount(url);

  const codeAreaWidth = Math.round(w * 0.78);
  // ^BQ's magnification factor (1-10) isn't formally documented as a dots-per-module
  // value, but behaves that way in practice and is the standard approximation used by ZPL
  // tooling - verified against Labelary's renderer during development.
  const dotsPerModule = Math.max(1, Math.min(10, Math.round(codeAreaWidth / modules)));
  const qrSize = dotsPerModule * modules;
  const qrX = Math.round((w - qrSize) / 2);
  const qrY = Math.round(h * 0.04);
  // ^BQ prints its own quiet zone beyond modules*dotsPerModule - padding the text position
  // by less than this visibly overlapped the code in testing.
  const qrFootprint = Math.round(qrSize * 1.35);

  const textX = Math.round(w * 0.05);
  const textMaxWidth = w - textX * 2;
  const textY1 = qrY + qrFootprint;
  const fontH1 = fitFontHeight(fullCode, textMaxWidth, Math.round(w * 0.16), 10);
  const textY2 = textY1 + fontH1 + Math.round(h * 0.02);
  const fontH2 = fitFontHeight(name, textMaxWidth, Math.round(w * 0.09), 8);

  const orient = rotate ? "R" : "N";
  const qr = rotate ? rotateOrigin(qrX, qrY, qrSize, h) : { x: qrX, y: qrY };
  const t1 = rotate ? rotateOrigin(textX, textY1, fontH1, h) : { x: textX, y: textY1 };
  const t2 = rotate ? rotateOrigin(textX, textY2, fontH2, h) : { x: textX, y: textY2 };

  return [
    "^XA",
    "^CI28",
    `^PW${rotate ? h : w}`,
    `^LL${rotate ? w : h}`,
    `^FO${qr.x},${qr.y}^BQ${orient},2,${dotsPerModule}^FDQA,${url}^FS`,
    `^FO${t1.x},${t1.y}^A0${orient},${fontH1},${fontH1}^FB${textMaxWidth},1,0,C^FD${escapeZpl(fullCode)}^FS`,
    `^FO${t2.x},${t2.y}^A0${orient},${fontH2},${fontH2}^FB${textMaxWidth},1,0,C^FD${escapeZpl(name)}^FS`,
    "^XZ",
  ].join("\n");
}

// Side-by-side layout (code full-height on the left, text to the right) mirroring the
// product Brady label.
export function buildProductZpl(productId: string, sku: string, name: string, size: ZplLabelSize): string {
  const { dpi, rotate } = size;
  const w = mmToDots(size.widthMm, dpi);
  const h = mmToDots(size.heightMm, dpi);
  const url = productUrl(productId);
  const modules = dataMatrixModuleCount(url);

  const codeAreaHeight = Math.round(h * 0.82);
  const dotsPerModule = Math.max(1, Math.round(codeAreaHeight / modules));
  const dmSize = dotsPerModule * modules;
  const dmX = Math.round(h * 0.09);
  const dmY = Math.round((h - dmSize) / 2);

  const textX = dmX + dmSize + Math.round(h * 0.12);
  const textMaxWidth = Math.max(w - textX - Math.round(h * 0.06), 20);
  const textY1 = Math.round(h * 0.28);
  const fontH1 = fitFontHeight(sku, textMaxWidth, Math.round(h * 0.22), 10);
  const textY2 = textY1 + fontH1 + Math.round(h * 0.06);
  const fontH2 = fitFontHeight(name, textMaxWidth, Math.round(h * 0.13), 8);
  // ^FB below allows the name to wrap across 2 lines - approximate the block's total
  // rendered height as 2 line heights (no extra inter-line spacing is requested via ^FB)
  // so the rotated field origin doesn't drift off the label.
  const nameBlockHeight = fontH2 * 2;

  const orient = rotate ? "R" : "N";
  const dm = rotate ? rotateOrigin(dmX, dmY, dmSize, h) : { x: dmX, y: dmY };
  const t1 = rotate ? rotateOrigin(textX, textY1, fontH1, h) : { x: textX, y: textY1 };
  const t2 = rotate ? rotateOrigin(textX, textY2, nameBlockHeight, h) : { x: textX, y: textY2 };

  return [
    "^XA",
    "^CI28",
    `^PW${rotate ? h : w}`,
    `^LL${rotate ? w : h}`,
    `^FO${dm.x},${dm.y}^BX${orient},${dotsPerModule},200^FD${url}^FS`,
    `^FO${t1.x},${t1.y}^A0${orient},${fontH1},${fontH1}^FB${textMaxWidth},1,0,L^FD${escapeZpl(sku)}^FS`,
    `^FO${t2.x},${t2.y}^A0${orient},${fontH2},${fontH2}^FB${textMaxWidth},2,0,L^FD${escapeZpl(name)}^FS`,
    "^XZ",
  ].join("\n");
}
