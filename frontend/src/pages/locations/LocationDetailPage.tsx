import { Link, useParams } from "react-router-dom";
import { useLocation } from "@/api/locations";
import { useInventory } from "@/api/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes, Pencil, Printer } from "lucide-react";

export function LocationDetailPage() {
  const { id } = useParams();
  const { data: location, isLoading: locationLoading } = useLocation(id);
  const { data: items, isLoading: itemsLoading } = useInventory({ locationId: id });

  if (locationLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!location) return <p className="text-sm text-muted-foreground">Location not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {location.name}
            {location.isActive === false && <span className="ml-2 text-sm text-muted-foreground">(archived)</span>}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{location.fullCode ?? location.code}</p>
          {location.description && <p className="mt-1 text-sm">{location.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/locations/print?ids=${location.id}`}>
              <Printer className="h-4 w-4" />
              Print label
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/locations/${location.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory at this location</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {itemsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {items?.map((item) => (
            <Link
              key={item.id}
              to={`/inventory/${item.id}`}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <Boxes className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.product?.name}</span>
              <span className="shrink-0 text-muted-foreground">{item.quantity} in stock</span>
            </Link>
          ))}
          {items?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing currently stocked at this location.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
