import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { productDataMatrixUrl } from "@/api/products";
import { Button } from "@/components/ui/button";
import { BradyPrinterPanel } from "@/components/printing/BradyPrinterPanel";
import { renderProductLabelImage, downloadProductLabelImage } from "@/lib/brady-label-image";
import type { Product } from "@/types/models";
import { Printer } from "lucide-react";

function labelFilename(product: Product): string {
  const safe = (product.sku || product.partNumber || product.name).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `product-${safe}.png`;
}

export function ProductPrintPage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["products", "detail", id],
      queryFn: () => api.get<Product>(`/products/${id}`),
    })),
  });

  const products = results.map((r) => r.data).filter((p): p is Product => !!p);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Print labels</h1>
        <Button onClick={() => window.print()} disabled={products.length === 0}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {ids.length === 0 && <p className="text-sm text-muted-foreground print:hidden">No products selected.</p>}

      <BradyPrinterPanel
        items={products}
        itemName={(product) => product.name}
        renderLabelImage={renderProductLabelImage}
        downloadLabelImage={downloadProductLabelImage}
        labelFilename={labelFilename}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-md border border-border p-3 print:break-inside-avoid print:border-black"
          >
            <img
              src={productDataMatrixUrl(product.id)}
              alt={`Data Matrix code for ${product.name}`}
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-mono text-base font-bold leading-tight print:text-black">
                {product.sku || product.partNumber || product.name}
              </p>
              <p className="text-xs text-muted-foreground print:text-black">{product.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
