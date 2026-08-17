import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { locationQrCodeUrl } from "@/api/locations";
import { Button } from "@/components/ui/button";
import { BradyPrinterPanel } from "@/components/printing/BradyPrinterPanel";
import { LabelSizeSettings } from "@/components/printing/LabelSizeSettings";
import { renderLocationLabelImage, downloadLocationLabelImage, locationLabelCssSize } from "@/lib/brady-label-image";
import { useLabelSizeSettings } from "@/lib/label-size";
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
  const cssSize = locationLabelCssSize(labelSize);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["locations", "detail", id],
      queryFn: () => api.get<Location>(`/locations/${id}`),
    })),
  });

  const locations = results.map((r) => r.data).filter((l): l is Location => !!l);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Print labels</h1>
        <Button onClick={() => window.print()} disabled={locations.length === 0}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
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
        {locations.map((location) => (
          <div
            key={location.id}
            className="flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border p-3 text-center print:break-inside-avoid print:border-black"
            style={cssSize ?? undefined}
          >
            <img
              src={locationQrCodeUrl(location.id)}
              alt={`QR code for ${location.name}`}
              className={cssSize ? "max-h-full max-w-full object-contain" : "h-24 w-24"}
            />
            <p className="font-mono text-base font-bold leading-tight print:text-black">
              {location.fullCode ?? location.code}
            </p>
            <p className="text-xs text-muted-foreground print:text-black">
              {includeParentNames ? buildFullName(location) : location.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
