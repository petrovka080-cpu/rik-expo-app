import type { DocumentChunk, DocumentChunkField } from "./documentTypes";

export function createDocumentChunk(input: {
  documentId: string;
  chunkIndex: number;
  textRu?: string;
  rawText?: string;
  pageNumber?: number;
  createdAt: string;
  source?: DocumentChunk["source"];
  extractedFields?: {
    field: DocumentChunkField;
    valueRu: string;
    confidence?: "high" | "medium" | "low";
  }[];
}): DocumentChunk {
  return {
    id: `${input.documentId}:chunk-${input.chunkIndex}`,
    documentId: input.documentId,
    pageNumber: input.pageNumber,
    chunkIndex: input.chunkIndex,
    textRu: input.textRu,
    rawText: input.rawText,
    extractedFields: (input.extractedFields ?? []).map((field) => ({
      field: field.field,
      valueRu: field.valueRu,
      confidence: field.confidence ?? "medium",
      requiresReview: true,
    })),
    source: input.source ?? "pdf_text",
    confidence: "medium",
    createdAt: input.createdAt,
  };
}
