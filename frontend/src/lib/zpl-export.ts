import { STACKED_ASPECT, STACKED_DEFAULT_PX, SIDE_BY_SIDE_ASPECT, SIDE_BY_SIDE_DEFAULT_PX } from "@/lib/brady-label-image";
import { resolveDimensionsMmOrDefault, type LabelSizeSettings } from "@/lib/label-size";
import type { Location, Product } from "@/types/models";

// Fetches rather than a plain <a href> navigation, since an error response (e.g. an invalid
// id list) has no Content-Disposition and would otherwise navigate the whole SPA away to
// show raw JSON - mirrors the client's own error-message extraction (see api/client.ts).
async function downloadZpl(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function zplQuery(ids: string[], dims: { widthMm: number; heightMm: number }, dpi: number): string {
  return new URLSearchParams({
    ids: ids.join(","),
    widthMm: String(dims.widthMm),
    heightMm: String(dims.heightMm),
    dpi: String(dpi),
  }).toString();
}

export async function downloadLocationsZpl(locations: Location[], settings: LabelSizeSettings): Promise<void> {
  const dims = resolveDimensionsMmOrDefault(settings, STACKED_ASPECT, STACKED_DEFAULT_PX);
  const query = zplQuery(locations.map((l) => l.id), dims, settings.zplDpi);
  await downloadZpl(`/api/locations/zpl?${query}`, "location-labels.zpl");
}

export async function downloadProductsZpl(products: Product[], settings: LabelSizeSettings): Promise<void> {
  const dims = resolveDimensionsMmOrDefault(settings, SIDE_BY_SIDE_ASPECT, SIDE_BY_SIDE_DEFAULT_PX);
  const query = zplQuery(products.map((p) => p.id), dims, settings.zplDpi);
  await downloadZpl(`/api/products/zpl?${query}`, "product-labels.zpl");
}
