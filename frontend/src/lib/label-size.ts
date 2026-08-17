import { useEffect, useState } from "react";

export type LabelUnit = "mm" | "in";

export interface LabelSizeSettings {
  unit: LabelUnit;
  maxWidthMm: number | null;
  maxHeightMm: number | null;
}

const STORAGE_KEY = "vsp.labelSize.v1";
const MM_PER_INCH = 25.4;
// Resolution used to turn a physical max width/height into bitmap pixels for Brady/PNG
// output - independent of screen DPI, just a reasonable print-quality target.
const PRINT_DPI = 300;

const DEFAULT_SETTINGS: LabelSizeSettings = { unit: "mm", maxWidthMm: null, maxHeightMm: null };

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
// when neither bound is set, so callers can fall back to their own default size.
function resolveDimensionsMm(
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
  const resolved = resolveDimensionsMm(settings, naturalAspect);
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
  const resolved = resolveDimensionsMm(settings, naturalAspect);
  if (!resolved) return null;
  return { width: `${resolved.widthMm}mm`, height: `${resolved.heightMm}mm` };
}
