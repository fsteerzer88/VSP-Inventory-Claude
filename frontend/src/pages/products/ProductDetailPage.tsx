import { useParams } from "react-router-dom";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export function ProductDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`Product ${id}`}
      description="Product images, barcode, and current locations/quantities."
    />
  );
}
