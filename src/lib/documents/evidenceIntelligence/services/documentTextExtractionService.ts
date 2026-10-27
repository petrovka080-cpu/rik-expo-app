import type { DocumentChunk, DocumentChunkField } from "../documentTypes";

const FIELD_PATTERNS: { field: DocumentChunkField; regex: RegExp }[] = [
  { field: "amount", regex: /(\d[\d\s]{2,})\s*(KGS|сом|руб|USD|EUR)/i },
  { field: "document_number", regex: /(счет|счёт|акт|договор)\s*№\s*([A-Za-zА-Яа-я0-9-]+)/i },
  { field: "company_name", regex: /(ОсОО|ООО|ИП)\s+[“"]?([^”"\n]+)/i },
  { field: "material", regex: /(ГКЛ|профиль|саморез|лента|цемент|бетон)/i },
];

export function extractDocumentFieldsFromText(chunks: DocumentChunk[]): DocumentChunk[] {
  return chunks.map((chunk) => {
    const text = `${chunk.textRu ?? ""}\n${chunk.rawText ?? ""}`;
    const extractedFields = [...chunk.extractedFields];
    for (const pattern of FIELD_PATTERNS) {
      const match = pattern.regex.exec(text);
      if (!match) continue;
      const valueRu = pattern.field === "amount"
        ? `${match[1].replace(/\s+/g, " ")} ${match[2]}`
        : match[0];
      extractedFields.push({
        field: pattern.field,
        valueRu,
        confidence: "medium",
        requiresReview: true,
      });
    }
    return {
      ...chunk,
      extractedFields,
    };
  });
}
