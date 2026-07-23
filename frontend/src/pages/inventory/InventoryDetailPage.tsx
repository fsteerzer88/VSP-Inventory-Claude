import { Link, useParams } from "react-router-dom";
import { useInventoryItem } from "@/api/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export function InventoryDetailPage() {
  const { id } = useParams();
  const { data: item, isLoading } = useInventoryItem(id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!item) return <p className="text-sm text-muted-foreground">Inventory item not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link to={`/products/${item.productId}`} className="hover:underline">
            {item.product?.name}
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground">
          {item.location?.name} ({item.location?.code}) &middot; {item.quantity} in stock
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>Every intake and checkout for this product at this location.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {item.transactions?.length ? (
            item.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                {tx.quantityDelta >= 0 ? (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium capitalize">{tx.type}</span>{" "}
                    <span className={tx.quantityDelta >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                      {tx.quantityDelta >= 0 ? "+" : ""}
                      {tx.quantityDelta}
                    </span>{" "}
                    by {tx.performedByUser?.displayName ?? "unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.performedAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
