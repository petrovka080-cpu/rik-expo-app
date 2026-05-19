import { scoreBuyerOffers } from "./buyerOfferScoring";
import type {
  BuyerIntent,
  BuyerRequestLine,
  BuyerSourcingAnswer,
  BuyerSourcingContext,
  BuyerSourcingOffer,
  BuyerStockCheck,
  SupplierScore,
} from "./buyerSourcingTypes";

const SOURCE_ORDER: Record<BuyerSourcingOffer["sourceType"], number> = {
  warehouse_stock: 0,
  own_marketplace: 1,
  approved_vendor: 2,
  supplier_history: 3,
  supplier_offer: 4,
  external_marketplace: 5,
  internet_source: 6,
};

function selectedLine(context: BuyerSourcingContext): BuyerRequestLine {
  const line = context.request.lines.find((item) => item.id === context.selectedRequestLineId) ?? context.request.lines[0];
  if (!line) throw new Error("BLOCKED_APPROVED_REQUEST_CONTEXT_MISSING");
  return line;
}

function sortedOffers(offers: BuyerSourcingOffer[]): BuyerSourcingOffer[] {
  return [...offers].sort((left, right) => {
    const sourceRank = SOURCE_ORDER[left.sourceType] - SOURCE_ORDER[right.sourceType];
    if (sourceRank !== 0) return sourceRank;
    const leftPrice = left.price ?? Number.POSITIVE_INFINITY;
    const rightPrice = right.price ?? Number.POSITIVE_INFINITY;
    return leftPrice - rightPrice;
  });
}

function money(offer: BuyerSourcingOffer): string {
  if (typeof offer.price !== "number") return "нет цены в источнике";
  return `${offer.price} ${offer.currency ?? "валюта не указана"} / ${offer.unit}`;
}

function stockCheckForLine(context: BuyerSourcingContext, line: BuyerRequestLine): BuyerStockCheck {
  const stock = context.warehouseStock.filter((item) => !item.requestLineId || item.requestLineId === line.id);
  const availableQty = stock.reduce((sum, item) => sum + (item.availableQty ?? 0), 0);
  return {
    checked: true,
    availableQty,
    deficitQty: Math.max(0, line.quantity - availableQty),
    sourceRefs: stock.map((item) => item.sourceRef),
  };
}

function sourceBuckets(offers: BuyerSourcingOffer[]): Record<BuyerSourcingOffer["sourceType"], number> {
  return offers.reduce<Record<BuyerSourcingOffer["sourceType"], number>>(
    (acc, offer) => {
      acc[offer.sourceType] += 1;
      return acc;
    },
    {
      warehouse_stock: 0,
      own_marketplace: 0,
      approved_vendor: 0,
      supplier_history: 0,
      supplier_offer: 0,
      external_marketplace: 0,
      internet_source: 0,
    },
  );
}

function lessThanFiveReason(context: BuyerSourcingContext, offers: BuyerSourcingOffer[], missingData: string[]): string[] {
  if (offers.length >= 5) return [];
  const buckets = sourceBuckets(offers);
  return [
    `Найдено только ${offers.length} реальных вариантов; до 5-10 не добивал фейками.`,
    `наш marketplace: ${buckets.own_marketplace}`,
    `approved vendors: ${buckets.approved_vendor}`,
    `история закупок: ${buckets.supplier_history}`,
    `supplier offers: ${buckets.supplier_offer}`,
    context.externalMarketplaceConnected ? `внешний marketplace: ${buckets.external_marketplace}` : "внешний marketplace: не подключен",
    context.internetSourcingConnected ? `интернет-источник: ${buckets.internet_source}` : "интернет-источник: не подключен",
    ...missingData.slice(0, 4),
  ];
}

function answerKind(intent: BuyerIntent, offers: BuyerSourcingOffer[]): BuyerSourcingAnswer["answerKind"] {
  if (offers.length === 0) return "exact_no_data_reason";
  if (intent === "prepare_shortlist" || intent === "prepare_rfq_draft") return "shortlist_draft";
  if (intent === "prepare_approval_handoff") return "approval_route";
  if (intent === "compare_suppliers" || intent === "price_delivery_comparison" || intent === "supplier_risk_check") return "supplier_comparison";
  if (intent === "missing_procurement_data") return "clarifying_question";
  return "sourcing_result";
}

