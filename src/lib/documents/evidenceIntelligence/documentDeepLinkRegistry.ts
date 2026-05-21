import type { DocumentAsset, DocumentChunk } from "./documentTypes";

export function buildDocumentDeepLink(input: {
  document: Pick<DocumentAsset, "id">;
  page?: number;
  chunk?: Pick<DocumentChunk, "id">;
  highlightText?: string;
}) {
  return {
    route: "/pdf-viewer",
    params: {
      entityId: input.document.id,
      id: input.document.id,
      documentId: input.document.id,
      sourceKind: "document_evidence",
      ...(input.chunk ? { chunkId: input.chunk.id } : {}),
    },
    page: input.page,
    chunkId: input.chunk?.id,
    highlightText: input.highlightText,
    anchor: input.chunk ? `chunk-${input.chunk.id}` : undefined,
  };
}
