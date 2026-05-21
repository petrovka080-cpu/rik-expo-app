import type { AiContextGraphBuildResult, AiSourceRef } from "../appContextGraph";
import type { UniversalRoleQaRetrievalRequest, UniversalRoleQaRetrievedItem } from "./universalAppDataRetriever";
import { normalizeUniversalRoleQaQuestion, uniqueUniversalStrings } from "./universalQuestionNormalizer";

export type UniversalRoleQaMarketplaceRetrievalResult = {
  source: "internal_marketplace";
  used: boolean;
  checkedEmpty: boolean;
  items: UniversalRoleQaRetrievedItem[];
  sourceRefs: AiSourceRef[];
};

export function retrieveUniversalMarketplace(
  request: UniversalRoleQaRetrievalRequest,
  graph: AiContextGraphBuildResult,
): UniversalRoleQaMarketplaceRetrievalResult {
  const material = request.query.filters.material?.normalizedNameRu;
  const marketplaceNodes = graph.nodes
    .filter((node) => node.ref.entityType === "marketplace_product" || node.ref.entityType === "supplier")
    .filter((node) => !material || normalizeUniversalRoleQaQuestion(`${node.titleRu} ${node.facts.map((fact) => fact.valueRu).join(" ")}`).includes(material));
  const nodes = (marketplaceNodes.length
    ? marketplaceNodes
    : graph.nodes.filter((node) => node.ref.entityType === "marketplace_product" || node.ref.entityType === "supplier"))
    .slice(0, request.limits.maxMarketplaceOffers);
  const items = nodes.map((node) => ({
    textRu: [node.titleRu, ...node.facts.filter((fact) => fact.key !== "label").slice(0, 3).map((fact) => `${fact.key}: ${fact.valueRu}`)].join("; "),
    sourceRefIds: uniqueUniversalStrings([node.ref.id, ...node.links.map((link) => link.targetRefId)]),
    status: "found" as const,
    entityType: node.ref.entityType,
    entityId: node.ref.entityId,
  }));
  const refIds = new Set(items.flatMap((item) => item.sourceRefIds));
  return {
    source: "internal_marketplace",
    used: items.length > 0,
    checkedEmpty: items.length === 0,
    items,
    sourceRefs: graph.sourceRefs.filter((ref) => refIds.has(ref.id)),
  };
}
