import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBradyPrinter } from "@/hooks/useBradyPrinter";
import { renderLocationLabelImage, downloadLocationLabelImage } from "@/lib/brady-label-image";
import type { Location } from "@/types/models";
import { Bluetooth, BluetoothOff, Download, Loader2, Printer } from "lucide-react";

function labelFilename(location: Location): string {
  const safe = (location.fullCode ?? location.code).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `location-${safe}.png`;
}

export function BradyPrinterPanel({ locations }: { locations: Location[] }) {
  const { isSupportedBrowser, isConnected, isConnecting, connectError, info, connect, disconnect, printImage } =
    useBradyPrinter();
  const [printState, setPrintState] = useState<{ index: number; total: number } | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<{ index: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handlePrintAll() {
    setPrintError(null);
    for (let i = 0; i < locations.length; i++) {
      setPrintState({ index: i + 1, total: locations.length });
      const location = locations[i];
      try {
        const image = await renderLocationLabelImage(location);
        await printImage(image);
      } catch (err) {
        setPrintError(
          `Failed on "${location.name}" (${i + 1} of ${locations.length}): ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        break;
      }
    }
    setPrintState(null);
  }

  async function handleDownloadAll() {
    setDownloadError(null);
    for (let i = 0; i < locations.length; i++) {
      setDownloadState({ index: i + 1, total: locations.length });
      const location = locations[i];
      try {
        await downloadLocationLabelImage(location, labelFilename(location));
        // Small pause between downloads - firing several at once can make the browser
        // treat it as a suspicious multi-download and block the rest behind a permission
        // prompt.
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        setDownloadError(
          `Failed on "${location.name}" (${i + 1} of ${locations.length}): ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        break;
      }
    }
    setDownloadState(null);
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">Brady printer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={locations.length === 0 || downloadState !== null}
          >
            <Download className="h-4 w-4" />
            {downloadState
              ? `Downloading ${downloadState.index}/${downloadState.total}...`
              : `Download label image${locations.length === 1 ? "" : "s"}`}
          </Button>

          {isSupportedBrowser && (
            <>
              {isConnected ? (
                <Button type="button" variant="outline" size="sm" onClick={() => disconnect()}>
                  <BluetoothOff className="h-4 w-4" />
                  Disconnect
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => connect()} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
                  {isConnecting ? "Connecting..." : "Connect to printer"}
                </Button>
              )}

              {isConnected && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrintAll}
                  disabled={locations.length === 0 || printState !== null}
                >
                  <Printer className="h-4 w-4" />
                  {printState ? `Printing ${printState.index}/${printState.total}...` : "Print via Brady printer"}
                </Button>
              )}
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {isSupportedBrowser
            ? "Connect a paired Brady printer to print directly, or download label images to print elsewhere (e.g. with Brady's own software) if no printer is connected here."
            : "This browser doesn't support direct Bluetooth printing (use Chrome, Edge, or Bluefy on iOS for that) - but you can still download label images to print with Brady's own software on another device."}
        </p>

        {isConnected && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
            {info.printerName && (
              <div>
                <dt className="uppercase">Printer</dt>
                <dd className="text-foreground">{info.printerName}</dd>
              </div>
            )}
            {info.printerModel && (
              <div>
                <dt className="uppercase">Model</dt>
                <dd className="text-foreground">{info.printerModel}</dd>
              </div>
            )}
            {info.supplyName && (
              <div>
                <dt className="uppercase">Supply</dt>
                <dd className="text-foreground">
                  {info.supplyName}
                  {info.supplyRemainingPercentage != null && ` (${Math.round(info.supplyRemainingPercentage)}%)`}
                </dd>
              </div>
            )}
            {info.batteryLevelPercentage != null && (
              <div>
                <dt className="uppercase">Battery</dt>
                <dd className="text-foreground">{Math.round(info.batteryLevelPercentage)}%</dd>
              </div>
            )}
          </dl>
        )}

        {(connectError || info.errorMessage || printError || downloadError) && (
          <p className="text-sm text-destructive">{downloadError || printError || connectError || info.errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
