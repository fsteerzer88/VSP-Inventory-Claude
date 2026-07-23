import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/api/products";
import { useLocations } from "@/api/locations";
import { useInventory } from "@/api/inventory";
import { useTransactions } from "@/api/transactions";
import { Package, MapPin, Boxes, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string;
  value: number | string;
  icon: typeof Package;
  to?: string;
}) {
  const content = (
    <Card className="h-full">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function HomePage() {
  const { data: products } = useProducts();
  const { data: locations } = useLocations();
  const { data: inventory } = useInventory();
  const { data: transactions } = useTransactions();

  const totalUnits = inventory?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const lowStockCount =
    inventory?.filter(
      (item) => item.product?.reorderThreshold != null && item.quantity <= item.product.reorderThreshold,
    ).length ?? 0;
  const recentTransactions = transactions?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Scan products in for intake, check items out, and manage inventory locations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Products" value={products?.length ?? "-"} icon={Package} to="/products" />
        <StatCard label="Locations" value={locations?.length ?? "-"} icon={MapPin} to="/locations" />
        <StatCard label="Units in stock" value={totalUnits} icon={Boxes} to="/inventory" />
        <StatCard label="Low stock" value={lowStockCount} icon={AlertTriangle} to="/inventory" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentTransactions.length ? (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                {tx.quantityDelta >= 0 ? (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium capitalize">{tx.type}</span> {tx.product?.name} at{" "}
                    {tx.location?.name} by {tx.performedByUser?.displayName ?? "unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.performedAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
