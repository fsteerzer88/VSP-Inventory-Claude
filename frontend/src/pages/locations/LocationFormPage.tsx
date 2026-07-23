import { useParams } from "react-router-dom";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export function LocationFormPage() {
  const { id } = useParams();
  return (
    <PlaceholderPage
      title={id ? `Edit location ${id}` : "New location"}
      description="Create or edit a shelf/bin location."
    />
  );
}
