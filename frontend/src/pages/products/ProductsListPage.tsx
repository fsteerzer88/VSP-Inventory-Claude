import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProducts, productImageUrl } from "@/api/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Package, Printer, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/types/models";

interface FacetOption {
  value: string;
  count: number;
}

function buildFacet(products: Product[], field: "category" | "manufacturer"): FacetOption[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const value = product[field];
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 shrink-0 rounded border-input"
            />
            <span className="min-w-0 flex-1 truncate">{option.value}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{option.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function ProductsListPage() {
  const [q, setQ] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: products, isLoading } = useProducts(q || undefined);

  const categoryFacet = useMemo(() => buildFacet(products ?? [], "category"), [products]);
  const manufacturerFacet = useMemo(() => buildFacet(products ?? [], "manufacturer"), [products]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (selectedCategories.size > 0 && !(product.category && selectedCategories.has(product.category))) {
        return false;
      }
      if (
        selectedManufacturers.size > 0 &&
        !(product.manufacturer && selectedManufacturers.has(product.manufacturer))
      ) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategories, selectedManufacturers]);

  const activeFilterCount = selectedCategories.size + selectedManufacturers.size;

  function clearFilters() {
    setSelectedCategories(new Set());
    setSelectedManufacturers(new Set());
  }

  function toggleSelected(id: string) {
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
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <div className="flex gap-2">
          {selected.size === 0 ? (
            <Button variant="outline" disabled>
              <Printer className="h-4 w-4" />
              Print selected (0)
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to={`/products/print?ids=${Array.from(selected).join(",")}`}>
                <Printer className="h-4 w-4" />
                Print selected ({selected.size})
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by name, SKU, part number, barcode, or manufacturer..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
        <aside className={cn(filtersOpen ? "flex" : "hidden", "md:flex", "flex-col gap-4")}>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="w-fit" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}
          <FacetGroup
            title="Category"
            options={categoryFacet}
            selected={selectedCategories}
            onToggle={(value) => setSelectedCategories((prev) => toggleInSet(prev, value))}
          />
          <FacetGroup
            title="Manufacturer"
            options={manufacturerFacet}
            selected={selectedManufacturers}
            onToggle={(value) => setSelectedManufacturers((prev) => toggleInSet(prev, value))}
          />
          {categoryFacet.length === 0 && manufacturerFacet.length === 0 && (
            <p className="text-xs text-muted-foreground">No filterable categories or manufacturers yet.</p>
          )}
        </aside>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
            return (
              <Card key={product.id} className="h-full">
                <CardContent className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleSelected(product.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                    aria-label={`Select ${product.name}`}
                  />
                  <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 gap-3">
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
                  </Link>
                </CardContent>
              </Card>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No products found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
