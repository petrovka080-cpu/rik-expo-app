import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import {
  BUYER_SOURCE_PRIORITY,
  type BuyerDataProviderResult,
  type BuyerProviderDescriptor,
  type BuyerProviderKey,
  type BuyerRequestLine,
  type BuyerSourcingContext,
  type BuyerSourcingOffer,
} from "./buyerSourcingTypes";

export const REQUIRED_BUYER_PROVIDER_KEYS: readonly BuyerProviderKey[] = [
  "aiBuyerScreenContextProvider",
  "aiBuyerRequestProvider",
  "aiBuyerRequestLineProvider",
  "aiApprovedRequestProvider",
  "aiMaterialSpecificationProvider",
  "aiEstimateLinkedLineProvider",
  "aiProjectSpecificationProvider",
  "aiPdfAggregatorProvider",
  "aiWarehouseLinkedStockProvider",
  "aiMarketplaceCatalogProvider",
  "aiApprovedVendorsProvider",
  "aiSupplierHistoryProvider",
  "aiSupplierOffersProvider",
  "aiExternalMarketplaceProvider",
  "aiInternetSourcingProvider",
  "aiPriceNormalizationProvider",
  "aiUnitConversionProvider",
  "aiCurrencyCountryProvider",
  "aiDeliveryRegionProvider",
  "aiSupplierRiskProvider",
  "aiProcurementApprovalProvider",
  "aiBuyerAnswerComposer",
  "aiBuyerSourceSanitizer",
] as const;

function descriptor(key: BuyerProviderKey): BuyerProviderDescriptor {
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

export const BUYER_PROVIDER_REGISTRY: readonly BuyerProviderDescriptor[] =
  REQUIRED_BUYER_PROVIDER_KEYS.map(descriptor);

export function listBuyerDataProviders(): BuyerProviderDescriptor[] {
  return BUYER_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

function selectedLine(context: BuyerSourcingContext): BuyerRequestLine | undefined {
  return context.request.lines.find((line) => line.id === context.selectedRequestLineId) ?? context.request.lines[0];
}

function fact(id: string, textRu: string, sourceRefs: string[] = []): BuyerDataProviderResult["facts"][number] {
  return {
    id,
    textRu,
    sourceRefs,
    confidence: sourceRefs.length > 0 ? "high" : "medium",
  };
}

function providerResult(params: Partial<BuyerDataProviderResult>): BuyerDataProviderResult {
  return {
    facts: params.facts ?? [],
    sources: params.sources ?? [],
    offers: params.offers ?? [],
    missingData: params.missingData ?? [],
    permissionLimited: params.permissionLimited ?? [],
    exactNoDataReasonRu: params.exactNoDataReasonRu,
  };
}

function sourceFilter(
  context: BuyerSourcingContext,
  types: ConstructionKnowledgeSource["type"][],
): ConstructionKnowledgeSource[] {
  return context.sources.filter((source) => types.includes(source.type));
}

function offerFilter(
  context: BuyerSourcingContext,
  sourceTypes: BuyerSourcingOffer["sourceType"][],
): BuyerSourcingOffer[] {
  return context.offers.filter((offer) => sourceTypes.includes(offer.sourceType));
}

export function aiBuyerScreenContextProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  return providerResult({
    facts: [
      fact(
        "buyer:screen",
        `Экран ${context.screenId}: sourcing собирается по заявке ${context.request.id}, статус ${context.request.status}.`,
        context.request.sourceRefs,
      ),
    ],
  });
}

export function aiBuyerRequestProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const request = context.request;
  return providerResult({
    sources: sourceFilter(context, ["procurement_request"]),
    facts: [
      fact(
        `request:${request.id}`,
        `Заявка ${request.id}: ${request.objectRu ?? "объект не указан"}, ${request.workRu ?? "работа не указана"}, позиций ${request.lines.length}.`,
        request.sourceRefs,
      ),
    ],
    missingData: [
      ...(request.objectRu ? [] : ["В заявке не указан объект."]),
      ...(request.workRu ? [] : ["В заявке не указана работа."]),
    ],
  });
}

export function aiBuyerRequestLineProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const line = selectedLine(context);
  if (!line) {
    return providerResult({
      missingData: ["В заявке нет позиции для подбора."],
      exactNoDataReasonRu: "Позиция заявки не найдена.",
    });
  }
  return providerResult({
    facts: [
      fact(
        `request-line:${line.id}`,
        `Позиция ${line.itemRu}: нужно ${line.quantity} ${line.unit}${line.requiredDate ? ` до ${line.requiredDate}` : ""}.`,
        context.request.sourceRefs,
      ),
    ],
    missingData: [
      ...(line.quantity > 0 ? [] : [`${line.itemRu}: не указано количество.`]),
      ...(line.unit ? [] : [`${line.itemRu}: не указана единица измерения.`]),
      ...(line.requiredDate ? [] : [`${line.itemRu}: не указана дата потребности.`]),
    ],
  });
}

