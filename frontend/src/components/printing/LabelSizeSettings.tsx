import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inToMm,
  mmToIn,
  type ContentAlign,
  type LabelSizeSettings as LabelSizeSettingsValue,
  type LabelUnit,
  type LocationTextPosition,
  type ZplDpi,
} from "@/lib/label-size";

function formatForUnit(mm: number, unit: LabelUnit): string {
  const value = unit === "mm" ? mm : mmToIn(mm);
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function parseForUnit(raw: string, unit: LabelUnit): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return unit === "mm" ? value : inToMm(value);
}

export function LabelSizeSettings({
  value,
  onChange,
}: {
  value: LabelSizeSettingsValue;
  onChange: (value: LabelSizeSettingsValue) => void;
}) {
  const hasConstraint = value.maxWidthMm != null || value.maxHeightMm != null;

  function setUnit(unit: LabelUnit) {
    onChange({ ...value, unit });
  }

  function setZplDpi(zplDpi: ZplDpi) {
    onChange({ ...value, zplDpi });
  }

  function setZplRotate(zplRotate: boolean) {
    onChange({ ...value, zplRotate });
  }

  function setLocationTextPosition(locationTextPosition: LocationTextPosition) {
    onChange({ ...value, locationTextPosition });
  }

  function setLocationContentAlign(locationContentAlign: ContentAlign) {
    onChange({ ...value, locationContentAlign });
  }

  function parsePercent(raw: string, fallback: number): number {
    if (raw.trim() === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">Label size</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Units</Label>
            <div className="flex gap-1">
              <Button type="button" variant={value.unit === "mm" ? "default" : "outline"} size="sm" onClick={() => setUnit("mm")}>
                mm
              </Button>
              <Button type="button" variant={value.unit === "in" ? "default" : "outline"} size="sm" onClick={() => setUnit("in")}>
                in
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label-max-width">Max width ({value.unit})</Label>
            <Input
              id="label-max-width"
              type="number"
              min={0}
              step={value.unit === "mm" ? 1 : 0.1}
              placeholder="auto"
              className="w-28"
              value={value.maxWidthMm != null ? formatForUnit(value.maxWidthMm, value.unit) : ""}
              onChange={(e) => onChange({ ...value, maxWidthMm: parseForUnit(e.target.value, value.unit) })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label-max-height">Max height ({value.unit})</Label>
            <Input
              id="label-max-height"
              type="number"
              min={0}
              step={value.unit === "mm" ? 1 : 0.1}
              placeholder="auto"
              className="w-28"
              value={value.maxHeightMm != null ? formatForUnit(value.maxHeightMm, value.unit) : ""}
              onChange={(e) => onChange({ ...value, maxHeightMm: parseForUnit(e.target.value, value.unit) })}
            />
          </div>

          {hasConstraint && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, maxWidthMm: null, maxHeightMm: null })}>
              Clear
            </Button>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Zebra printer DPI (ZPL export)</Label>
            <div className="flex gap-1">
              <Button type="button" variant={value.zplDpi === 203 ? "default" : "outline"} size="sm" onClick={() => setZplDpi(203)}>
                203 dpi
              </Button>
              <Button type="button" variant={value.zplDpi === 300 ? "default" : "outline"} size="sm" onClick={() => setZplDpi(300)}>
                300 dpi
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Label orientation</Label>
            <div className="flex gap-1">
              <Button type="button" variant={!value.zplRotate ? "default" : "outline"} size="sm" onClick={() => setZplRotate(false)}>
                Normal
              </Button>
              <Button type="button" variant={value.zplRotate ? "default" : "outline"} size="sm" onClick={() => setZplRotate(true)}>
                Rotate 90°
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label-barcode-scale">Barcode scale (%)</Label>
            <Input
              id="label-barcode-scale"
              type="number"
              min={10}
              max={100}
              step={5}
              className="w-24"
              value={value.barcodeScalePercent}
              onChange={(e) => onChange({ ...value, barcodeScalePercent: parsePercent(e.target.value, value.barcodeScalePercent) })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label-font-scale">Text scale (%)</Label>
            <Input
              id="label-font-scale"
              type="number"
              min={25}
              max={300}
              step={5}
              className="w-24"
              value={value.fontScalePercent}
              onChange={(e) => onChange({ ...value, fontScalePercent: parsePercent(e.target.value, value.fontScalePercent) })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location text position</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={value.locationTextPosition === "bottom" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationTextPosition("bottom")}
              >
                Below code
              </Button>
              <Button
                type="button"
                variant={value.locationTextPosition === "right" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationTextPosition("right")}
              >
                Right of code
              </Button>
              <Button
                type="button"
                variant={value.locationTextPosition === "left" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationTextPosition("left")}
              >
                Left of code
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Content alignment</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant={value.locationContentAlign === "start" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationContentAlign("start")}
              >
                Left
              </Button>
              <Button
                type="button"
                variant={value.locationContentAlign === "center" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationContentAlign("center")}
              >
                Center
              </Button>
              <Button
                type="button"
                variant={value.locationContentAlign === "end" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocationContentAlign("end")}
              >
                Right
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Leave both blank to use the default label shape. Set one to scale the other automatically, or set both to fit
          the label inside that exact box. This sets the physical size for downloaded/browser-printed labels, and the
          aspect ratio for direct Brady printing (actual Brady print size is set by the label stock loaded in the
          printer). The DPI setting only affects ZPL export - match it to your Zebra printer's print head resolution
          (check the printer's spec sheet or configuration label; 203 dpi is the more common default). Rotate 90°
          applies to both ZPL export and the Print button, for printers whose stock feeds labels sideways - it
          requires a max width or height set above (there's no fixed box to rotate otherwise). Barcode scale and text
          scale only affect the on-screen preview and the Print button (not ZPL export or Brady printing) - they
          also require a max width or height set above, since that's what the code/text are scaled relative to.
          Lower the barcode scale on large labels to leave more room for text. Location text position and content
          alignment only apply to the location print page (products keep their fixed side-by-side layout) - content
          alignment controls how the code+text block sits within the label box, useful when the box is bigger than
          the content it holds.
        </p>
      </CardContent>
    </Card>
  );
}
