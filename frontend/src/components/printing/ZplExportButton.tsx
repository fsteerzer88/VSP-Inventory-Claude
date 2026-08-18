import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileCode, Loader2 } from "lucide-react";

export function ZplExportButton({ disabled, onDownload }: { disabled?: boolean; onDownload: () => Promise<void> }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsDownloading(true);
    try {
      await onDownload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ZPL");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <Button type="button" variant="outline" onClick={handleClick} disabled={disabled || isDownloading}>
        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
        {isDownloading ? "Generating..." : "Export ZPL (Zebra)"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