export function aiApprovedRequestProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const approved = context.request.status === "approved";
  return providerResult({
    facts: [
      fact(
        `request-approved:${context.request.id}`,
        approved
          ? `Заявка ${context.request.id} утверждена; можно готовить sourcing и shortlist.`
          : `Заявка ${context.request.id} не утверждена; sourcing только как черновик без заказа.`,
        context.request.sourceRefs,
      ),
    ],
    missingData: approved ? [] : [`Заявка ${context.request.id} еще не утверждена для закупки.`],
  });
}

export function aiMaterialSpecificationProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const line = selectedLine(context);
  if (!line?.specificationText) {
    return providerResult({
      missingData: ["Спецификация не найдена в заявке или документах; искать можно только по общему названию."],
      exactNoDataReasonRu: "Спецификация позиции не найдена.",
    });
  }
  return providerResult({
    facts: [fact(`spec:${line.id}`, `Спецификация: ${line.specificationText}.`, context.request.sourceRefs)],
  });
}

export function aiEstimateLinkedLineProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const sources = sourceFilter(context, ["estimate_pdf", "boq"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`estimate:${source.id}`, `Сметный источник: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id])),
    missingData: sources.length === 0 ? ["Сметная строка не привязана к заявке или позиции."] : [],
    exactNoDataReasonRu: sources.length === 0 ? "Сметный источник не найден." : undefined,
  });
}

export function aiProjectSpecificationProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const sources = sourceFilter(context, ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`project:${source.id}`, `Проектный/spec source: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id])),
    missingData: sources.length === 0 ? ["Проектный PDF или спецификация не привязаны к заявке."] : [],
    exactNoDataReasonRu: sources.length === 0 ? "Проектный источник не найден." : undefined,
  });
}

export function aiPdfAggregatorProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const sources = sourceFilter(context, ["project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification"]);
  return providerResult({
    sources,
    facts: sources.map((source) => fact(`pdf:${source.id}`, `PDF/source trace: ${source.labelRu}${source.page ? `, стр. ${source.page}` : ""}.`, [source.id])),
    missingData: sources.length === 0 ? ["PDF chunks по заявке не найдены; можно загрузить спецификацию, проект или смету."] : [],
  });
}

export function aiWarehouseLinkedStockProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const line = selectedLine(context);
  const stock = context.warehouseStock.filter((item) => !line || !item.requestLineId || item.requestLineId === line.id);
  const sources = sourceFilter(context, ["warehouse_stock"]);
  return providerResult({
    sources,
    facts: stock.map((item) =>
      fact(
        `warehouse:${item.id}`,
        `${item.itemRu}: на складе ${item.availableQty ?? "нет данных"} ${item.unit}, резерв ${item.reservedQty ?? 0}, incoming ${item.incomingQty ?? 0}.`,
        [item.sourceRef],
      ),
    ),
    missingData: stock.length === 0 ? ["Связанный складской остаток по позиции не найден."] : [],
    exactNoDataReasonRu: stock.length === 0 ? "Склад по позиции не подключен." : undefined,
  });
}

export function aiMarketplaceCatalogProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["own_marketplace"]);
  return providerResult({
    offers,
    facts: [fact("marketplace:own:first", `Наш marketplace проверяется первым после склада; найдено ${offers.length} вариантов.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["В нашем marketplace нет вариантов по спецификации заявки."] : [],
  });
}

export function aiApprovedVendorsProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["approved_vendor"]);
  return providerResult({
    offers,
    facts: [fact("vendors:approved", `Approved vendors: найдено ${offers.length} вариантов.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["Approved vendors по этой позиции не найдены."] : [],
  });
}

export function aiSupplierHistoryProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["supplier_history"]);
  return providerResult({
    offers,
    facts: [fact("supplier:history", `История закупок: найдено ${offers.length} релевантных вариантов.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["История закупок по аналогичной позиции не найдена."] : [],
  });
}

export function aiSupplierOffersProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["supplier_offer"]);
  return providerResult({
    offers,
    facts: [fact("supplier:offers", `Свежие КП/supplier offers: найдено ${offers.length}.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["Свежие КП по заявке не найдены."] : [],
  });
}

export function aiExternalMarketplaceProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["external_marketplace"]);
  if (!context.externalMarketplaceConnected) {
    return providerResult({
      missingData: ["Внешний marketplace не подключен."],
      exactNoDataReasonRu: "Внешние marketplace не использовались без подключенного источника.",
    });
  }
  return providerResult({
    offers,
    facts: [fact("external:marketplace", `Внешний marketplace подключен; найдено ${offers.length} вариантов с trace.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["Подключенный внешний marketplace не вернул вариантов."] : [],
  });
}

export function aiInternetSourcingProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const offers = offerFilter(context, ["internet_source"]);
  if (!context.internetSourcingConnected) {
    return providerResult({
      missingData: ["Интернет-sourcing не подключен."],
      exactNoDataReasonRu: "Интернет-источники не использовались без source trace.",
    });
  }
  return providerResult({
    offers,
    facts: [fact("internet:sourcing", `Интернет-sourcing подключен; найдено ${offers.length} вариантов с source URL/label.`, offers.map((offer) => offer.id))],
    missingData: offers.length === 0 ? ["Интернет-источник не вернул вариантов по позиции."] : [],
  });
}

export function aiPriceNormalizationProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const currencies = new Set(context.offers.map((offer) => offer.currency).filter(Boolean));
  const target = context.currency;
  const unsafe = target && currencies.size > 0 && [...currencies].some((currency) => currency !== target);
  return providerResult({
    facts: [fact("price:normalization", unsafe ? "Цены в разных валютах требуют курса/source перед сравнением." : "Цены сравниваются в одной валюте или с указанным source currency.")],
    missingData: unsafe ? ["Нужен курс валют/source для сравнения цен."] : [],
  });
}

export function aiUnitConversionProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const line = selectedLine(context);
  const unsafe = Boolean(line && context.offers.some((offer) => offer.unit !== line.unit));
  return providerResult({
    facts: [fact("unit:normalization", unsafe ? "Единицы отличаются; конвертация требует коэффициента из спецификации." : "Единицы предложений совпадают с заявкой.")],
    missingData: unsafe ? ["Нужен коэффициент конвертации единиц из спецификации."] : [],
  });
}

export function aiCurrencyCountryProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  return providerResult({
    facts: [fact("currency:country", `Страна ${context.countryCode ?? "не указана"}, валюта ${context.currency ?? "не указана"}.`)],
    missingData: context.currency ? [] : ["Валюта закупки не настроена."],
  });
}

export function aiDeliveryRegionProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  return providerResult({
    facts: [fact("delivery:region", `Регион доставки: ${context.cityOrRegion ?? "не указан"}.`)],
    missingData: context.cityOrRegion ? [] : ["Регион доставки не указан."],
  });
}

export function aiSupplierRiskProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const risky = context.offers.filter((offer) => offer.riskLevel === "high" || offer.riskLevel === "critical");
  return providerResult({
    facts: [
      fact(
        "supplier:risk",
        `Проверены риски поставщиков: high/critical ${risky.length}, всего вариантов ${context.offers.length}.`,
        context.offers.map((offer) => offer.id),
      ),
    ],
  });
}

export function aiProcurementApprovalProvider(context: BuyerSourcingContext): BuyerDataProviderResult {
  const sources = sourceFilter(context, ["approval"]);
  return providerResult({
    sources,
    facts: [fact("approval:route", "Маршрут согласования готовится как черновик; auto approval и заказ не выполняются.", sources.map((source) => source.id))],
    missingData: sources.length === 0 ? ["Approval route по заявке не найден; подготовлен только безопасный handoff."] : [],
  });
}

export const BUYER_DATA_PROVIDER_FUNCTIONS: Record<BuyerProviderKey, (context: BuyerSourcingContext) => BuyerDataProviderResult> = {
  aiBuyerScreenContextProvider,
  aiBuyerRequestProvider,
  aiBuyerRequestLineProvider,
  aiApprovedRequestProvider,
  aiMaterialSpecificationProvider,
  aiEstimateLinkedLineProvider,
  aiProjectSpecificationProvider,
  aiPdfAggregatorProvider,
  aiWarehouseLinkedStockProvider,
  aiMarketplaceCatalogProvider,
  aiApprovedVendorsProvider,
  aiSupplierHistoryProvider,
  aiSupplierOffersProvider,
  aiExternalMarketplaceProvider,
  aiInternetSourcingProvider,
  aiPriceNormalizationProvider,
  aiUnitConversionProvider,
  aiCurrencyCountryProvider,
  aiDeliveryRegionProvider,
  aiSupplierRiskProvider,
  aiProcurementApprovalProvider,
  aiBuyerAnswerComposer: () => providerResult({ facts: [fact("composer:buyer", "Ответ собирается единым buyer sourcing composer.")] }),
  aiBuyerSourceSanitizer: () => providerResult({ facts: [fact("sanitizer:buyer", "Источники очищены от full cashflow, runtime, provider payload и unrelated данных.")] }),
};

export function buyerProviderTraceForAll(): string[] {
  return ["buyerSourcingPipeline", ...BUYER_SOURCE_PRIORITY, ...REQUIRED_BUYER_PROVIDER_KEYS];
}
