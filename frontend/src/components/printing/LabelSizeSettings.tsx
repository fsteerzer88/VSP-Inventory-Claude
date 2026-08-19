import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inToMm,
  mmToIn,
  type LabelSizeSettings as LabelSizeSettingsValue,
  type LabelUnit,
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
            <Label>ZPL orientation</Label>
            <div className="flex gap-1">
              <Button type="button" variant={!value.zplRotate ? "default" : "outline"} size="sm" onClick={() => setZplRotate(false)}>
                Normal
              </Button>
              <Button type="button" variant={value.zplRotate ? "default" : "outline"} size="sm" onClick={() => setZplRotate(true)}>
                Rotate 90°
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Leave both blank to use the default label shape. Set one to scale the other automatically, or set both to fit
          the label inside that exact box. This sets the physical size for downloaded/browser-printed labels, and the
          aspect ratio for direct Brady printing (actual Brady print size is set by the label stock loaded in the
          printer). The DPI and orientation settings only affect ZPL export - match DPI to your Zebra printer's print
          head resolution (check the printer's spec sheet or configuration label; 203 dpi is the more common default),
          and use Rotate 90° if labels are coming out sideways for how your stock is loaded.
        </p>
      </CardContent>
    </Card>
  );
}
