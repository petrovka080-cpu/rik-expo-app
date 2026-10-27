import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type {
  BuyerRequest,
  BuyerRequestLine,
  BuyerSourcingContext,
  BuyerSourcingOffer,
} from "./buyerSourcingTypes";

const FORBIDDEN_BUYER_SOURCE_TYPES = new Set<ConstructionKnowledgeSource["type"]>([
  "payment",
]);

function matchesLinkedContext(source: ConstructionKnowledgeSource, request: BuyerRequest, line?: BuyerRequestLine): boolean {
  if (FORBIDDEN_BUYER_SOURCE_TYPES.has(source.type)) return false;
  if (!source.linkedObjectId && !source.linkedWorkId && !source.linkedMaterialId && !source.linkedEstimateLineId) return true;
  if (source.linkedObjectId && request.objectId && source.linkedObjectId === request.objectId) return true;
  if (source.linkedWorkId && request.workId && source.linkedWorkId === request.workId) return true;
  if (line?.materialId && source.linkedMaterialId === line.materialId) return true;
  return Boolean(line?.id && source.type === "procurement_request" && source.id.includes(request.id));
}

export function sanitizeBuyerSources(params: {
  sources: readonly ConstructionKnowledgeSource[];
  request: BuyerRequest;
  line?: BuyerRequestLine;
}): ConstructionKnowledgeSource[] {
  const unique = new Map<string, ConstructionKnowledgeSource>();
  for (const source of params.sources) {
    if (!matchesLinkedContext(source, params.request, params.line)) continue;
    unique.set(source.id, { ...source });
  }
  return Array.from(unique.values());
}

export function sanitizeBuyerOffers(context: BuyerSourcingContext, line?: BuyerRequestLine): BuyerSourcingOffer[] {
  const unique = new Map<string, BuyerSourcingOffer>();
  for (const offer of context.offers) {
    if (offer.requestId && offer.requestId !== context.request.id) continue;
    if (line?.id && offer.requestLineId && offer.requestLineId !== line.id) continue;
    if ((offer.sourceType === "external_marketplace" || offer.sourceType === "internet_source") && !offer.sourceUrl && !offer.sourceDocumentId) continue;
    if ((offer.sourceType === "external_marketplace") && !context.externalMarketplaceConnected) continue;
    if ((offer.sourceType === "internet_source") && !context.internetSourcingConnected) continue;
    if (!offer.sourceLabelRu || !offer.lastCheckedAt) continue;
    unique.set(offer.id, { ...offer, riskReasonsRu: [...offer.riskReasonsRu] });
  }
  return Array.from(unique.values());
}

export function sanitizeBuyerContext(context: BuyerSourcingContext): BuyerSourcingContext {
  const line = context.request.lines.find((item) => item.id === context.selectedRequestLineId) ?? context.request.lines[0];
  return {
    ...context,
    sourcePriority: [...(context.sourcePriority ?? [])],
    sources: sanitizeBuyerSources({ sources: context.sources, request: context.request, line }),
    warehouseStock: context.warehouseStock
      .filter((stock) => !line || !stock.requestLineId || stock.requestLineId === line.id)
      .map((stock) => ({ ...stock })),
    offers: sanitizeBuyerOffers(context, line),
  };
}
