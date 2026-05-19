import type { BuyerSourcingOffer } from "../buyerSourcing";
import type {
  MarketplaceDataProviderResult,
  MarketplaceIntakeContext,
  MarketplaceIntakeProviderDescriptor,
  MarketplaceIntakeProviderKey,
  MarketplaceLinkedBuyerRequest,
  MarketplaceOfferDraft,
} from "./marketplaceIntakeTypes";
import { resolveMarketplacePermissions } from "./marketplaceIntakeRolePolicy";

export const REQUIRED_MARKETPLACE_INTAKE_PROVIDER_KEYS: readonly MarketplaceIntakeProviderKey[] = [
  "aiMarketplaceScreenContextProvider",
  "aiMarketplaceOfferDraftProvider",
  "aiMarketplaceProductDraftProvider",
  "aiMarketplaceServiceDraftProvider",
  "aiMarketplaceDocumentProvider",
  "aiMarketplaceModerationProvider",
  "aiMarketplaceBuyerSourceProvider",
  "aiMarketplaceRequestMatchProvider",
  "aiMarketplaceRoleAccessPolicyProvider",
  "aiMarketplaceSourceSanitizer",
  "aiMarketplaceAnswerComposer",
] as const;

function descriptor(key: MarketplaceIntakeProviderKey): MarketplaceIntakeProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const MARKETPLACE_INTAKE_PROVIDER_REGISTRY: readonly MarketplaceIntakeProviderDescriptor[] =
  REQUIRED_MARKETPLACE_INTAKE_PROVIDER_KEYS.map(descriptor);

export function listMarketplaceIntakeDataProviders(): MarketplaceIntakeProviderDescriptor[] {
  return MARKETPLACE_INTAKE_PROVIDER_REGISTRY.map((provider) => ({ ...provider }));
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): MarketplaceDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function result(params: Partial<MarketplaceDataProviderResult>): MarketplaceDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    offers: params.offers ?? [],
    buyerSources: params.buyerSources ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

export function validateMarketplaceOfferDraft(offer: MarketplaceOfferDraft): string[] {
  return [
    ...(offer.ownerId ? [] : ["владелец карточки"]),
    ...(offer.ownerRole ? [] : ["роль владельца"]),
    ...(offer.titleRu ? [] : ["название"]),
    ...(offer.category ? [] : ["категория"]),
    ...(offer.unit ? [] : ["единица измерения"]),
    ...(typeof offer.price === "number" ? [] : ["цена"]),
    ...(offer.currency ? [] : ["валюта"]),
    ...(offer.availability !== "unknown" ? [] : ["наличие"]),
    ...(offer.deliveryRegion ? [] : ["регион доставки/работ"]),
    ...(typeof offer.deliveryDays === "number" ? [] : ["срок поставки/доступности"]),
    ...(offer.documents.length > 0 ? [] : ["документ, сертификат, лицензия или прайс"]),
    ...(offer.sourceRefs.length > 0 ? [] : ["source trace"]),
  ];
}

function selectedOffer(context: MarketplaceIntakeContext): MarketplaceOfferDraft | undefined {
  return context.offerDrafts.find((offer) => offer.id === context.selectedOfferId) ?? context.offerDrafts[0];
}

export function marketplaceDraftToBuyerSourcingOffer(
  offer: MarketplaceOfferDraft,
  params: {
    request?: MarketplaceLinkedBuyerRequest;
    checkedAt: string;
  },
): BuyerSourcingOffer | null {
  if (offer.moderationStatus !== "approved") return null;
  if (!offer.ownerId || offer.sourceRefs.length === 0) return null;
  if (typeof offer.price !== "number" || !offer.currency) return null;
  if (offer.availability === "unknown") return null;
  const buyerAvailability: BuyerSourcingOffer["availability"] =
    offer.availability === "scheduled" ? "on_request" : offer.availability;
  return {
    id: `own-marketplace:${offer.id}`,
    requestId: params.request?.requestId ?? "marketplace-approved-source",
    requestLineId: params.request?.requestLineId,
    sourceType: "own_marketplace",
    supplierId: offer.ownerId,
    supplierNameRu: offer.ownerNameRu ?? `${offer.ownerRole} ${offer.ownerId}`,
    itemNameRu: offer.titleRu,
    specificationMatch: params.request?.matchKind === "analog"
      ? "close_analog"
      : params.request?.matchKind === "needs_review"
        ? "needs_review"
        : "exact",
    quantityAvailable: offer.quantityAvailable,
    unit: offer.unit,
    price: offer.price,
    currency: offer.currency,
    priceDate: offer.priceValidUntil,
    deliveryDays: offer.deliveryDays,
    deliveryRegion: offer.deliveryRegion,
    availability: buyerAvailability,
    minOrderQty: offer.minOrderQty,
    riskLevel: offer.riskFlags.length === 0 ? "low" : offer.riskFlags.length > 2 ? "high" : "medium",
    riskReasonsRu: offer.riskFlags,
    sourceLabelRu: `наш marketplace: ${offer.id}`,
    sourceDocumentId: offer.documents[0]?.documentId,
    lastCheckedAt: params.checkedAt,
  };
}

export function aiMarketplaceScreenContextProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  return result({
    facts: [
      fact("marketplace:screen", `Экран ${context.screenId}: роль ${context.role}, карточек видно ${context.offerDrafts.length}.`),
    ],
  });
}

export function aiMarketplaceOfferDraftProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const offer = selectedOffer(context);
  return result({
    offers: offer ? [offer] : [],
    facts: offer ? [fact(`offer:${offer.id}`, `Карточка ${offer.id}: ${offer.titleRu}, статус ${offer.moderationStatus}.`, offer.sourceRefs)] : [],
    missingData: offer ? validateMarketplaceOfferDraft(offer) : ["черновик карточки не найден"],
    exactNoDataReasonRu: offer ? undefined : "Черновик карточки marketplace не найден.",
  });
}

export function aiMarketplaceProductDraftProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const products = context.offerDrafts.filter((offer) => offer.offerType === "product");
  return result({
    offers: products,
    facts: [fact("offer:products", `Товарных карточек видно: ${products.length}.`, products.flatMap((offer) => offer.sourceRefs))],
    missingData: products.length === 0 ? ["нет черновика товара"] : products.flatMap(validateMarketplaceOfferDraft),
  });
}

export function aiMarketplaceServiceDraftProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const services = context.offerDrafts.filter((offer) => offer.offerType === "service");
  return result({
    offers: services,
    facts: [fact("offer:services", `Карточек услуг видно: ${services.length}.`, services.flatMap((offer) => offer.sourceRefs))],
    missingData: services.length === 0 ? ["нет черновика услуги"] : services.flatMap(validateMarketplaceOfferDraft),
  });
}

export function aiMarketplaceDocumentProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const documents = context.offerDrafts.flatMap((offer) => offer.documents.map((document) => ({
    offer,
    document,
  })));
  return result({
    facts: documents.map(({ offer, document }) =>
      fact(`document:${document.documentId}`, `${offer.id}: документ ${document.fileName}, тип ${document.documentType}.`, [document.documentId]),
    ),
    missingData: documents.length === 0 ? ["документы/сертификаты/прайс не прикреплены"] : [],
  });
}

export function aiMarketplaceModerationProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const offer = selectedOffer(context);
  const permissions = resolveMarketplacePermissions(context);
  return result({
    offers: offer ? [offer] : [],
    facts: offer ? [
      fact(
        `moderation:${offer.id}`,
        `Карточка ${offer.id}: модерация ${offer.moderationStatus}, прямая публикация запрещена.`,
        offer.sourceRefs,
      ),
    ] : [],
    missingData: offer ? validateMarketplaceOfferDraft(offer) : ["нет карточки для модерации"],
    permissionLimited: permissions.canSubmitModeration ? [] : ["роль не может отправлять карточку на модерацию"],
  });
}

export function aiMarketplaceBuyerSourceProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const buyerSources = context.offerDrafts
    .map((offer) => marketplaceDraftToBuyerSourcingOffer(offer, {
      request: context.buyerRequests[0],
      checkedAt: context.checkedAt,
    }))
    .filter((offer): offer is BuyerSourcingOffer => Boolean(offer));
  return result({
    buyerSources,
    facts: [fact("buyer:sources", `Approved marketplace source для buyer sourcing: ${buyerSources.length}.`, buyerSources.map((offer) => offer.id))],
    missingData: buyerSources.length === 0 ? ["approved marketplace source для buyer sourcing не найден"] : [],
  });
}

export function aiMarketplaceRequestMatchProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  return result({
    facts: context.buyerRequests.map((request) =>
      fact(
        `request-match:${request.requestId}`,
        `${request.itemRu}: совпадение ${request.matchKind}, нужно ${request.quantity} ${request.unit}.`,
        request.sourceRefs,
      ),
    ),
    missingData: context.buyerRequests.length === 0 ? ["активные заявки для сопоставления не найдены"] : [],
  });
}

export function aiMarketplaceRoleAccessPolicyProvider(context: MarketplaceIntakeContext): MarketplaceDataProviderResult {
  const permissions = resolveMarketplacePermissions(context);
  return result({
    facts: [
      fact(
        "role:policy",
        `Роль ${context.role}: product ${permissions.canAddMarketplaceProduct ? "разрешен" : "не разрешен"}, service ${permissions.canAddMarketplaceService ? "разрешен" : "не разрешен"}, direct publish/order запрещены.`,
      ),
    ],
  });
}

export const MARKETPLACE_INTAKE_DATA_PROVIDER_FUNCTIONS: Record<MarketplaceIntakeProviderKey, (context: MarketplaceIntakeContext) => MarketplaceDataProviderResult> = {
  aiMarketplaceScreenContextProvider,
  aiMarketplaceOfferDraftProvider,
  aiMarketplaceProductDraftProvider,
  aiMarketplaceServiceDraftProvider,
  aiMarketplaceDocumentProvider,
  aiMarketplaceModerationProvider,
  aiMarketplaceBuyerSourceProvider,
  aiMarketplaceRequestMatchProvider,
  aiMarketplaceRoleAccessPolicyProvider,
  aiMarketplaceSourceSanitizer: (context) => result({ facts: [fact("source:sanitizer", `Источники очищены: ${context.sources.length}.`)] }),
  aiMarketplaceAnswerComposer: (context) => result({ facts: [fact("answer:composer", `Ответ собирается без публикации и заказа для ${context.screenId}.`)] }),
};