function statusText(kind: BuyerSourcingAnswer["answerKind"]): string {
  if (kind === "approval_route") return "Заказ не создан. Оплата не создана. Подготовлен маршрут согласования. Автоматическое согласование не выполнялось.";
  if (kind === "shortlist_draft") return "Заказ не создан. Оплата не создана. Подготовлен черновик shortlist/RFQ.";
  return "Заказ не создан. Оплата не создана. Данные не изменены.";
}

function offerText(offer: BuyerSourcingOffer, score?: SupplierScore): string {
  return [
    `${offer.supplierNameRu}`,
    `   Источник: ${offer.sourceLabelRu}`,
    `   Товар/услуга: ${offer.itemNameRu}`,
    `   Цена: ${money(offer)}`,
    `   Наличие: ${offer.availability}${typeof offer.quantityAvailable === "number" ? `, ${offer.quantityAvailable} ${offer.unit}` : ""}`,
    `   Срок: ${typeof offer.deliveryDays === "number" ? `${offer.deliveryDays} дн.` : "нет данных"}`,
    `   Доставка: ${offer.deliveryRegion ?? "нужно уточнить"}`,
    `   Соответствие спецификации: ${offer.specificationMatch}`,
    `   Риск: ${offer.riskLevel}${offer.riskReasonsRu.length > 0 ? ` - ${offer.riskReasonsRu.join("; ")}` : ""}`,
    score ? `   Почему: ${score.reasonsRu.join("; ")}` : undefined,
  ].filter(Boolean).join("\n");
}

