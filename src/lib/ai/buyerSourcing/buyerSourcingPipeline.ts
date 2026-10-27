import { getBuyerActionQuestion } from "./buyerActionQuestionMap";
import { composeBuyerSourcingAnswer } from "./buyerAnswerComposer";
import { BUYER_DATA_PROVIDER_FUNCTIONS } from "./buyerDataProviders";
import { routeBuyerIntent } from "./buyerIntentRouter";
import { sanitizeBuyerContext } from "./buyerSourceSanitizer";
import {
  BUYER_SOURCE_PRIORITY,
  type BuyerDataProviderResult,
  type BuyerIntent,
  type BuyerProviderKey,
  type BuyerSourcingAnswer,
  type BuyerSourcingContext,
} from "./buyerSourcingTypes";

function providerKeysForIntent(intent: BuyerIntent): BuyerProviderKey[] {
  const always: BuyerProviderKey[] = [
    "aiBuyerSourceSanitizer",
    "aiBuyerScreenContextProvider",
    "aiBuyerRequestProvider",
    "aiBuyerRequestLineProvider",
    "aiApprovedRequestProvider",
    "aiWarehouseLinkedStockProvider",
    "aiMarketplaceCatalogProvider",
    "aiApprovedVendorsProvider",
    "aiSupplierHistoryProvider",
    "aiSupplierOffersProvider",
    "aiPriceNormalizationProvider",
    "aiUnitConversionProvider",
    "aiCurrencyCountryProvider",
    "aiDeliveryRegionProvider",
    "aiSupplierRiskProvider",
    "aiProcurementApprovalProvider",
    "aiBuyerAnswerComposer",
  ];
  const byIntent: Partial<Record<BuyerIntent, BuyerProviderKey[]>> = {
    find_5_10_suppliers: ["aiExternalMarketplaceProvider", "aiInternetSourcingProvider"],
    approved_request_sourcing: ["aiExternalMarketplaceProvider", "aiInternetSourcingProvider"],
    compare_suppliers: ["aiExternalMarketplaceProvider", "aiInternetSourcingProvider"],
    find_analogs: ["aiMaterialSpecificationProvider", "aiEstimateLinkedLineProvider", "aiProjectSpecificationProvider", "aiPdfAggregatorProvider", "aiExternalMarketplaceProvider"],
    check_estimate_quantity: ["aiEstimateLinkedLineProvider", "aiPdfAggregatorProvider"],
    check_project_specification: ["aiProjectSpecificationProvider", "aiPdfAggregatorProvider"],
    prepare_rfq_draft: ["aiMaterialSpecificationProvider"],
    prepare_shortlist: ["aiExternalMarketplaceProvider"],
    prepare_approval_handoff: ["aiProcurementApprovalProvider"],
    external_marketplace_search: ["aiExternalMarketplaceProvider", "aiInternetSourcingProvider"],
    own_marketplace_search: ["aiMarketplaceCatalogProvider"],
    missing_procurement_data: ["aiMaterialSpecificationProvider", "aiEstimateLinkedLineProvider", "aiProjectSpecificationProvider", "aiPdfAggregatorProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: BuyerSourcingContext, intent: BuyerIntent): {
  results: BuyerDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "buyerSourcingPipeline",
      "role:buyer",
      "source_priority:warehouse>own_marketplace>approved_vendors>supplier_history>supplier_offers>external_marketplaces>internet",
      ...keys,
    ],
    results: keys.map((key) => BUYER_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

export function answerBuyerSourcingQuestion(params: {
  context: BuyerSourcingContext;
  questionRu: string;
  actionId?: BuyerIntent;
}): BuyerSourcingAnswer {
  const safeContext = sanitizeBuyerContext({
    ...params.context,
    sourcePriority: [...(params.context.sourcePriority ?? BUYER_SOURCE_PRIORITY)],
  });
  const action = params.actionId ? getBuyerActionQuestion(params.actionId, safeContext.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeBuyerIntent(questionRu).intent;
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
    ...results.flatMap((result) => result.permissionLimited),
  ];
  return composeBuyerSourcingAnswer({
    context: safeContext,
    intent,
    questionRu,
    providerTrace,
    missingData: [...new Set(missingData)],
  });
}

export function answerBuyerAction(params: {
  context: BuyerSourcingContext;
  actionId: BuyerIntent;
}): BuyerSourcingAnswer {
  const action = getBuyerActionQuestion(params.actionId, params.context.screenId);
  return answerBuyerSourcingQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildBuyerAiBlockViewModel(context: BuyerSourcingContext): {
  titleRu: string;
  request: {
    id: string;
    objectRu?: string;
    workRu?: string;
    status: string;
  };
  needToBuy: {
    itemRu: string;
    quantity: number;
    unit: string;
  };
  stock: {
    checked: true;
    availableQty: number;
    deficitQty: number;
  };
  offerCounts: {
    ownMarketplace: number;
    approvedVendors: number;
    supplierHistory: number;
    supplierOffers: number;
    externalSources: number;
  };
  bestOptionsRu: string[];
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const line = context.request.lines.find((item) => item.id === context.selectedRequestLineId) ?? context.request.lines[0];
  const availableQty = context.warehouseStock.reduce((sum, item) => sum + (item.availableQty ?? 0), 0);
  const ownMarketplace = context.offers.filter((offer) => offer.sourceType === "own_marketplace").length;
  const approvedVendors = context.offers.filter((offer) => offer.sourceType === "approved_vendor").length;
  const supplierHistory = context.offers.filter((offer) => offer.sourceType === "supplier_history").length;
  const supplierOffers = context.offers.filter((offer) => offer.sourceType === "supplier_offer").length;
  const externalSources = context.offers.filter((offer) => offer.sourceType === "external_marketplace" || offer.sourceType === "internet_source").length;
  const actions = [
    "Найти 5-10 вариантов",
    "Проверить склад",
    "Сравнить цены и сроки",
    "Найти аналоги",
    "Подготовить shortlist",
    "Отправить на согласование",
  ];
  return {
    titleRu: "Готово от AI",
    request: {
      id: context.request.id,
      objectRu: context.request.objectRu,
      workRu: context.request.workRu,
      status: context.request.status,
    },
    needToBuy: {
      itemRu: line?.itemRu ?? "позиция не найдена",
      quantity: line?.quantity ?? 0,
      unit: line?.unit ?? "",
    },
    stock: {
      checked: true,
      availableQty,
      deficitQty: Math.max(0, (line?.quantity ?? 0) - availableQty),
    },
    offerCounts: {
      ownMarketplace,
      approvedVendors,
      supplierHistory,
      supplierOffers,
      externalSources,
    },
    bestOptionsRu: context.offers
      .slice()
      .sort((left, right) => (left.price ?? Number.POSITIVE_INFINITY) - (right.price ?? Number.POSITIVE_INFINITY))
      .slice(0, 3)
      .map((offer) => `${offer.supplierNameRu} - ${offer.price ?? "цена не указана"} ${offer.currency ?? ""} - ${offer.deliveryDays ?? "?"} дн. - ${offer.riskLevel}`),
    missingData: [
      ...(line?.specificationText ? [] : ["Спецификация не найдена в заявке или документах."]),
      ...(context.cityOrRegion ? [] : ["Регион доставки не указан."]),
    ],
    inputPlaceholderRu: "Спросить по заявке, поставщикам, цене, срокам...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const buyerSourcingPipeline = answerBuyerSourcingQuestion;
