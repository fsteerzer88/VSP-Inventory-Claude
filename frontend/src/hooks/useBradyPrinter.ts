import { useCallback, useRef, useState } from "react";
import BradySdk from "@bradycorporation/brady-web-sdk";

// App-defined identifier passed to showDiscoveredBleDevices - only meaningful for M211
// devices per Brady's docs, but required for every call regardless of printer model.
const OWNERSHIP_ID = "vsp-inventory-manager";

export interface BradyPrinterInfo {
  status?: string;
  printerName?: string;
  printerModel?: string;
  supplyName?: string;
  supplyRemainingPercentage?: number;
  batteryLevelPercentage?: number;
  firmwareVersion?: string;
  errorMessage?: string;
}

export function useBradyPrinter() {
  const sdkRef = useRef<BradySdk | null>(null);
  const [, forceUpdate] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Lazy one-time construction, kept in a ref rather than state so the same SDK/Bluetooth
  // connection survives re-renders. The SDK's own callback (fired on every backend
  // view-model update - connection changes, printer status, supply level, etc.) just
  // triggers a re-render; the fresh values are read directly off the instance below,
  // since they're plain mutable fields the SDK updates in place rather than something
  // React tracks itself.
  if (!sdkRef.current) {
    // collectAnalytics defaults to true (sends usage data to Brady via Firebase) if
    // omitted - explicitly disabled here to match this being a self-hosted, privacy-
    // conscious app. Flip to true if Brady's own diagnostics are ever wanted instead.
    sdkRef.current = new BradySdk(() => forceUpdate((n) => n + 1), false);
  }
  const sdk = sdkRef.current;

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const deviceId = await sdk.showDiscoveredBleDevices(OWNERSHIP_ID);
      if (!deviceId) {
        setConnectError("No printer was selected, or pairing was cancelled.");
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect to the printer.");
    } finally {
      setIsConnecting(false);
    }
  }, [sdk]);

  const disconnect = useCallback(async () => {
    await sdk.disconnect();
  }, [sdk]);

  const printImage = useCallback(
    async (image: HTMLImageElement) => {
      if (!sdk.isConnected()) throw new Error("Not connected to a Brady printer.");
      const ok = await sdk.printBitmap(image);
      if (!ok) throw new Error(sdk.error?.message || "Print failed.");
    },
    [sdk],
  );

  const info: BradyPrinterInfo = {
    status: sdk.status,
    printerName: sdk.printerName,
    printerModel: sdk.printerModel,
    supplyName: sdk.supplyName,
    supplyRemainingPercentage: sdk.supplyRemainingPercentage,
    batteryLevelPercentage: sdk.batteryLevelPercentage,
    firmwareVersion: sdk.firmwareVersion,
    errorMessage: sdk.error?.message,
  };

  return {
    isSupportedBrowser: sdk.isSupportedBrowser(),
    isConnected: sdk.isConnected(),
    isConnecting,
    connectError,
    info,
    connect,
    disconnect,
    printImage,
  };
}
