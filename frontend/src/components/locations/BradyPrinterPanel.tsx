import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBradyPrinter } from "@/hooks/useBradyPrinter";
import { renderLocationLabelImage } from "@/lib/brady-label-image";
import type { Location } from "@/types/models";
import { Bluetooth, BluetoothOff, Loader2, Printer } from "lucide-react";

export function BradyPrinterPanel({ locations }: { locations: Location[] }) {
  const { isSupportedBrowser, isConnected, isConnecting, connectError, info, connect, disconnect, printImage } =
    useBradyPrinter();
  const [printState, setPrintState] = useState<{ index: number; total: number } | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

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

  if (!isSupportedBrowser) {
    return (
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Brady printer (Bluetooth)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This browser doesn't support Web Bluetooth, so direct Brady printer printing isn't available here. Use
            Chrome or Edge (or Bluefy on iOS) instead, or use the regular Print button above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">Brady printer (Bluetooth)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>

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

        {(connectError || info.errorMessage || printError) && (
          <p className="text-sm text-destructive">{printError || connectError || info.errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
