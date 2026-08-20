import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { locationQrCodeUrl } from "@/api/locations";
import { Button } from "@/components/ui/button";
import { BradyPrinterPanel } from "@/components/printing/BradyPrinterPanel";
import { LabelSizeSettings } from "@/components/printing/LabelSizeSettings";
import { ZplExportButton } from "@/components/printing/ZplExportButton";
import {
  renderLocationLabelImage,
  downloadLocationLabelImage,
  STACKED_ASPECT,
  SIDE_BY_SIDE_ASPECT,
} from "@/lib/brady-label-image";
import {
  labelPageSizeCss,
  resolveCssSize,
  resolveLabelDimensionsMm,
  resolveSideBySideContentSizesMm,
  resolveStackedContentSizesMm,
  rotateCssBoxStyles,
  useLabelSizeSettings,
} from "@/lib/label-size";
import { downloadLocationsZpl } from "@/lib/zpl-export";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/models";
import { Printer } from "lucide-react";

function labelFilename(location: Location): string {
  const safe = (location.fullCode ?? location.code).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `location-${safe}.png`;
}

// Walks the same nested parentLocation chain the backend already returns (used there to
// build fullCode from each level's `code`) but joins `name` instead, so a label can read
// e.g. "Lev Rack-Shelf 1" instead of just "Shelf 1".
function buildFullName(location: Location): string {
  const names: string[] = [];
  let current: Location | null | undefined = location;
  while (current) {
    names.unshift(current.name);
    current = current.parentLocation;
  }
  return names.join("-");
}

export function LocationPrintPage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const [includeParentNames, setIncludeParentNames] = useState(false);
  const [labelSize, setLabelSize] = useLabelSizeSettings();
  const isRow = labelSize.locationTextPosition !== "bottom";
  const textFirst = labelSize.locationTextPosition === "left";
  const aspect = isRow ? SIDE_BY_SIDE_ASPECT : STACKED_ASPECT;
  const cssSize = resolveCssSize(labelSize, aspect);
  const rotated = rotateCssBoxStyles(cssSize, labelSize.zplRotate);
  const pageSizeCss = labelPageSizeCss(cssSize, labelSize.zplRotate);
  const dimsMm = resolveLabelDimensionsMm(labelSize, aspect);
  const contentSizes = dimsMm
    ? (isRow ? resolveSideBySideContentSizesMm(dimsMm, labelSize) : resolveStackedContentSizesMm(dimsMm, labelSize))
    : null;
  const alignClass = isRow
    ? { start: "justify-start", center: "justify-center", end: "justify-end" }[labelSize.locationContentAlign]
    : { start: "items-start", center: "items-center", end: "items-end" }[labelSize.locationContentAlign];

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["locations", "detail", id],
      queryFn: () => api.get<Location>(`/locations/${id}`),
    })),
  });

  const locations = results.map((r) => r.data).filter((l): l is Location => !!l);

  return (
    <div className="flex flex-col gap-4">
      {pageSizeCss && <style>{pageSizeCss}</style>}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Print labels</h1>
        <div className="flex items-center gap-2">
          <ZplExportButton
            disabled={locations.length === 0}
            onDownload={() => downloadLocationsZpl(locations, labelSize)}
          />
          <Button onClick={() => window.print()} disabled={locations.length === 0}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm print:hidden">
        <input
          type="checkbox"
          checked={includeParentNames}
          onChange={(e) => setIncludeParentNames(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Include parent location name(s) before this location's name (e.g. "Lev Rack-Shelf 1")
      </label>

      {ids.length === 0 && <p className="text-sm text-muted-foreground print:hidden">No locations selected.</p>}

      <LabelSizeSettings value={labelSize} onChange={setLabelSize} />

      <BradyPrinterPanel
        items={locations}
        itemName={(location) => location.name}
        renderLabelImage={(location) => renderLocationLabelImage(location, labelSize)}
        downloadLabelImage={(location, filename) => downloadLocationLabelImage(location, filename, labelSize)}
        labelFilename={labelFilename}
      />

      <div className={cssSize ? "flex flex-wrap gap-4 print:gap-2" : "grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2"}>
        {locations.map((location) => {
          const codeEl = (
            <img
              key="code"
              src={locationQrCodeUrl(location.id)}
              alt={`QR code for ${location.name}`}
              className={contentSizes ? "shrink-0 object-contain" : "h-24 w-24 shrink-0"}
              style={{
                ...(contentSizes ? { width: `${contentSizes.codeSizeMm}mm`, height: `${contentSizes.codeSizeMm}mm` } : undefined),
                ...(labelSize.locationQrRotationDeg ? { transform: `rotate(${labelSize.locationQrRotationDeg}deg)` } : undefined),
              }}
            />
          );
          const textEl = (
            <div
              key="text"
              className={cn("flex flex-col", isRow ? "min-w-0 text-left" : "items-center text-center")}
              style={labelSize.locationTextRotationDeg ? { transform: `rotate(${labelSize.locationTextRotationDeg}deg)` } : undefined}
            >
              <p
                className="font-mono text-base font-bold leading-tight print:text-black"
                style={contentSizes ? { fontSize: `${contentSizes.primaryFontMm}mm` } : undefined}
              >
                {location.fullCode ?? location.code}
              </p>
              <p
                className="text-xs text-muted-foreground print:text-black"
                style={contentSizes ? { fontSize: `${contentSizes.secondaryFontMm}mm` } : undefined}
              >
                {includeParentNames ? buildFullName(location) : location.name}
              </p>
            </div>
          );

          const card = (
            <div
              className={cn(
                "flex overflow-hidden rounded-md border border-border print:break-inside-avoid print:border-black",
                isRow ? cn("flex-row items-center gap-3", alignClass) : cn("flex-col gap-1", alignClass),
                cssSize ? "p-1" : "p-3",
              )}
              style={rotated ? rotated.inner : (cssSize ?? undefined)}
            >
              {isRow && textFirst ? [textEl, codeEl] : [codeEl, textEl]}
            </div>
          );

          if (!rotated) return <div key={location.id}>{card}</div>;
          return (
            <div key={location.id} className="print:break-inside-avoid" style={rotated.outer}>
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
