import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "@/api/products";
import { productImageUrl } from "@/api/products";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export function ProductsListPage() {
  const [q, setQ] = useState("");
  const { data: products, isLoading } = useProducts(q || undefined);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      <Input
        placeholder="Search by name, SKU, barcode, or manufacturer..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => {
          const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
          return (
            <Link key={product.id} to={`/products/${product.id}`}>
              <Card className="h-full">
                <CardContent className="flex gap-3 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {primaryImage ? (
                      <img
                        src={productImageUrl(product.id, primaryImage.id)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {product.manufacturer ?? product.sku ?? product.barcode ?? "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {products?.length === 0 && <p className="text-sm text-muted-foreground">No products found.</p>}
      </div>
    </div>
  );
}
