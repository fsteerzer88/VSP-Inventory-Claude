import { useState } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "@/api/inventory";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Boxes } from "lucide-react";

export function InventoryListPage() {
  const [q, setQ] = useState("");
  const { data: items, isLoading } = useInventory({ q: q || undefined });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
      <Input placeholder="Search by product name, SKU, or barcode..." value={q} onChange={(e) => setQ(e.target.value)} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="overflow-x-auto">
        <div className="hidden min-w-full md:grid md:grid-cols-[1fr_1fr_100px] md:gap-2 md:px-4 md:text-xs md:font-medium md:uppercase md:text-muted-foreground">
          <span>Product</span>
          <span>Location</span>
          <span>Quantity</span>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {items?.map((item) => (
            <Link key={item.id} to={`/inventory/${item.id}`}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4 md:grid md:grid-cols-[1fr_1fr_100px] md:gap-2">
                  <div className="flex min-w-0 items-center gap-2 md:contents">
                    <Boxes className="h-4 w-4 shrink-0 text-muted-foreground md:hidden" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.product?.name}</p>
                      <p className="truncate text-sm text-muted-foreground md:hidden">{item.location?.name}</p>
                    </div>
                  </div>
                  <p className="hidden truncate text-sm text-muted-foreground md:block">{item.location?.name}</p>
                  <p className="shrink-0 text-sm font-medium">{item.quantity} in stock</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {items?.length === 0 && <p className="text-sm text-muted-foreground">No inventory found.</p>}
        </div>
      </div>
    </div>
  );
}
