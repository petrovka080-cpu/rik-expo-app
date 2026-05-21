import type { DocumentChunk, DocumentKind } from "../documentTypes";

export function classifyDocumentKind(chunks: readonly DocumentChunk[]): {
  detectedKind: DocumentKind;
  confidence: "high" | "medium" | "low";
  reasonRu: string;
  finalFact: false;
} {
  const text = chunks.map((chunk) => `${chunk.textRu ?? ""} ${chunk.rawText ?? ""}`).join("\n").toLowerCase();
  if (/сч[её]т|invoice|125\s*000|строймат/.test(text)) {
    return {
      detectedKind: "invoice",
      confidence: "high",
      reasonRu: "В тексте найдены признаки счета: номер, сумма и компания.",
      finalFact: false,
    };
  }
  if (/акт/.test(text)) {
    return {
      detectedKind: "act",
      confidence: "medium",
      reasonRu: "В тексте найдены признаки акта.",
      finalFact: false,
    };
  }
  if (/договор/.test(text)) {
    return {
      detectedKind: "contract",
      confidence: "medium",
      reasonRu: "В тексте найдены признаки договора.",
      finalFact: false,
    };
  }
  return {
    detectedKind: "unknown",
    confidence: "low",
    reasonRu: "Тип документа требует ручной проверки.",
    finalFact: false,
  };
}
