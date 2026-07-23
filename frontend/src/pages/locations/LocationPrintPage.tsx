import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { locationQrCodeUrl } from "@/api/locations";
import { Button } from "@/components/ui/button";
import type { Location } from "@/types/models";
import { Printer } from "lucide-react";

export function LocationPrintPage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["locations", "detail", id],
      queryFn: () => api.get<Location>(`/locations/${id}`),
    })),
  });

  const locations = results.map((r) => r.data).filter((l): l is Location => !!l);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Print labels</h1>
        <Button onClick={() => window.print()} disabled={locations.length === 0}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {ids.length === 0 && <p className="text-sm text-muted-foreground print:hidden">No locations selected.</p>}

      <div className="grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        {locations.map((location) => (
          <div
            key={location.id}
            className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center print:break-inside-avoid print:border-black"
          >
            <img src={locationQrCodeUrl(location.id)} alt={`QR code for ${location.name}`} className="h-24 w-24" />
            <p className="text-sm font-medium">{location.name}</p>
            <p className="text-xs text-muted-foreground">{location.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
