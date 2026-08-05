// The Brady Web SDK (@bradycorporation/brady-web-sdk) ships no TypeScript declarations.
// This is a hand-written declaration based on Brady's published API docs
// (https://sdk.bradyid.com/web_api_documentation/), not verified against their source -
// double check against actual runtime behavior if something here doesn't match.
declare module "@bradycorporation/brady-web-sdk" {
  // EndOfJob (default) | EndOfLabel (cuts between copies) | Never | CutAfterRow | UsePrinterSettings
  export type BradyCutOption = 0 | 1 | 2 | 3 | 4;

  export interface BradyPrinterError {
    message: string;
    messageTitle: string;
    messageRemedy: string;
  }

  export interface BradySupplyDimensions {
    width: number;
    height: number;
  }

  export default class BradySdk {
    // collectAnalytics defaults to true per Brady's docs if omitted.
    constructor(callback: (sdk: BradySdk) => void, collectAnalytics?: boolean);

    // Connection - showDiscoveredBleDevices must be called from a user gesture (click
    // handler), since it opens the browser's native Web Bluetooth device picker.
    // ownershipId is only meaningful for M211 devices; pass an app-defined constant.
    showDiscoveredBleDevices(ownershipId: string): Promise<string | null>;
    isConnected(): boolean;
    isSupportedBrowser(): boolean;
    disconnect(): Promise<boolean>;

    // Printing - printBitmap only accepts an HTMLImageElement (not a canvas or data URL
    // directly); it maintains aspect ratio and resizes to the printer's printable zone.
    printBitmap(bitmap: HTMLImageElement, xOffsetInches?: number, yOffsetInches?: number): Promise<boolean>;
    feed(): Promise<boolean>; // M211/M511 only
    cut(): Promise<boolean>; // M211/M511 only
    parsePdfToImages(file: File): HTMLImageElement[];

    // Configuration
    setCopies(copies: number): void;
    setCutOption(option: BradyCutOption): void;
    setCutAfterRowValue(value: number): void; // M611/S3700/i7500 only
    setSupplyDatabase(file: File): void;

    // Reactive state - populated/updated once connected; read these after the
    // constructor's callback fires (it fires on every backend view-model update).
    status?: string;
    printerName?: string;
    printerModel?: string;
    supplyName?: string;
    supplyDimensions?: BradySupplyDimensions;
    supplyRemainingPercentage?: number;
    batteryLevelPercentage?: number;
    firmwareVersion?: string;
    error?: BradyPrinterError;
  }
}
