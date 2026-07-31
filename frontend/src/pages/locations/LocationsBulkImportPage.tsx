import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBulkCreateLocations, type BulkLocationRow } from "@/api/locations";
import { ApiError } from "@/api/client";
import type { Location } from "@/types/models";
import { CheckCircle2, Printer } from "lucide-react";

const EXAMPLE = `Lev Rack,LR
Shelf 1,01,LR
Shelf 2,02,LR
Bin 1,01,LR-01
Bin 2,02,LR-01`;

function parseRows(text: string): BulkLocationRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const delimiter = line.includes("\t") ? "\t" : ",";
      const [name, code, parentFullCode, description] = line.split(delimiter).map((part) => part.trim());
      return { name, code, parentFullCode: parentFullCode || undefined, description: description || undefined };
    });
}

export function LocationsBulkImportPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const bulkCreate = useBulkCreateLocations();
  const [created, setCreated] = useState<Location[] | null>(null);

  const rows = useMemo(() => parseRows(text), [text]);
  const invalidRows = rows.filter((r) => !r.name || !r.code);

  function handleImport() {
    bulkCreate.mutate(rows, {
      onSuccess: (data) => setCreated(data.created),
    });
  }

  if (created) {
    const ids = created.map((l) => l.id).join(",");
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            {created.length} location{created.length === 1 ? "" : "s"} created
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {created.map((location) => (
              <Link
                key={location.id}
                to={`/locations/${location.id}`}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="font-medium">{location.name}</span>{" "}
                <span className="font-mono text-muted-foreground">{location.fullCode ?? location.code}</span>
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/locations/print?ids=${ids}`}>
                <Printer className="h-4 w-4" />
                Print all labels
              </Link>
            </Button>
            <Button variant="outline" onClick={() => navigate("/locations")}>
              Back to locations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Bulk import locations</CardTitle>
        <CardDescription>
          One location per line: <span className="font-mono">Name, Code, Parent full code, Description</span> — the
          last two are optional. Parents must appear on an earlier line (or already exist) before a location that
          references them. Paste from a spreadsheet (tab-separated) or type comma-separated lines directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {rows.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {rows.length} row{rows.length === 1 ? "" : "s"} parsed
            {invalidRows.length > 0 && (
              <span className="text-destructive"> — {invalidRows.length} missing a name or code</span>
            )}
          </p>
        )}

        {bulkCreate.isError && (
          <p className="text-sm text-destructive">
            {bulkCreate.error instanceof ApiError ? bulkCreate.error.message : "Import failed"}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={rows.length === 0 || invalidRows.length > 0 || bulkCreate.isPending}>
            {bulkCreate.isPending ? "Importing..." : `Import ${rows.length || ""} location${rows.length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="outline" onClick={() => navigate("/locations")}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
