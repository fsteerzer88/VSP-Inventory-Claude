import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useProduct,
  useUploadProductImage,
  useUpdateProduct,
  useDeleteProduct,
  useAddProductSource,
  useDeleteProductSource,
  productImageUrl,
} from "@/api/products";
import { useSession } from "@/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoCapture } from "@/components/camera/PhotoCapture";
import { ApiError } from "@/api/client";
import { ExternalLink, Package, Pencil, Plus, Trash2, X } from "lucide-react";

interface ProductFormState {
  name: string;
  description: string;
  manufacturer: string;
  category: string;
  sku: string;
  partNumber: string;
  barcode: string;
  reorderThreshold: string;
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const { data: product, isLoading } = useProduct(id);
  const uploadImage = useUploadProductImage();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const addSource = useAddProductSource();
  const deleteSource = useDeleteProductSource();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!product) return <p className="text-sm text-muted-foreground">Product not found.</p>;

  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];

  function startEdit() {
    setForm({
      name: product!.name,
      description: product!.description ?? "",
      manufacturer: product!.manufacturer ?? "",
      category: product!.category ?? "",
      sku: product!.sku ?? "",
      partNumber: product!.partNumber ?? "",
      barcode: product!.barcode ?? "",
      reorderThreshold: product!.reorderThreshold?.toString() ?? "",
    });
    setIsEditing(true);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    updateProduct.mutate(
      {
        id: product!.id,
        name: form.name,
        description: form.description || null,
        manufacturer: form.manufacturer || null,
        category: form.category || null,
        sku: form.sku || null,
        partNumber: form.partNumber || null,
        barcode: form.barcode || null,
        reorderThreshold: form.reorderThreshold ? Number(form.reorderThreshold) : null,
      },
      { onSuccess: () => setIsEditing(false) },
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${product!.name}"? This can't be undone.`)) return;
    deleteProduct.mutate(product!.id, {
      onSuccess: () => navigate("/products"),
      onError: (err) => window.alert(err instanceof ApiError ? err.message : "Could not delete product"),
    });
  }

  function handleAddSource(e: FormEvent) {
    e.preventDefault();
    if (!sourceLabel.trim() || !sourceUrl.trim()) return;
    addSource.mutate(
      { productId: product!.id, label: sourceLabel.trim(), url: sourceUrl.trim(), notes: sourceNotes.trim() || undefined },
      {
        onSuccess: () => {
          setSourceLabel("");
          setSourceUrl("");
          setSourceNotes("");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">
            {product.manufacturer} {product.partNumber && `· Part # ${product.partNumber}`}{" "}
            {product.sku && `· SKU ${product.sku}`} {product.barcode && `· ${product.barcode}`}
          </p>
        </div>
        {isAdmin && !isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteProduct.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
            {primaryImage ? (
              <img
                src={productImageUrl(product.id, primaryImage.id)}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
            )}
          </div>

          {isEditing && form ? (
            <form className="flex flex-1 flex-col gap-3" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                  <Input
                    id="edit-manufacturer"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input
                    id="edit-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-partnumber">Part number</Label>
                  <Input
                    id="edit-partnumber"
                    value={form.partNumber}
                    onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input id="edit-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-barcode">Barcode</Label>
                  <Input
                    id="edit-barcode"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-reorder">Reorder threshold</Label>
                  <Input
                    id="edit-reorder"
                    type="number"
                    min={0}
                    value={form.reorderThreshold}
                    onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {updateProduct.isError && (
                <p className="text-sm text-destructive">
                  {updateProduct.error instanceof ApiError ? updateProduct.error.message : "Could not save changes"}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={updateProduct.isPending}>
                  {updateProduct.isPending ? "Saving..." : "Save changes"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Manufacturer</dt>
                <dd>{product.manufacturer || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd>{product.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Part number</dt>
                <dd>{product.partNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SKU</dt>
                <dd>{product.sku || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Barcode</dt>
                <dd>{product.barcode || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Reorder threshold</dt>
                <dd>{product.reorderThreshold ?? "—"}</dd>
              </div>
              {product.description && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs text-muted-foreground">Description</dt>
                  <dd>{product.description}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {product.images?.map((image) => (
              <div key={image.id} className="h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={productImageUrl(product.id, image.id)}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            {!product.images?.length && (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
            )}
          </div>
          <PhotoCapture
            onCapture={(file) => {
              if (file) uploadImage.mutate({ productId: product.id, file });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {product.sources?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Source</th>
                    <th className="py-1.5 pr-3 font-medium">Notes</th>
                    {isAdmin && <th className="w-10 py-1.5" />}
                  </tr>
                </thead>
                <tbody>
                  {product.sources.map((source) => (
                    <tr key={source.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 align-top">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-medium hover:underline"
                        >
                          {source.label}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      </td>
                      <td className="py-2 pr-3 align-top text-muted-foreground">{source.notes || "—"}</td>
                      {isAdmin && (
                        <td className="py-2 align-top">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${source.label}`}
                            onClick={() => deleteSource.mutate({ productId: product.id, sourceId: source.id })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No purchase sources added yet.</p>
          )}

          {isAdmin && (
            <form className="flex flex-col gap-3 border-t border-border pt-3" onSubmit={handleAddSource}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="source-label">Source name</Label>
                  <Input
                    id="source-label"
                    placeholder="e.g. McMaster-Carr"
                    value={sourceLabel}
                    onChange={(e) => setSourceLabel(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="source-url">URL</Label>
                  <Input
                    id="source-url"
                    type="url"
                    placeholder="https://..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="source-notes">Notes</Label>
                  <Input
                    id="source-notes"
                    placeholder="e.g. use part # for reorder, min order qty 10"
                    value={sourceNotes}
                    onChange={(e) => setSourceNotes(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addSource.isPending || !sourceLabel.trim() || !sourceUrl.trim()}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {product.inventoryItems?.length ? (
            product.inventoryItems.map((item) => (
              <Link
                key={item.id}
                to={`/inventory/${item.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <span>
                  {item.location?.name}{" "}
                  <span className="text-muted-foreground">({item.location?.fullCode ?? item.location?.code})</span>
                </span>
                <span className="font-medium">{item.quantity} in stock</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Not currently stocked anywhere.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
