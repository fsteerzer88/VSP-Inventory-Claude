import * as Tesseract from "tesseract.js";

export interface DetectedWord {
  text: string;
  confidence: number;
}

// Requires internet access the first time it's used (fetches the OCR engine + language
// data from a CDN, then caches them in the browser) - not a hard dependency of the app,
// just of this one assist feature.
export async function detectWordsInImage(file: File | Blob): Promise<DetectedWord[]> {
  const worker = await Tesseract.createWorker("eng");
  try {
    // Sparse-text mode is meant for scattered/isolated text (like a label on packaging)
    // rather than a full paragraph, which is what the default page segmentation mode
    // assumes - that mismatch is the usual cause of OCR output that looks unrelated to
    // what's actually in the photo. No character whitelist here (unlike a SKU-only
    // scanner) since this is reused for name/manufacturer/category/etc, which can
    // contain punctuation a narrow whitelist would strip.
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT });
    const result = await worker.recognize(file, {}, { blocks: true });
    return (result.data.blocks ?? [])
      .flatMap((block) => block.paragraphs)
      .flatMap((paragraph) => paragraph.lines)
      .flatMap((line) => line.words)
      .map((word) => ({ text: word.text.trim(), confidence: word.confidence }))
      .filter((word) => word.text.length > 0);
  } finally {
    await worker.terminate();
  }
}
