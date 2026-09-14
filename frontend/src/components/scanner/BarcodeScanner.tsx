import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, HTMLCanvasElementLuminanceSource, type IScannerControls } from "@zxing/browser";
import {
  BarcodeFormat,
  BinaryBitmap,
  ChecksumException,
  DecodeHintType,
  FormatException,
  HybridBinarizer,
  MultiFormatReader,
  NotFoundException,
} from "@zxing/library";
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

    function reportDetection(text: string, format: string) {
      const now = Date.now();
      if (text === lastValue && now - lastTime < 2000) return;
      lastValue = text;
      lastTime = now;
      onDetectedRef.current(text, format);
    }

    // Some printed labels use reverse-video QR codes (light modules on a dark background,
    // e.g. white-on-black asset tags) - zxing's HybridBinarizer assumes dark-on-light and
    // never finds a match on these, even though a phone's native camera scanner handles them
    // fine. Run a second, independent decode pass against an inverted copy of each frame so
    // those labels still auto-scan instead of requiring a manual code entry.
    const invertedReader = new MultiFormatReader();
    invertedReader.setHints(hints);
    const invertCanvas = document.createElement("canvas");
    let invertTimer: ReturnType<typeof setInterval> | undefined;

    function tryInvertedDecode() {
      const video = videoRef.current;
      if (!video || video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return;
      invertCanvas.width = video.videoWidth;
      invertCanvas.height = video.videoHeight;
      const ctx = invertCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, invertCanvas.width, invertCanvas.height);
      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(invertCanvas).invert();
        const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const result = invertedReader.decodeWithState(bitmap);
        reportDetection(result.getText(), result.getBarcodeFormat().toString());
      } catch (err) {
        if (!(err instanceof NotFoundException || err instanceof ChecksumException || err instanceof FormatException)) {
          console.error("BarcodeScanner: inverted decode error", err);
        }
      }
    }
    invertTimer = setInterval(tryInvertedDecode, 400);

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            // Small printed QR labels (see qrcode.service.ts) need enough resolution to
            // resolve their fine modules - browsers otherwise default to ~640x480, which is
            // fine for large 1D barcodes but too coarse for a small QR at normal distance.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        videoRef.current,
        (result, err) => {
          if (cancelled) return;
          if (result) {
            reportDetection(result.getText(), result.getBarcodeFormat().toString());
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
      clearInterval(invertTimer);
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
