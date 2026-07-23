import { useParams } from "react-router-dom";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export function InventoryDetailPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={`Inventory item ${id}`}
      description="Transaction history for this product at this location."
    />
  );
}
