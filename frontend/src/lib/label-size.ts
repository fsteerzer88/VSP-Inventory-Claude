import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

export type LabelUnit = "mm" | "in";
export type ZplDpi = 203 | 300;

export interface LabelSizeSettings {
  unit: LabelUnit;
  maxWidthMm: number | null;
  maxHeightMm: number | null;
  // Only used for ZPL export (Zebra printers) - the Brady/PNG/browser-print paths don't
  // need a printer resolution, they render through the browser's own canvas/CSS engine.
  zplDpi: ZplDpi;
  // Rotates the ZPL layout 90° clockwise (and swaps the physical ^PW/^LL dimensions) for
  // printers whose loaded label stock feeds the design sideways.
  zplRotate: boolean;
}

const STORAGE_KEY = "vsp.labelSize.v1";
const MM_PER_INCH = 25.4;
// Resolution used to turn a physical max width/height into bitmap pixels for Brady/PNG
// output - independent of screen DPI, just a reasonable print-quality target.
const PRINT_DPI = 300;

const DEFAULT_SETTINGS: LabelSizeSettings = {
  unit: "mm",
  maxWidthMm: null,
  maxHeightMm: null,
  zplDpi: 203,
  zplRotate: false,
};

export function mmToIn(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

// Shared across the location and product print pages (both stored under one key) since
// this is really about what label stock/printer the user has loaded, not which entity
// they're printing.
export function useLabelSizeSettings() {
  const [settings, setSettings] = useState<LabelSizeSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}

// If only one of max width/height is set, the other side is derived from the layout's
// natural (unconstrained) aspect ratio so the label keeps a sensible shape. Returns null
// when neither bound is set, so callers can fall back to their own default size (exported
// for the ZPL export path, which needs concrete mm dimensions with no "auto" option).
export function resolveLabelDimensionsMm(
  settings: LabelSizeSettings,
  naturalAspect: number,
): { widthMm: number; heightMm: number } | null {
  const { maxWidthMm, maxHeightMm } = settings;
  if (maxWidthMm == null && maxHeightMm == null) return null;
  if (maxWidthMm != null && maxHeightMm != null) return { widthMm: maxWidthMm, heightMm: maxHeightMm };
  if (maxWidthMm != null) return { widthMm: maxWidthMm, heightMm: maxWidthMm / naturalAspect };
  return { widthMm: maxHeightMm! * naturalAspect, heightMm: maxHeightMm! };
}

export function resolveCanvasSize(
  settings: LabelSizeSettings,
  naturalAspect: number,
  defaultPx: { width: number; height: number },
): { width: number; height: number } {
  const resolved = resolveLabelDimensionsMm(settings, naturalAspect);
  if (!resolved) return defaultPx;
  return {
    width: Math.round((resolved.widthMm / MM_PER_INCH) * PRINT_DPI),
    height: Math.round((resolved.heightMm / MM_PER_INCH) * PRINT_DPI),
  };
}

// "mm" is a real physical CSS length unit, so this drives the actual printed size of the
// on-screen/browser-print preview directly - no DPI conversion needed the way the
// canvas/bitmap path requires.
export function resolveCssSize(settings: LabelSizeSettings, naturalAspect: number): { width: string; height: string } | null {
  const resolved = resolveLabelDimensionsMm(settings, naturalAspect);
  if (!resolved) return null;
  return { width: `${resolved.widthMm}mm`, height: `${resolved.heightMm}mm` };
}

// Mirrors the ZPL export's rotation (see zpl.service.ts) for the browser-print/on-screen
// preview path, which has no printer resolution or field coordinates to transform - just an
// outer box sized to the swapped (rotated) footprint, with the original-size content
// centered and rotated 90° inside it. Centering before rotating means a W×H box always
// exactly fills its rotated H×W parent with no manual offset math. Returns null when no
// explicit label size is set (nothing to swap) or rotation isn't enabled, so callers can
// fall back to rendering the label unrotated.
export function rotateCssBoxStyles(
  cssSize: { width: string; height: string } | null,
  rotate: boolean,
): { outer: CSSProperties; inner: CSSProperties } | null {
  if (!rotate || !cssSize) return null;
  return {
    outer: { position: "relative", width: cssSize.height, height: cssSize.width },
    inner: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: cssSize.width,
      height: cssSize.height,
      transform: "translate(-50%, -50%) rotate(90deg)",
    },
  };
}

// ZPL needs concrete mm dimensions with no "auto" option (unlike the canvas/CSS paths,
// which can fall back to a pixel default) - so when neither max width/height is set, this
// derives an equivalent physical size from the same defaultPx used for the PNG/Brady output
// (see brady-label-image.ts), keeping the ZPL default in step with the other print paths
// rather than picking an unrelated constant.
export function resolveDimensionsMmOrDefault(
  settings: LabelSizeSettings,
  naturalAspect: number,
  defaultPx: { width: number; height: number },
): { widthMm: number; heightMm: number } {
  const resolved = resolveLabelDimensionsMm(settings, naturalAspect);
  if (resolved) return resolved;
  return {
    widthMm: (defaultPx.width / PRINT_DPI) * MM_PER_INCH,
    heightMm: (defaultPx.height / PRINT_DPI) * MM_PER_INCH,
  };
}
