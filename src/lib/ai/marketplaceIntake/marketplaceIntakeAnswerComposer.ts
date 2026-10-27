import {
  marketplaceDraftToBuyerSourcingOffer,
  validateMarketplaceOfferDraft,
} from "./marketplaceIntakeDataProviders";
import type {
  MarketplaceIntakeAnswer,
  MarketplaceIntakeContext,
  MarketplaceIntakeIntent,
  MarketplaceLinkedBuyerRequest,
  MarketplaceOfferDraft,
} from "./marketplaceIntakeTypes";

function selectOffer(context: MarketplaceIntakeContext, intent: MarketplaceIntakeIntent): MarketplaceOfferDraft | undefined {
  const byId = context.offerDrafts.find((offer) => offer.id === context.selectedOfferId);
  if (byId) return byId;
  if (intent === "add_product_draft") return context.offerDrafts.find((offer) => offer.offerType === "product");
  if (intent === "add_service_draft") return context.offerDrafts.find((offer) => offer.offerType === "service");
  return context.offerDrafts[0];
}

function compatibleMatches(offer: MarketplaceOfferDraft | undefined, requests: MarketplaceLinkedBuyerRequest[]): MarketplaceLinkedBuyerRequest[] {
  if (!offer) return requests;
  const title = offer.titleRu.toLowerCase();
  const category = offer.category.toLowerCase();
  return requests.filter((request) => {
    const item = request.itemRu.toLowerCase();
    return title.includes(item) || item.includes(title) || category.includes(item) || request.matchKind !== "needs_review";
  });
}

function sourceLines(offer: MarketplaceOfferDraft | undefined): string[] {
  if (!offer) return ["- Черновик или approved source не найден."];
  const documentLines = offer.documents.map((document) => `- Документ: ${document.fileName} (${document.documentType}), ${document.documentId}`);
  const sourceRefs = offer.sourceRefs.map((source) => `- Source: ${source}`);
  return [...documentLines, ...sourceRefs].length > 0 ? [...documentLines, ...sourceRefs] : ["- Source trace не найден."];
}

function draftStatus(intent: MarketplaceIntakeIntent, missingData: string[]): string {
  if (intent === "send_to_moderation") {
    return missingData.length === 0
      ? "Карточка не опубликована. Подготовлен маршрут модерации. Заказ не создан."
      : "Карточка не опубликована. На модерацию можно отправить после заполнения missing data. Заказ не создан.";
  }
  if (intent === "add_to_shortlist_draft") {
    return "Карточка не опубликована. Заказ не создан. Подготовлен черновик shortlist.";
  }
  return "Карточка не опубликована. Заказ не создан. Данные не изменены.";
}

function answerKind(
  intent: MarketplaceIntakeIntent,
  offer: MarketplaceOfferDraft | undefined,
  permissionLimited: boolean,
): MarketplaceIntakeAnswer["answerKind"] {
  if (permissionLimited) return "permission_limited";
  if (!offer && intent !== "show_request_matches" && intent !== "marketplace_source_check") return "exact_no_data_reason";
  if (intent === "add_service_draft") return "service_draft";
  if (intent === "send_to_moderation") return "moderation_route";
  if (intent === "show_request_matches" || intent === "compare_with_request") return "request_match";
  if (intent === "marketplace_source_check") return "buyer_source_trace";
  if (intent === "add_to_shortlist_draft" || intent === "request_rfq_draft") return "shortlist_draft";
  return "offer_draft";
}

function offerSummary(offer: MarketplaceOfferDraft | undefined): string[] {
  if (!offer) return ["- Карточка: не найдена"];
  return [
    `- товар/услуга: ${offer.titleRu}`,
    `- категория: ${offer.category}`,
    `- единица: ${offer.unit || "не указана"}`,
    `- цена: ${typeof offer.price === "number" ? `${offer.price} ${offer.currency ?? ""}` : "не указана"}`,
    `- наличие: ${offer.availability}${typeof offer.quantityAvailable === "number" ? `, ${offer.quantityAvailable} ${offer.unit}` : ""}`,
    `- срок: ${typeof offer.deliveryDays === "number" ? `${offer.deliveryDays} дн.` : "не указан"}`,
    `- регион: ${offer.deliveryRegion ?? "не указан"}`,
  ];
}

