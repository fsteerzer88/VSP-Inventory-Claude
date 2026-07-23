import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Camera } from "lucide-react";

type CameraStatus = "idle" | "checking" | "ok" | "error";

function CameraCheck() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function checkCamera() {
    setStatus("checking");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera access check
        </CardTitle>
        <CardDescription>
          Verifies this device can grant camera access over the current connection.
          Barcode scanning and photo capture require a secure context (HTTPS or localhost).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!window.isSecureContext && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            This page is not loaded in a secure context. Camera access will be blocked by the browser.
            Load the app over HTTPS (see the LAN setup instructions).
          </div>
        )}
        <Button onClick={checkCamera} disabled={status === "checking"} className="w-fit">
          {status === "checking" ? "Requesting camera..." : "Test camera access"}
        </Button>
        {status === "ok" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Camera access granted.
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            Camera access failed: {error}
          </div>
        )}
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full max-w-sm rounded-md border border-border bg-muted object-cover"
        />
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Scan products in for intake, check items out, and manage inventory locations.
        </p>
      </div>
      <CameraCheck />
    </div>
  );
}
