import { useRef, useState, type ChangeEvent } from "react";
import * as Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, ScanText, X } from "lucide-react";

interface SkuScannerProps {
  onExtracted: (text: string) => void;
}

type Status = "idle" | "scanning" | "done" | "error";

interface DetectedWord {
  text: string;
  confidence: number;
}

// Requires internet access the first time it's used (fetches the OCR engine + language
// data from a CDN, then caches them in the browser) - not a hard dependency of the app,
// just of this one assist feature.
export function SkuScanner({ onExtracted }: SkuScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [words, setWords] = useState<DetectedWord[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setStatus("scanning");
    setError(null);
    setValue("");

    try {
      const worker = await Tesseract.createWorker("eng");
      try {
        // Sparse-text mode is meant for scattered/isolated text (like a label on
        // packaging) rather than a full paragraph, which is what the default page
        // segmentation mode assumes - that mismatch is the usual cause of OCR output
        // that looks unrelated to what's actually in the photo. Restricting the
        // character set to what SKUs are actually made of also cuts down on misreads.
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_./ ",
        });
        const result = await worker.recognize(file, {}, { blocks: true });
        const detected = (result.data.blocks ?? [])
          .flatMap((block) => block.paragraphs)
          .flatMap((paragraph) => paragraph.lines)
          .flatMap((line) => line.words)
          .map((word) => ({ text: word.text.trim(), confidence: word.confidence }))
          .filter((word) => word.text.length > 0);

        setWords(detected);
        setStatus("done");
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read text from that image");
      setStatus("error");
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("idle");
    setWords([]);
    setValue("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function accept() {
    onExtracted(value.trim());
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
                {words.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Tap the text that matches the SKU:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {words.map((word, i) => (
                        <button
                          key={`${word.text}-${i}`}
                          type="button"
                          onClick={() => setValue(word.text)}
                          className={cn(
                            "rounded-md border border-input px-2 py-1 font-mono text-sm hover:bg-accent",
                            word.confidence < 60 && "text-muted-foreground",
                            value === word.text && "border-primary bg-primary/10",
                          )}
                        >
                          {word.text}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No text detected - try retaking with better lighting/focus.</p>
                )}
                <p className="text-xs text-muted-foreground">Or edit directly:</p>
                <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="SKU" />
              </div>
            )}

            <div className="flex gap-2">
              {status === "done" && (
                <Button type="button" size="sm" onClick={accept} disabled={!value.trim()}>
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