export function composeBuyerSourcingAnswer(params: {
  context: BuyerSourcingContext;
  intent: BuyerIntent;
  questionRu: string;
  providerTrace: string[];
  missingData: string[];
}): BuyerSourcingAnswer {
  const line = selectedLine(params.context);
  const stockCheck = stockCheckForLine(params.context, line);
  const offers = sortedOffers(params.context.offers);
  const scores = scoreBuyerOffers(offers);
  const scoresById = new Map(scores.map((score) => [score.offerId, score]));
  const rankedOfferIds = scores.slice(0, 3).map((score) => score.offerId);
  const shortlist = rankedOfferIds.map((offerId) => {
    const offer = offers.find((item) => item.id === offerId);
    const score = scoresById.get(offerId);
    return {
      offerId,
      reasonRu: score?.reasonsRu.join("; ") ?? "source-backed вариант для проверки",
      checksBeforeApprovalRu: [
        ...(offer?.specificationMatch === "exact" ? [] : ["проверить аналог по проекту/спецификации"]),
        ...(offer?.deliveryRegion ? [] : ["подтвердить доставку до объекта"]),
        ...(offer?.priceDate ? [] : ["подтвердить актуальность цены"]),
        "подтвердить документы поставщика перед заказом",
      ],
    };
  });
  const kind = answerKind(params.intent, offers);
  const lessThanFive = lessThanFiveReason(params.context, offers, params.missingData);
  const buckets = sourceBuckets(offers);
  const nextStepRu = kind === "approval_route"
    ? "Передать shortlist директору на согласование без создания заказа."
    : kind === "shortlist_draft"
      ? "Проверить доставку, актуальность цены и документы, затем отправить shortlist на approval."
      : "Открыть request detail, проверить shortlist и подготовить безопасный approval handoff.";
  const sourceLabels = params.context.sources
    .filter((source) => ["procurement_request", "estimate_pdf", "boq", "project_pdf", "architecture_pdf", "engineering_pdf", "specification", "warehouse_stock", "approval"].includes(source.type))
    .map((source) => `- ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}`);
  const checks = lessThanFive.length > 0
    ? lessThanFive
    : [
      ...params.missingData.slice(0, 8),
      "подтвердить доставку до объекта",
      "подтвердить актуальность цены",
      "проверить документы поставщика перед заказом",
    ];
  const answerRu = [
    "Ответ",
    "",
    "Коротко:",
    offers.length > 0
      ? `По заявке ${params.context.request.id} найдено ${offers.length} реальных вариантов: наш marketplace ${buckets.own_marketplace}, approved vendors ${buckets.approved_vendor}, история ${buckets.supplier_history}, КП ${buckets.supplier_offer}, внешние источники ${buckets.external_marketplace + buckets.internet_source}.`
      : `По заявке ${params.context.request.id} реальные предложения не найдены; показаны точные причины, чтобы не создавать fake suppliers/prices/availability.`,
    "",
    "Заявка:",
    `- Номер: ${params.context.request.id}`,
    `- Объект: ${params.context.request.objectRu ?? "не указан"}`,
    `- Работа: ${params.context.request.workRu ?? "не указана"}`,
    `- Позиция: ${line.itemRu}`,
    `- Количество: ${line.quantity}`,
    `- Единица: ${line.unit}`,
    `- Дата потребности: ${line.requiredDate ?? "не указана"}`,
    "",
    "Основания:",
    ...(sourceLabels.length > 0 ? sourceLabels : ["- Заявка есть, но привязанные PDF/смета/проект не найдены."]),
    "",
    "Проверка склада:",
    `- На складе: ${stockCheck.availableQty ?? 0} ${line.unit}`,
    `- Нужно: ${line.quantity} ${line.unit}`,
    `- Дефицит: ${stockCheck.deficitQty ?? line.quantity} ${line.unit}`,
    `- Источник: ${stockCheck.sourceRefs.length > 0 ? stockCheck.sourceRefs.join(", ") : "связанный складской источник не найден"}`,
    "",
    "Предложения:",
    ...(offers.length > 0
      ? offers.map((offer, index) => `${index + 1}. ${offerText(offer, scoresById.get(offer.id))}`)
      : ["- Реальных source-backed предложений нет."]),
    "",
    "Shortlist:",
    ...(shortlist.length > 0
      ? shortlist.map((item, index) => `- Вариант ${index + 1}: ${offers.find((offer) => offer.id === item.offerId)?.supplierNameRu ?? item.offerId} - ${item.reasonRu}`)
      : ["- Shortlist не подготовлен, потому что нет реальных предложений с source trace."]),
    "",
    "Что проверить:",
    ...checks.map((item) => `- ${item}`),
    "",
    "Следующий шаг:",
    nextStepRu,
    "",
    "Статус:",
    statusText(kind),
  ].join("\n");

  return {
    screenId: params.context.screenId,
    role: "buyer",
    requestId: params.context.request.id,
    questionRu: params.questionRu,
    answerKind: kind,
    titleRu: kind === "approval_route" ? "На согласование" : kind === "shortlist_draft" ? "Черновик shortlist" : "Подбор поставщиков",
    shortAnswerRu: offers.length > 0
      ? `Найдено ${offers.length} реальных вариантов, склад проверен, заказ не создан.`
      : "Реальные предложения не найдены; fake options не создавались.",
    answerRu,
    requestSummary: {
      objectRu: params.context.request.objectRu,
      workRu: params.context.request.workRu,
      itemRu: line.itemRu,
      quantity: line.quantity,
      unit: line.unit,
      requiredDate: line.requiredDate,
      approved: params.context.request.status === "approved",
    },
    stockCheck,
    offers,
    scores,
    shortlist,
    missingData: [...new Set([...params.missingData, ...lessThanFive])],
    approvalRoute: {
      required: true,
      approverRole: "director",
      reasonRu: "Выбор поставщика и заказ требуют решения человека через approval ledger.",
    },
    nextStepRu,
    changedData: false,
    orderCreated: false,
    paymentCreated: false,
    autoApproval: false,
    providerTrace: [...new Set(params.providerTrace)],
    sourceTrace: [
      ...stockCheck.sourceRefs,
      ...offers.map((offer) => `${offer.id}:${offer.sourceLabelRu}`),
      ...params.context.sources.map((source) => source.id),
    ],
    genericAnswerUsed: false,
    fakeSupplierCreated: false,
    fakePriceCreated: false,
    fakeAvailabilityCreated: false,
    directOrderPathUsed: false,
    approvalBypassUsed: false,
  };
}
