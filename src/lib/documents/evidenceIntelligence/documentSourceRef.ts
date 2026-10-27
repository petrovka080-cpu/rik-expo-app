import type { AiSourceRef } from "../../ai/appContextGraph";
import { buildDocumentDeepLink } from "./documentDeepLinkRegistry";
import type { DocumentAsset, DocumentChunk, DocumentSourceRef } from "./documentTypes";

export function createDocumentAssetSourceRef(input: {
  document: DocumentAsset;
  canOpen?: boolean;
  labelRu?: string;
}): DocumentSourceRef {
  return {
    id: `document-source:${input.document.id}`,
    origin: "pdf_document",
    entityType: "pdf_document",
    entityId: input.document.id,
    labelRu: input.labelRu ?? `PDF документа ${input.document.id}`,
    documentKind: input.document.documentKind,
    appLink: buildDocumentDeepLink({ document: input.document, page: 1 }),
    permission: {
      canOpen: input.canOpen ?? true,
    },
    evidence: {
      confidence: "medium",
    },
    canBePresentedAsFact: false,
    requiresReview: true,
  };
}

export function createDocumentChunkSourceRef(input: {
  document: DocumentAsset;
  chunk: DocumentChunk;
  field: string;
  valuePreviewRu: string;
  highlightText?: string;
  canOpen?: boolean;
}): DocumentSourceRef {
  return {
    id: `document-chunk-source:${input.chunk.id}:${input.field}`,
    origin: "document_chunk",
    entityType: "document_chunk",
    entityId: input.chunk.id,
    labelRu: `Фрагмент PDF: ${input.field}`,
    documentKind: input.document.documentKind,
    appLink: buildDocumentDeepLink({
      document: input.document,
      chunk: input.chunk,
      page: input.chunk.pageNumber,
      highlightText: input.highlightText ?? input.valuePreviewRu,
    }),
    permission: {
      canOpen: input.canOpen ?? true,
    },
    evidence: {
      field: input.field,
      valuePreviewRu: input.valuePreviewRu,
      pageNumber: input.chunk.pageNumber,
      chunkId: input.chunk.id,
      confidence: input.chunk.confidence,
    },
    canBePresentedAsFact: false,
    requiresReview: true,
  };
}

export function toAiSourceRef(ref: DocumentSourceRef): AiSourceRef {
  return {
    id: ref.id,
    origin: ref.origin,
    entityType: ref.entityType,
    entityId: ref.entityId,
    labelRu: ref.labelRu,
    descriptionRu: ref.descriptionRu,
    appLink: ref.appLink,
    permission: ref.permission,
    evidence: ref.evidence
      ? {
          field: ref.evidence.field,
          valuePreviewRu: ref.evidence.valuePreviewRu,
          documentPage: ref.evidence.pageNumber,
          documentChunkId: ref.evidence.chunkId,
          confidence: ref.evidence.confidence,
        }
      : undefined,
    canBePresentedAsFact: ref.canBePresentedAsFact,
    requiresReview: ref.requiresReview,
  };
}
