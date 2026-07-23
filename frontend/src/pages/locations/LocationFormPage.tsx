import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLocation, useLocation, useLocations, useUpdateLocation, locationQrCodeUrl } from "@/api/locations";
import { ApiError } from "@/api/client";
import { Printer } from "lucide-react";

export function LocationFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: existing } = useLocation(id);
  const { data: allLocations } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [parentLocationId, setParentLocationId] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCode(existing.code);
      setDescription(existing.description ?? "");
      setParentLocationId(existing.parentLocationId ?? "");
    }
  }, [existing]);

  const mutation = isEdit ? updateLocation : createLocation;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      code,
      description: description || undefined,
      parentLocationId: parentLocationId || null,
    };
    if (isEdit) {
      updateLocation.mutate({ id, ...payload }, { onSuccess: () => navigate("/locations") });
    } else {
      createLocation.mutate(payload, {
        onSuccess: (location) => setCreatedId(location.id),
      });
    }
  }

  if (createdId) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Location created</CardTitle>
          <CardDescription>Print its QR label now, or do it later from the locations list.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <img src={locationQrCodeUrl(createdId)} alt="Location QR code" className="h-40 w-40" />
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/locations/print?ids=${createdId}`}>
                <Printer className="h-4 w-4" />
                Print label
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/locations">Back to locations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit location" : "New location"}</CardTitle>
        <CardDescription>
          {isEdit ? "Update this shelf/bin's details." : "Creates a new shelf/bin and its QR label."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Shelf A3" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="A3" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent">Parent location (optional)</Label>
            <select
              id="parent"
              value={parentLocationId}
              onChange={(e) => setParentLocationId(e.target.value)}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">None</option>
              {allLocations
                ?.filter((l) => l.id !== id)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
            </select>
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof ApiError ? mutation.error.message : "Something went wrong"}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create location"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/locations")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
