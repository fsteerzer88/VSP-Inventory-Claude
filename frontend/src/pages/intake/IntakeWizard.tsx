import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarcodeFormat } from "@zxing/library";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { PhotoCapture } from "@/components/camera/PhotoCapture";
import { OcrFillSelect } from "@/components/ocr/OcrFillSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductByBarcode, useUploadProductImage } from "@/api/products";
import { useLocationByCode } from "@/api/locations";
import { useIntake } from "@/api/inventory";
import { ApiError } from "@/api/client";
import { detectWordsInImage, type DetectedWord } from "@/lib/ocr";
import { CheckCircle2, Loader2, ScanLine, ScanText } from "lucide-react";
import type { Location } from "@/types/models";

type Step = "scan-product" | "photo" | "details" | "scan-location" | "confirm" | "done";

const LOCATION_QR_FORMATS = [BarcodeFormat.QR_CODE];

function extractLocationId(scanned: string): string | null {
  try {
    const url = new URL(scanned);
    const match = url.pathname.match(/\/locations\/([^/]+)/);
    if (match) return match[1];
  } catch {
    // not a URL - fall through to treating it as a raw code/id below
  }
  return null;
}

export function IntakeWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("scan-product");
  const [barcode, setBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [manualLocationCode, setManualLocationCode] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [ocrWords, setOcrWords] = useState<DetectedWord[]>([]);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [ocrError, setOcrError] = useState<string | null>(null);

  const existingProduct = useProductByBarcode(barcode || undefined);
  const uploadImage = useUploadProductImage();
  const intake = useIntake();
  const locationLookup = useLocationByCode(locationCode || undefined);

  function handleProductScanned(text: string) {
    setBarcode(text);
  }

  function confirmBarcode() {
    setStep(existingProduct.data ? "scan-location" : "photo");
  }

  function handleLocationScanned(text: string) {
    const id = extractLocationId(text);
    if (id) {
      setLocationCode("");
      setLocation({ id, name: "", code: "", description: null, parentLocationId: null, createdBy: null, createdAt: "" });
      setStep("confirm");
    } else {
      setLocationCode(text);
    }
  }

  useEffect(() => {
    if (locationLookup.data) {
      setLocation(locationLookup.data);
      setStep("confirm");
    }
  }, [locationLookup.data]);

  // A new/retaken photo invalidates any previously-detected text.
  useEffect(() => {
    setOcrWords([]);
    setOcrStatus("idle");
    setOcrError(null);
  }, [photoFile]);

  async function runOcr() {
    if (!photoFile) return;
    setOcrStatus("scanning");
    setOcrError(null);
    try {
      const words = await detectWordsInImage(photoFile);
      setOcrWords(words);
      setOcrStatus("done");
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "Could not read text from the photo");
      setOcrStatus("error");
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      let result;
      if (existingProduct.data) {
        result = await intake.mutateAsync({
          productId: existingProduct.data.id,
          locationId: location!.id,
          quantity,
        });
      } else {
        result = await intake.mutateAsync({
          newProduct: {
            barcode,
            name,
            manufacturer: manufacturer || undefined,
            category: category || undefined,
            sku: sku || undefined,
            partNumber: partNumber || undefined,
          },
          locationId: location!.id,
          quantity,
        });
      }
      const productId = (result as { productId: string }).productId;
      if (photoFile && productId) {
        await uploadImage.mutateAsync({ productId, file: photoFile });
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Intake failed");
    }
  }

  function reset() {
    setStep("scan-product");
    setBarcode("");
    setManualBarcode("");
    setPhotoFile(null);
    setName("");
    setManufacturer("");
    setCategory("");
    setSku("");
    setPartNumber("");
    setLocationCode("");
    setManualLocationCode("");
    setLocation(null);
    setQuantity(1);
    setError(null);
    setOcrWords([]);
    setOcrStatus("idle");
    setOcrError(null);
  }

  if (step === "done") {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            Intake complete
          </CardTitle>
          <CardDescription>{quantity} unit(s) added to inventory.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={reset}>Scan another item</Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            View inventory
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Product intake</h1>

      {step === "scan-product" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan product barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <BarcodeScanner onDetected={handleProductScanned} active={!barcode} />
            {barcode && (
              <div className="flex flex-col gap-2 rounded-md bg-muted p-3 text-sm">
                <p>
                  Scanned: <span className="font-mono">{barcode}</span>
                </p>
                {existingProduct.isLoading && <p className="text-muted-foreground">Looking up product...</p>}
                {existingProduct.data && (
                  <p className="text-green-600 dark:text-green-400">
                    Found existing product: {existingProduct.data.name}
                  </p>
                )}
                {existingProduct.data === null && (
                  <p className="text-muted-foreground">No existing product - you'll enter details next.</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirmBarcode} disabled={existingProduct.isLoading}>
                    Continue
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBarcode("")}>
                    Rescan
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Or enter barcode manually"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <Button variant="outline" onClick={() => setBarcode(manualBarcode)} disabled={!manualBarcode}>
                Use
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "photo" && (
        <Card>
          <CardHeader>
            <CardTitle>Photo of the label</CardTitle>
            <CardDescription>Optional, but helps identify the product later.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <PhotoCapture onCapture={setPhotoFile} />
            <div className="flex gap-2">
              <Button onClick={() => setStep("details")}>Continue</Button>
              <Button variant="outline" onClick={() => setStep("scan-product")}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {photoFile && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/50 p-3">
                <Button type="button" size="sm" variant="outline" onClick={runOcr} disabled={ocrStatus === "scanning"}>
                  {ocrStatus === "scanning" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reading photo...
                    </>
                  ) : (
                    <>
                      <ScanText className="h-4 w-4" />
                      {ocrStatus === "done" ? "Re-scan text from photo" : "Scan text from photo"}
                    </>
                  )}
                </Button>
                {ocrStatus === "done" && (
                  <p className="text-xs text-muted-foreground">
                    {ocrWords.length > 0
                      ? `${ocrWords.length} word(s) found - use the scan icon next to a field below to fill it.`
                      : "No text detected - try retaking the photo with better lighting/focus."}
                  </p>
                )}
                {ocrStatus === "error" && <p className="text-xs text-destructive">{ocrError}</p>}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
                <OcrFillSelect words={ocrWords} onPick={setName} label="name" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <div className="flex gap-2">
                <Input
                  id="manufacturer"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="flex-1"
                />
                <OcrFillSelect words={ocrWords} onPick={setManufacturer} label="manufacturer" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <div className="flex gap-2">
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1" />
                <OcrFillSelect words={ocrWords} onPick={setCategory} label="category" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <div className="flex gap-2">
                <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="flex-1" />
                <OcrFillSelect words={ocrWords} onPick={setSku} label="SKU" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="partNumber">Part number</Label>
              <div className="flex gap-2">
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="flex-1"
                />
                <OcrFillSelect words={ocrWords} onPick={setPartNumber} label="part number" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep("scan-location")} disabled={!name}>
                Continue
              </Button>
              <Button variant="outline" onClick={() => setStep("photo")}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "scan-location" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan location QR label
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <BarcodeScanner onDetected={handleLocationScanned} formats={LOCATION_QR_FORMATS} active={!location} />
            {locationCode && locationLookup.isLoading && (
              <p className="text-sm text-muted-foreground">Looking up location...</p>
            )}
            {locationCode && locationLookup.isError && (
              <p className="text-sm text-destructive">Location code not found. Try again.</p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Or enter the full location code, e.g. LR-01-01"
                value={manualLocationCode}
                onChange={(e) => setManualLocationCode(e.target.value)}
              />
              <Button variant="outline" onClick={() => setLocationCode(manualLocationCode)} disabled={!manualLocationCode}>
                Use
              </Button>
            </div>
            <Button variant="outline" onClick={() => setStep(existingProduct.data ? "scan-product" : "details")}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && location && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm intake</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">
              Product: <span className="font-medium">{existingProduct.data?.name ?? name}</span>
            </p>
            <p className="text-sm">
              Location: <span className="font-medium">{location.name || location.id}</span>
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={intake.isPending || quantity < 1}>
                {intake.isPending ? "Saving..." : "Confirm intake"}
              </Button>
              <Button variant="outline" onClick={() => setStep("scan-location")}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
