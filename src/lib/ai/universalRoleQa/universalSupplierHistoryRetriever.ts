import type { AiContextGraphBuildResult, AiSourceRef } from "../appContextGraph";
import type { UniversalRoleQaRetrievalRequest, UniversalRoleQaRetrievedItem } from "./universalAppDataRetriever";
import { normalizeUniversalRoleQaQuestion, uniqueUniversalStrings } from "./universalQuestionNormalizer";

export type UniversalSupplierHistoryRetrievalResult = {
  source: "supplier_history";
  used: boolean;
  checkedEmpty: boolean;
  items: UniversalRoleQaRetrievedItem[];
  sourceRefs: AiSourceRef[];
};

export function retrieveUniversalSupplierHistory(
  request: UniversalRoleQaRetrievalRequest,
  graph: AiContextGraphBuildResult,
): UniversalSupplierHistoryRetrievalResult {
  const material = request.query.filters.material?.normalizedNameRu;
  const historyNodes = graph.nodes
    .filter((node) => ["supplier", "purchase_order", "invoice"].includes(node.ref.entityType))
    .filter((node) => !material || normalizeUniversalRoleQaQuestion(`${node.titleRu} ${node.facts.map((fact) => fact.valueRu).join(" ")}`).includes(material));
  const nodes = (historyNodes.length
    ? historyNodes
    : graph.nodes.filter((node) => ["supplier", "purchase_order", "invoice"].includes(node.ref.entityType)))
    .slice(0, request.limits.maxMarketplaceOffers);
  const items = nodes.map((node) => ({
    textRu: `История поставщика: ${node.titleRu}`,
    sourceRefIds: uniqueUniversalStrings([node.ref.id, ...node.links.map((link) => link.targetRefId)]),
    status: "found" as const,
    entityType: node.ref.entityType,
    entityId: node.ref.entityId,
  }));
  const refIds = new Set(items.flatMap((item) => item.sourceRefIds));
  return {
    source: "supplier_history",
    used: items.length > 0,
    checkedEmpty: items.length === 0,
    items,
    sourceRefs: graph.sourceRefs.filter((ref) => refIds.has(ref.id)),
  };
}
