import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  formats?: BarcodeFormat[];
  onDetected: (text: string, format: string) => void;
  active?: boolean;
  className?: string;
}

export function BarcodeScanner({ formats, onDetected, active = true, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<string | null>(null);
  const formatsKey = formats?.join(",") ?? "";

  useEffect(() => {
    if (!active || !videoRef.current) return;

    setError(null);
    const hints = new Map();
    if (formats?.length) hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    const reader = new BrowserMultiFormatReader(hints);

    let controls: IScannerControls | undefined;
    let cancelled = false;
    let lastValue = "";
    let lastTime = 0;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, err) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText();
            const now = Date.now();
            if (text === lastValue && now - lastTime < 2000) return;
            lastValue = text;
            lastTime = now;
            onDetectedRef.current(text, result.getBarcodeFormat().toString());
            return;
          }
          if (err && !(err instanceof NotFoundException)) {
            setError(err.message ?? "Unable to access camera");
          }
        },
      )
      .then((c) => {
        if (cancelled) {
          c.stop();
        } else {
          controls = c;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to access camera");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, formatsKey]);

  return (
    <div className={className}>
      <video ref={videoRef} muted playsInline className="aspect-video w-full rounded-md bg-black object-cover" />
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
