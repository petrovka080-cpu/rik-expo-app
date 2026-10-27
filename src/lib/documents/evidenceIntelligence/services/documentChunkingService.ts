import { createDocumentChunk } from "../documentChunk";
import { DOCUMENT_LIMITS } from "../documentLimits";
import type { DocumentChunk } from "../documentTypes";
import type { ParsedDocumentPage } from "./documentParserService";

export function chunkDocumentPages(input: {
  documentId: string;
  pages: ParsedDocumentPage[];
  createdAt: string;
  maxChunkChars?: number;
}): DocumentChunk[] {
  const maxChunkChars = input.maxChunkChars ?? DOCUMENT_LIMITS.maxChunkChars;
  const chunks: DocumentChunk[] = [];

  for (const page of input.pages) {
    const sourceText = page.textRu.trim();
    if (!sourceText) continue;
    for (let offset = 0; offset < sourceText.length; offset += maxChunkChars) {
      const textRu = sourceText.slice(offset, offset + maxChunkChars);
      chunks.push(
        createDocumentChunk({
          documentId: input.documentId,
          chunkIndex: chunks.length,
          textRu,
          rawText: textRu,
          pageNumber: page.pageNumber,
          createdAt: input.createdAt,
          source: page.source,
        }),
      );
      if (chunks.length >= DOCUMENT_LIMITS.maxChunksPerDocument) return chunks;
    }
  }

  return chunks;
}
