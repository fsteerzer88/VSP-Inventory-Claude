import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocations } from "@/api/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Printer } from "lucide-react";

export function LocationsListPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: locations, isLoading } = useLocations(q || undefined);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <div className="flex gap-2">
          {selected.size === 0 ? (
            <Button variant="outline" disabled>
              <Printer className="h-4 w-4" />
              Print selected (0)
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to={`/locations/print?ids=${Array.from(selected).join(",")}`}>
                <Printer className="h-4 w-4" />
                Print selected ({selected.size})
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link to="/locations/new">
              <Plus className="h-4 w-4" />
              New location
            </Link>
          </Button>
        </div>
      </div>

      <Input placeholder="Search by name or code..." value={q} onChange={(e) => setQ(e.target.value)} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-2">
        {locations?.map((location) => (
          <Card key={location.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                checked={selected.has(location.id)}
                onChange={() => toggle(location.id)}
                className="h-4 w-4"
                aria-label={`Select ${location.name}`}
              />
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Link to={`/locations/${location.id}`} className="flex-1 min-w-0">
                <p className="truncate font-medium">{location.name}</p>
                <p className="truncate text-sm text-muted-foreground">{location.code}</p>
              </Link>
            </CardContent>
          </Card>
        ))}
        {locations?.length === 0 && (
          <p className="text-sm text-muted-foreground">No locations found.</p>
        )}
      </div>
    </div>
  );
}
