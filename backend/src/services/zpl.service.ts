import QRCode from "qrcode";
import bwipjs from "bwip-js/node";
import { locationUrl } from "./qrcode.service";
import { productUrl } from "./datamatrix.service";

export interface ZplLabelSize {
  widthMm: number;
  heightMm: number;
  dpi: 203 | 300;
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
  return { widthMm, heightMm, dpi };
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
  const { dpi } = size;
  const w = mmToDots(size.widthMm, dpi);
  const h = mmToDots(size.heightMm, dpi);
  const url = locationUrl(fullCode);
  const modules = qrModuleCount(url);

  const codeAreaWidth = Math.round(w * 0.78);
  // ^BQ's magnification factor (1-10) isn't formally documented as a dots-per-module
  // value, but behaves that way in practice and is the standard approximation used by ZPL
  // tooling - verified against Labelary's renderer during development.
  const dotsPerModule = Math.max(1, Math.min(10, Math.round(codeAreaWidth / modules)));
  const qrX = Math.round((w - dotsPerModule * modules) / 2);
  const qrY = Math.round(h * 0.04);
  // ^BQ prints its own quiet zone beyond modules*dotsPerModule - padding the text position
  // by less than this visibly overlapped the code in testing.
  const qrFootprint = Math.round(dotsPerModule * modules * 1.35);

  const textX = Math.round(w * 0.05);
  const textMaxWidth = w - textX * 2;
  const textY1 = qrY + qrFootprint;
  const fontH1 = fitFontHeight(fullCode, textMaxWidth, Math.round(w * 0.16), 10);
  const textY2 = textY1 + fontH1 + Math.round(h * 0.02);
  const fontH2 = fitFontHeight(name, textMaxWidth, Math.round(w * 0.09), 8);

  return [
    "^XA",
    "^CI28",
    `^PW${w}`,
    `^LL${h}`,
    `^FO${qrX},${qrY}^BQN,2,${dotsPerModule}^FDQA,${url}^FS`,
    `^FO${textX},${textY1}^A0N,${fontH1},${fontH1}^FB${textMaxWidth},1,0,C^FD${escapeZpl(fullCode)}^FS`,
    `^FO${textX},${textY2}^A0N,${fontH2},${fontH2}^FB${textMaxWidth},1,0,C^FD${escapeZpl(name)}^FS`,
    "^XZ",
  ].join("\n");
}

// Side-by-side layout (code full-height on the left, text to the right) mirroring the
// product Brady label.
export function buildProductZpl(productId: string, sku: string, name: string, size: ZplLabelSize): string {
  const { dpi } = size;
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

  return [
    "^XA",
    "^CI28",
    `^PW${w}`,
    `^LL${h}`,
    `^FO${dmX},${dmY}^BXN,${dotsPerModule},200^FD${url}^FS`,
    `^FO${textX},${textY1}^A0N,${fontH1},${fontH1}^FB${textMaxWidth},1,0,L^FD${escapeZpl(sku)}^FS`,
    `^FO${textX},${textY2}^A0N,${fontH2},${fontH2}^FB${textMaxWidth},2,0,L^FD${escapeZpl(name)}^FS`,
    "^XZ",
  ].join("\n");
}
