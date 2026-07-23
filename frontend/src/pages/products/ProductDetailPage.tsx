import { Link, useParams } from "react-router-dom";
import { useProduct, useUploadProductImage, productImageUrl } from "@/api/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCapture } from "@/components/camera/PhotoCapture";
import { Package } from "lucide-react";

export function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);
  const uploadImage = useUploadProductImage();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!product) return <p className="text-sm text-muted-foreground">Product not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <p className="text-sm text-muted-foreground">
          {product.manufacturer} {product.sku && `· SKU ${product.sku}`} {product.barcode && `· ${product.barcode}`}
        </p>
      </div>

      {product.description && <p className="text-sm">{product.description}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {product.images?.map((image) => (
              <div key={image.id} className="h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
                <img src={productImageUrl(product.id, image.id)} alt={product.name} className="h-full w-full object-cover" />
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
                <span>{item.location?.name}</span>
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