export function composeMarketplaceIntakeAnswer(params: {
  context: MarketplaceIntakeContext;
  intent: MarketplaceIntakeIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
  permissionLimited: boolean;
}): MarketplaceIntakeAnswer {
  const offer = selectOffer(params.context, params.intent);
  const draftMissingData = offer ? validateMarketplaceOfferDraft(offer) : ["черновик карточки не найден"];
  const missingData = [...new Set([...params.missingData, ...draftMissingData, ...(offer?.missingData ?? [])])];
  const matches = compatibleMatches(offer, params.context.buyerRequests);
  const buyerSources = params.context.offerDrafts
    .map((item) => marketplaceDraftToBuyerSourcingOffer(item, {
      request: matches[0],
      checkedAt: params.context.checkedAt,
    }))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const kind = answerKind(params.intent, offer, params.permissionLimited);
  const canModerate = missingData.length === 0 && offer?.moderationStatus !== "approved";
  const nextStepRu = params.permissionLimited
    ? "Использовать доступные действия своей роли или запросить marketplace permission у администратора."
    : params.intent === "send_to_moderation"
      ? canModerate
        ? "Передать карточку на модерацию через существующий approval/moderation flow."
        : "Заполнить missing data, затем отправить карточку на модерацию."
      : params.intent === "marketplace_source_check"
        ? "Открыть buyer request detail и использовать только approved marketplace source."
        : "Проверить missing data и подготовить карточку к модерации без публикации.";
  const requestLines = matches.length > 0
    ? matches.map((request) => `- заявка ${request.requestId}: ${request.itemRu}, совпадение ${request.matchKind}, нужно ${request.quantity} ${request.unit}`)
    : ["- Подходящие заявки не найдены или нужны спецификация/категория/регион."];
  const riskLines = [
    ...(offer?.riskFlags ?? []),
    ...(offer?.moderationStatus === "approved" ? [] : ["карточка не approved, buyer не должен видеть ее как approved source"]),
    ...(missingData.length > 0 ? ["есть missing data перед модерацией"] : []),
  ];
  const answerRu = [
    kind === "service_draft" ? "Черновик услуги marketplace" : kind === "moderation_route" ? "Маршрут модерации marketplace" : "Черновик карточки marketplace",
    "",
    "Коротко:",
    params.permissionLimited
      ? "Действие ограничено ролью. Прямая публикация, заказ и обход модерации недоступны."
      : offer
        ? `Карточка ${offer.id} обработана как ${offer.offerType === "product" ? "товар" : "услуга"}; статус модерации ${offer.moderationStatus}.`
        : "Карточка не найдена; fake product/service не создавались.",
    "",
    "Что заполнено:",
    ...offerSummary(offer),
    "",
    "Что не хватает:",
    ...(missingData.length > 0 ? missingData.map((item) => `- ${item}`) : ["- Данных достаточно для передачи на модерацию."]),
    "",
    "Подходит к заявкам:",
    ...requestLines,
    "",
    "Источники:",
    ...sourceLines(offer),
    ...buyerSources.map((source) => `- Buyer source: ${source.sourceLabelRu}, ${source.id}`),
    "",
    "Риски:",
    ...(riskLines.length > 0 ? riskLines.map((risk) => `- ${risk}`) : ["- Критичных рисков по source-backed данным не найдено."]),
    "",
    "Следующий шаг:",
    nextStepRu,
    "",
    "Статус:",
    draftStatus(params.intent, missingData),
  ].join("\n");

  return {
    screenId: params.context.screenId,
    role: params.context.role,
    questionRu: params.questionRu,
    answerKind: kind,
    titleRu: kind === "moderation_route" ? "На модерацию" : kind === "buyer_source_trace" ? "Marketplace source для снабжения" : "Карточка marketplace",
    shortAnswerRu: offer
      ? `Карточка ${offer.id}: ${missingData.length} missing data, buyer sources ${buyerSources.length}.`
      : "Карточка не найдена; данные не изменены.",
    answerRu,
    draft: offer,
    visibleOffers: params.context.offerDrafts,
    buyerSources,
    matches,
    missingData,
    nextStepRu,
    changedData: false,
    published: false,
    orderCreated: false,
    paymentCreated: false,
    autoApproval: false,
    directPublishPathUsed: false,
    directOrderPathUsed: false,
    approvalBypassUsed: false,
    moderationRequired: true,
    providerTrace: [...new Set(params.providerTrace)],
    sourceTrace: [
      ...(offer?.sourceRefs ?? []),
      ...(offer?.documents.map((document) => document.documentId) ?? []),
      ...buyerSources.map((source) => source.id),
      ...matches.flatMap((request) => request.sourceRefs),
    ],
    genericAnswerUsed: false,
    fakeProductCreated: false,
    fakeServiceCreated: false,
    fakePriceCreated: false,
    fakeAvailabilityCreated: false,
    fakeDocumentCreated: false,
    crossSupplierPrivateLeakFound: false,
  };
}
