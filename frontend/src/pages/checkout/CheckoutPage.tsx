import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductByBarcode, useProduct } from "@/api/products";
import { useCheckout } from "@/api/inventory";
import { ApiError } from "@/api/client";
import { CheckCircle2, PackageMinus, ScanLine } from "lucide-react";

export function CheckoutPage() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [done, setDone] = useState(false);

  const lookup = useProductByBarcode(barcode || undefined);
  const { data: product } = useProduct(lookup.data?.id);
  const checkout = useCheckout();

  const inStock = product?.inventoryItems?.filter((item) => item.quantity > 0) ?? [];
  const selectedItem = inStock.find((item) => item.id === inventoryItemId);

  function reset() {
    setBarcode("");
    setManualBarcode("");
    setInventoryItemId("");
    setQuantity(1);
    setDone(false);
    checkout.reset();
  }

  async function handleSubmit() {
    if (!selectedItem) return;
    await checkout.mutateAsync({ inventoryItemId: selectedItem.id, quantity });
    setDone(true);
  }

  if (done) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            Checked out
          </CardTitle>
          <CardDescription>{quantity} unit(s) removed from inventory.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={reset}>Check out another item</Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            View inventory
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Check out</h1>

      {!barcode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan product barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <BarcodeScanner onDetected={setBarcode} />
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

      {barcode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              {lookup.data?.name ?? "Looking up product..."}
            </CardTitle>
            <CardDescription>Barcode: {barcode}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lookup.isLoading && <p className="text-sm text-muted-foreground">Looking up product...</p>}
            {lookup.data === null && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-destructive">No product found for this barcode.</p>
                <Button variant="outline" onClick={reset}>
                  Try again
                </Button>
              </div>
            )}
            {lookup.data && inStock.length === 0 && (
              <p className="text-sm text-muted-foreground">No stock available for this product at any location.</p>
            )}
            {inStock.length > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Location</Label>
                  <select
                    id="location"
                    value={inventoryItemId}
                    onChange={(e) => setInventoryItemId(e.target.value)}
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select a location...</option>
                    {inStock.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.location?.name} ({item.quantity} in stock)
                      </option>
                    ))}
                  </select>
                </div>
                {selectedItem && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={selectedItem.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                )}
                {checkout.isError && (
                  <p className="text-sm text-destructive">
                    {checkout.error instanceof ApiError ? checkout.error.message : "Checkout failed"}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedItem || quantity < 1 || quantity > (selectedItem?.quantity ?? 0) || checkout.isPending}
                  >
                    {checkout.isPending ? "Checking out..." : "Confirm checkout"}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
