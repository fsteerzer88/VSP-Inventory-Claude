import { Navigate, useParams } from "react-router-dom";
import { useLocationByCode } from "@/api/locations";

// Destination of the short-code URLs printed on location QR labels (/l/CR01-01 rather than
// /locations/{uuid}) - resolves the code via the existing lookup endpoint, then hands off to
// the normal id-based route.
export function LocationShortLinkPage() {
  const { code } = useParams();
  const { data: location, isLoading, isError } = useLocationByCode(code);

  if (isLoading) return <p className="text-sm text-muted-foreground">Looking up location...</p>;
  if (isError || !location) return <p className="text-sm text-muted-foreground">Location "{code}" not found.</p>;

  return <Navigate to={`/locations/${location.id}`} replace />;
}
