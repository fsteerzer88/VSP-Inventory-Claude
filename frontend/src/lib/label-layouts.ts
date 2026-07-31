export type LabelLayoutMode = "sheet" | "single";

export interface LabelLayout {
  id: string;
  name: string;
  description?: string;
  mode: LabelLayoutMode;
  labelWidthIn: number;
  labelHeightIn: number;
  // Sheet mode only - ignored in single mode. (Rows per sheet isn't stored separately -
  // it falls out of pageHeightIn/labelHeightIn/rowGapIn and the browser's own print
  // pagination, so there's nothing else to configure there.)
  columns: number;
  pageWidthIn: number;
  pageHeightIn: number;
  marginTopIn: number;
  marginLeftIn: number;
  columnGapIn: number;
  rowGapIn: number;
}

export const CUSTOM_LAYOUT_ID = "custom";

// Dimensions verified against manufacturer/reseller listings, not guessed:
// - Avery 5160: 1" x 2-5/8" label, 3 columns x 10 rows, US Letter, 0.5" top margin,
//   0.1875" side margin, 0.125" horizontal gap, 0" vertical gap (rows touch).
// - Brady B30EP-177-593-WT: 3" x 2.5" raised panel label. These are dispensed one at a
//   time from a Brady B30-series printer (not a sheet), so "single label per page" mode
//   with the page size set to the label itself is the correct layout, not a grid.
export const BUILT_IN_LABEL_LAYOUTS: LabelLayout[] = [
  {
    id: "avery-5160",
    name: "Avery 5160 (30/sheet)",
    description: '1" x 2-5/8" address labels, 3 across x 10 down, US Letter',
    mode: "sheet",
    labelWidthIn: 2.625,
    labelHeightIn: 1,
    columns: 3,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    marginTopIn: 0.5,
    marginLeftIn: 0.1875,
    columnGapIn: 0.125,
    rowGapIn: 0,
  },
  {
    id: "brady-b30ep-177-593-wt",
    name: "Brady B30EP-177-593-WT",
    description: 'Raised panel label, 3" x 2.5" - one label per page (Brady B30-series printers)',
    mode: "single",
    labelWidthIn: 3,
    labelHeightIn: 2.5,
    columns: 1,
    pageWidthIn: 3,
    pageHeightIn: 2.5,
    marginTopIn: 0,
    marginLeftIn: 0,
    columnGapIn: 0,
    rowGapIn: 0,
  },
];

const STORAGE_KEY = "vsp-inventory:label-layout";

export function loadStoredLayout(): LabelLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LabelLayout;
  } catch {
    // Malformed JSON or localStorage unavailable (e.g. private browsing) - fall back below.
  }
  return BUILT_IN_LABEL_LAYOUTS[0];
}

export function saveStoredLayout(layout: LabelLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Best-effort only.
  }
}
