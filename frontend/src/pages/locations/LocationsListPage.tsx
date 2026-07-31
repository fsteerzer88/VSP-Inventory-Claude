import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocations, useUpdateLocation } from "@/api/locations";
import { useSession } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Archive, ArchiveRestore, ListPlus, MapPin, Plus, Printer } from "lucide-react";
import type { Location } from "@/types/models";

interface LocationNode extends Location {
  children: LocationNode[];
}

function buildLocationTree(locations: Location[]): LocationNode[] {
  const nodeMap = new Map<string, LocationNode>();
  locations.forEach((loc) => nodeMap.set(loc.id, { ...loc, children: [] }));

  const roots: LocationNode[] = [];
  nodeMap.forEach((node) => {
    const parent = node.parentLocationId ? nodeMap.get(node.parentLocationId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes: LocationNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);

  return roots;
}

function LocationRow({
  node,
  depth,
  selected,
  onToggle,
  isAdmin,
  onToggleArchive,
}: {
  node: LocationNode;
  depth: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  isAdmin: boolean;
  onToggleArchive: (node: LocationNode) => void;
}) {
  return (
    <>
      <Card className={cn(node.isActive === false && "opacity-60")}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="shrink-0" style={{ width: depth * 24 }} />
          <input
            type="checkbox"
            checked={selected.has(node.id)}
            onChange={() => onToggle(node.id)}
            className="h-4 w-4 shrink-0"
            aria-label={`Select ${node.name}`}
          />
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Link to={`/locations/${node.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {node.name}
              {node.isActive === false && <span className="ml-2 text-xs text-muted-foreground">(archived)</span>}
            </p>
            <p className="truncate text-sm text-muted-foreground">{node.fullCode ?? node.code}</p>
          </Link>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleArchive(node)}
              title={node.isActive === false ? "Reactivate" : "Archive"}
            >
              {node.isActive === false ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
          )}
        </CardContent>
      </Card>
      {node.children.map((child) => (
        <LocationRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onToggle={onToggle}
          isAdmin={isAdmin}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </>
  );
}

export function LocationsListPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: locations, isLoading } = useLocations(q || undefined);
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const updateLocation = useUpdateLocation();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleArchive(node: LocationNode) {
    updateLocation.mutate({ id: node.id, isActive: node.isActive === false });
  }

  const tree = locations ? buildLocationTree(locations) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <div className="flex gap-2">
          {selected.size === 0 ? (
            <Button variant="outline" disabled>
              <Printer className="h-4 w-4" />
              Print selected (0)
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to={`/locations/print?ids=${Array.from(selected).join(",")}`}>
                <Printer className="h-4 w-4" />
                Print selected ({selected.size})
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/locations/bulk-import">
              <ListPlus className="h-4 w-4" />
              Bulk import
            </Link>
          </Button>
          <Button asChild>
            <Link to="/locations/new">
              <Plus className="h-4 w-4" />
              New location
            </Link>
          </Button>
        </div>
      </div>

      <Input placeholder="Search by name or code..." value={q} onChange={(e) => setQ(e.target.value)} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-2">
        {tree.map((node) => (
          <LocationRow
            key={node.id}
            node={node}
            depth={0}
            selected={selected}
            onToggle={toggle}
            isAdmin={isAdmin}
            onToggleArchive={toggleArchive}
          />
        ))}
        {locations?.length === 0 && <p className="text-sm text-muted-foreground">No locations found.</p>}
      </div>
    </div>
  );
}
