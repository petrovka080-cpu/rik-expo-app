import { buildAiAppContextGraph, type AiContextGraphBuildResult } from "../../../ai/appContextGraph";
import type { AiContextGraphRole } from "../../../ai/appContextGraph/aiPermissionAwareLinkResolver";
import type { DocumentAsset, DocumentChunk, DocumentSourceRef } from "../documentTypes";
import { createDocumentAssetSourceRef, createDocumentChunkSourceRef, toAiSourceRef } from "../documentSourceRef";

export function buildDocumentAppContextGraph(input: {
  document: DocumentAsset;
  chunks: readonly DocumentChunk[];
  role: AiContextGraphRole;
  screenId: string;
}): AiContextGraphBuildResult & { documentSourceRefs: DocumentSourceRef[] } {
  const documentSourceRef = createDocumentAssetSourceRef({ document: input.document, canOpen: true });
  const chunkSourceRefs = input.chunks.flatMap((chunk) =>
    chunk.extractedFields.map((field) =>
      createDocumentChunkSourceRef({
        document: input.document,
        chunk,
        field: field.field,
        valuePreviewRu: field.valueRu,
        highlightText: field.valueRu,
        canOpen: true,
      }),
    ),
  );
  const documentSourceRefs = [documentSourceRef, ...chunkSourceRefs];
  const graph = buildAiAppContextGraph({
    role: input.role,
    screenId: input.screenId,
    entities: [
      {
        entityType: "pdf_document",
        entityId: input.document.id,
        labelRu: documentSourceRef.labelRu,
        origin: "pdf_document",
        appLink: documentSourceRef.appLink,
        evidence: {
          field: "document",
          valuePreviewRu: input.document.documentKind,
          documentPage: 1,
          confidence: "medium",
        },
        canBePresentedAsFact: false,
        requiresReview: true,
      },
      ...chunkSourceRefs.map((ref) => ({
        entityType: "document_chunk" as const,
        entityId: ref.entityId,
        labelRu: ref.labelRu,
        origin: "document_chunk" as const,
        appLink: ref.appLink,
        evidence: {
          field: ref.evidence?.field,
          valuePreviewRu: ref.evidence?.valuePreviewRu,
          documentPage: ref.evidence?.pageNumber,
          documentChunkId: ref.evidence?.chunkId,
          confidence: ref.evidence?.confidence,
        },
        canBePresentedAsFact: false,
        requiresReview: true,
      })),
    ],
  });

  return {
    ...graph,
    sourceRefs: [...graph.sourceRefs, ...documentSourceRefs.map(toAiSourceRef)],
    documentSourceRefs,
  };
}
