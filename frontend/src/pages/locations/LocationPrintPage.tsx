import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { locationQrCodeUrl } from "@/api/locations";
import { Button } from "@/components/ui/button";
import { LabelLayoutSettings } from "@/components/locations/LabelLayoutSettings";
import { loadStoredLayout, saveStoredLayout, type LabelLayout } from "@/lib/label-layouts";
import type { Location } from "@/types/models";
import { Printer } from "lucide-react";

function Label({ location, layout, breakAfter }: { location: Location; layout: LabelLayout; breakAfter?: boolean }) {
  // Scale the QR code to the smaller of the label's two dimensions so it fits
  // comfortably on anything from a 1"-tall Avery row to a 3"x2.5" Brady panel.
  const qrSizeIn = Math.max(0.4, Math.min(layout.labelWidthIn, layout.labelHeightIn) * 0.55);

  return (
    <div
      style={{
        width: `${layout.labelWidthIn}in`,
        height: `${layout.labelHeightIn}in`,
        breakAfter: breakAfter ? "page" : "auto",
      }}
      className="flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-border p-1 text-center [break-inside:avoid] print:border-0"
    >
      <img
        src={locationQrCodeUrl(location.id)}
        alt={`QR code for ${location.name}`}
        style={{ width: `${qrSizeIn}in`, height: `${qrSizeIn}in` }}
      />
      <p className="font-mono text-base font-bold leading-tight print:text-black">
        {location.fullCode ?? location.code}
      </p>
      <p className="text-xs text-muted-foreground print:text-black">{location.name}</p>
    </div>
  );
}

export function LocationPrintPage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const [layout, setLayout] = useState<LabelLayout>(loadStoredLayout);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["locations", "detail", id],
      queryFn: () => api.get<Location>(`/locations/${id}`),
    })),
  });

  const locations = results.map((r) => r.data).filter((l): l is Location => !!l);

  function handleLayoutChange(next: LabelLayout) {
    setLayout(next);
    saveStoredLayout(next);
  }

  const pageSize =
    layout.mode === "single"
      ? `${layout.labelWidthIn}in ${layout.labelHeightIn}in`
      : `${layout.pageWidthIn}in ${layout.pageHeightIn}in`;
  const pageMargin = layout.mode === "single" ? "0" : `${layout.marginTopIn}in ${layout.marginLeftIn}in`;

  return (
    <div className="flex flex-col gap-4">
      <style>{`@page { size: ${pageSize}; margin: ${pageMargin}; }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Print labels</h1>
        <Button onClick={() => window.print()} disabled={locations.length === 0}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <LabelLayoutSettings layout={layout} onChange={handleLayoutChange} />

      {ids.length === 0 && <p className="text-sm text-muted-foreground print:hidden">No locations selected.</p>}

      {layout.mode === "single" ? (
        <div className="flex flex-col items-start gap-4 print:gap-0">
          {locations.map((location, i) => (
            <Label key={location.id} location={location} layout={layout} breakAfter={i < locations.length - 1} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${layout.columns}, ${layout.labelWidthIn}in)`,
            gap: `${layout.rowGapIn}in ${layout.columnGapIn}in`,
          }}
        >
          {locations.map((location) => (
            <Label key={location.id} location={location} layout={layout} />
          ))}
        </div>
      )}
    </div>
  );
}
