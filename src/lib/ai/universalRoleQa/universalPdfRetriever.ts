import type { AiContextGraphBuildResult, AiSourceRef } from "../appContextGraph";
import type { UniversalRoleQaRetrievalRequest, UniversalRoleQaRetrievedItem } from "./universalAppDataRetriever";
import { uniqueUniversalStrings } from "./universalQuestionNormalizer";

export type UniversalRoleQaPdfRetrievalResult = {
  source: "pdf_document";
  used: boolean;
  checkedEmpty: boolean;
  items: UniversalRoleQaRetrievedItem[];
  sourceRefs: AiSourceRef[];
};

export function retrieveUniversalPdfDocuments(
  request: UniversalRoleQaRetrievalRequest,
  graph: AiContextGraphBuildResult,
): UniversalRoleQaPdfRetrievalResult {
  const pdfNodes = graph.nodes
    .filter((node) => node.ref.entityType === "pdf_document" || node.ref.entityType === "document")
    .slice(0, request.limits.maxPdfChunks);
  const items = pdfNodes.map((node) => ({
    textRu: [
      node.titleRu,
      node.ref.evidence?.valuePreviewRu ? `фрагмент: ${node.ref.evidence.valuePreviewRu}` : null,
      node.ref.appLink?.page ? `страница: ${node.ref.appLink.page}` : null,
      node.missingLinks.length ? `не хватает: ${node.missingLinks.map((link) => link.reasonRu).join("; ")}` : null,
    ].filter(Boolean).join("; "),
    sourceRefIds: uniqueUniversalStrings([node.ref.id, ...node.links.map((link) => link.targetRefId)]),
    status: node.missingLinks.length ? "risk" as const : "found" as const,
    entityType: node.ref.entityType,
    entityId: node.ref.entityId,
  }));

  const refIds = new Set(items.flatMap((item) => item.sourceRefIds));
  return {
    source: "pdf_document",
    used: items.length > 0,
    checkedEmpty: items.length === 0,
    items,
    sourceRefs: graph.sourceRefs.filter((ref) => refIds.has(ref.id)),
  };
}
