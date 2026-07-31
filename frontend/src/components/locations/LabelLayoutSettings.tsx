import { useEffect, useState } from "react";
import { BUILT_IN_LABEL_LAYOUTS, CUSTOM_LAYOUT_ID, type LabelLayout, type LabelLayoutMode } from "@/lib/label-layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NumberField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  // Re-sync when the value changes from outside this field (e.g. switching presets) -
  // but not on every keystroke from this field's own onChange, so mid-typing states
  // like "" or "1." aren't clobbered while the user is still editing.
  useEffect(() => setText(String(value)), [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step="0.01"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
        }}
      />
    </div>
  );
}

export function LabelLayoutSettings({
  layout,
  onChange,
}: {
  layout: LabelLayout;
  onChange: (layout: LabelLayout) => void;
}) {
  const preset = BUILT_IN_LABEL_LAYOUTS.find((l) => l.id === layout.id);

  function selectPreset(id: string) {
    if (id === CUSTOM_LAYOUT_ID) {
      onChange({ ...layout, id: CUSTOM_LAYOUT_ID, name: "Custom" });
      return;
    }
    const found = BUILT_IN_LABEL_LAYOUTS.find((l) => l.id === id);
    if (found) onChange(found);
  }

  function update(patch: Partial<LabelLayout>) {
    onChange({ ...layout, ...patch, id: CUSTOM_LAYOUT_ID, name: "Custom" });
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle className="text-base">Label settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="label-preset">Label stock</Label>
          <Select value={preset ? preset.id : CUSTOM_LAYOUT_ID} onValueChange={selectPreset}>
            <SelectTrigger id="label-preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUILT_IN_LABEL_LAYOUTS.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_LAYOUT_ID}>Custom</SelectItem>
            </SelectContent>
          </Select>
          {preset?.description && <p className="text-xs text-muted-foreground">{preset.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={layout.mode === "sheet" ? "default" : "outline"}
            onClick={() => update({ mode: "sheet" as LabelLayoutMode })}
          >
            Sheet (multiple per page)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={layout.mode === "single" ? "default" : "outline"}
            onClick={() => update({ mode: "single" as LabelLayoutMode })}
          >
            Single label per page
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            id="label-width"
            label="Label width (in)"
            value={layout.labelWidthIn}
            onCommit={(v) => update({ labelWidthIn: v })}
          />
          <NumberField
            id="label-height"
            label="Label height (in)"
            value={layout.labelHeightIn}
            onCommit={(v) => update({ labelHeightIn: v })}
          />
          {layout.mode === "sheet" && (
            <>
              <NumberField
                id="label-columns"
                label="Columns"
                value={layout.columns}
                onCommit={(v) => update({ columns: Math.round(v) })}
              />
              <NumberField
                id="page-width"
                label="Page width (in)"
                value={layout.pageWidthIn}
                onCommit={(v) => update({ pageWidthIn: v })}
              />
              <NumberField
                id="page-height"
                label="Page height (in)"
                value={layout.pageHeightIn}
                onCommit={(v) => update({ pageHeightIn: v })}
              />
              <NumberField
                id="margin-top"
                label="Top margin (in)"
                value={layout.marginTopIn}
                onCommit={(v) => update({ marginTopIn: v })}
              />
              <NumberField
                id="margin-left"
                label="Left margin (in)"
                value={layout.marginLeftIn}
                onCommit={(v) => update({ marginLeftIn: v })}
              />
              <NumberField
                id="col-gap"
                label="Column gap (in)"
                value={layout.columnGapIn}
                onCommit={(v) => update({ columnGapIn: v })}
              />
              <NumberField
                id="row-gap"
                label="Row gap (in)"
                value={layout.rowGapIn}
                onCommit={(v) => update({ rowGapIn: v })}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
