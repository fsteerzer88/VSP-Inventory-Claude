import { useRef, useState, type ChangeEvent } from "react";
import * as Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ScanText, X } from "lucide-react";

interface SkuScannerProps {
  onExtracted: (text: string) => void;
}

type Status = "idle" | "scanning" | "done" | "error";

// Requires internet access the first time it's used (fetches the OCR engine + language
// data from a CDN, then caches them in the browser) - not a hard dependency of the app,
// just of this one assist feature.
export function SkuScanner({ onExtracted }: SkuScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setStatus("scanning");
    setError(null);

    try {
      const result = await Tesseract.recognize(file, "eng");
      setExtractedText(result.data.text.trim());
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read text from that image");
      setStatus("error");
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("idle");
    setExtractedText("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function accept() {
    onExtracted(extractedText.trim());
    reset();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {status === "idle" && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ScanText className="h-4 w-4" />
          Scan SKU from label
        </Button>
      )}

      {status !== "idle" && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Captured SKU label"
                className="max-h-40 w-full rounded-md border border-border object-contain"
              />
            )}

            {status === "scanning" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading text from image...
              </div>
            )}

            {status === "error" && <p className="text-sm text-destructive">{error}</p>}

            {status === "done" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Review and edit before using:</p>
                <Input value={extractedText} onChange={(e) => setExtractedText(e.target.value)} />
              </div>
            )}

            <div className="flex gap-2">
              {status === "done" && (
                <Button type="button" size="sm" onClick={accept} disabled={!extractedText.trim()}>
                  Use this
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={reset}>
                <X className="h-4 w-4" />
                {status === "scanning" ? "Cancel" : "Retake"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
