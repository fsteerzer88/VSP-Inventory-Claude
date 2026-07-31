import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ScanText } from "lucide-react";
import type { DetectedWord } from "@/lib/ocr";

interface OcrFillSelectProps {
  words: DetectedWord[];
  onPick: (text: string) => void;
  label: string;
}

// A compact "fill this field from the scanned photo" menu button - reuses one OCR pass
// (run once on the label photo) across every field in a form instead of each field
// requiring its own separate photo capture.
export function OcrFillSelect({ words, onPick, label }: OcrFillSelectProps) {
  if (words.length === 0) return null;
  return (
    <Select onValueChange={onPick}>
      <SelectTrigger
        className="h-10 w-auto shrink-0 gap-1 px-2"
        aria-label={`Fill ${label} from photo text`}
        title={`Fill ${label} from photo text`}
      >
        <ScanText className="h-4 w-4" />
      </SelectTrigger>
      <SelectContent>
        {words.map((word, i) => (
          <SelectItem key={`${word.text}-${i}`} value={word.text}>
            {word.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
