import { getWarehouseActionQuestion } from "./warehouseActionQuestionMap";
import { composeWarehouseStockAnswer } from "./warehouseAnswerComposer";
import { WAREHOUSE_DATA_PROVIDER_FUNCTIONS } from "./warehouseDataProviders";
import { normalizeWarehouseIntent, routeWarehouseIntent } from "./warehouseIntentRouter";
import {
  sanitizeWarehouseContext,
  warehouseHiddenPermissionLimits,
} from "./warehouseSourceSanitizer";
import type {
  WarehouseDataProviderResult,
  WarehouseProviderKey,
  WarehouseStockAnswer,
  WarehouseStockContext,
  WarehouseStockIntent,
} from "./warehouseStockTypes";

function providerKeysForIntent(intent: WarehouseStockIntent): WarehouseProviderKey[] {
  const normalized = normalizeWarehouseIntent(intent);
  const always: WarehouseProviderKey[] = [
    "aiWarehouseSourceSanitizer",
    "aiWarehouseScreenContextProvider",
    "aiMaterialIdentityProvider",
    "aiWarehouseStockProvider",
    "aiWarehouseIncomingProvider",
    "aiWarehouseIssueProvider",
    "aiWarehouseReservationProvider",
    "aiWarehouseTransferProvider",
    "aiWarehouseInventoryProvider",
    "aiWarehouseDiscrepancyProvider",
    "aiWarehouseAnswerComposer",
  ];
  const byIntent: Partial<Record<WarehouseStockIntent, WarehouseProviderKey[]>> = {
    stock_overview: ["aiWarehouseStockDetailProvider", "aiWarehouseLocationProvider", "aiDocumentsProvider", "aiApprovalProvider"],
    critical_deficits: ["aiWarehouseLocationProvider", "aiProcurementLinkedRequestProvider", "aiSupplierLinkedOfferProvider"],
    material_blockers: ["aiWorkObjectLinkedProvider", "aiProcurementLinkedRequestProvider", "aiEstimateLinkedLineProvider", "aiProjectSpecificationProvider"],
    issue_readiness: ["aiWarehouseLocationProvider", "aiWorkObjectLinkedProvider", "aiApprovalProvider", "aiQuantityNormalizationProvider"],
    incoming_review: ["aiWaybillProvider", "aiInvoiceLinkedProvider", "aiDocumentsProvider", "aiPdfAggregatorProvider", "aiApprovalProvider"],
    incoming_waybill_reconciliation: ["aiWaybillProvider", "aiProcurementLinkedRequestProvider", "aiSupplierLinkedOfferProvider", "aiDocumentsProvider", "aiPdfAggregatorProvider"],
    inventory_discrepancy_check: ["aiWarehouseLocationProvider", "aiDocumentsProvider", "aiApprovalProvider"],
    reservation_check: ["aiWorkObjectLinkedProvider", "aiApprovalProvider"],
    transfer_readiness: ["aiWarehouseLocationProvider", "aiDocumentsProvider", "aiApprovalProvider"],
    location_missing_check: ["aiWarehouseLocationProvider", "aiWarehouseInventoryProvider"],
    stock_without_documents: ["aiDocumentsProvider", "aiPdfAggregatorProvider", "aiWaybillProvider"],
    warehouse_to_work_link: ["aiWorkObjectLinkedProvider", "aiApprovalProvider"],
    warehouse_to_procurement_link: ["aiProcurementLinkedRequestProvider", "aiSupplierLinkedOfferProvider", "aiMarketplaceLinkedOfferProvider", "aiApprovalProvider"],
    warehouse_to_estimate_spec_check: ["aiEstimateLinkedLineProvider", "aiUnitConversionProvider", "aiQuantityNormalizationProvider"],
    warehouse_to_project_spec_check: ["aiProjectSpecificationProvider", "aiPdfAggregatorProvider", "aiMaterialSpecificationProvider"],
    draft_issue_document: ["aiWorkObjectLinkedProvider", "aiApprovalProvider", "aiQuantityNormalizationProvider"],
    draft_discrepancy_act: ["aiWaybillProvider", "aiDocumentsProvider", "aiApprovalProvider"],
    warehouse_approval_handoff: ["aiApprovalProvider", "aiDocumentsProvider"],
  };
  const normalizationProviders: WarehouseProviderKey[] = [
    "aiUnitConversionProvider",
    "aiPackageConversionProvider",
    "aiCountryProfileProvider",
  ];
  return [...new Set([...always, ...(byIntent[normalized] ?? []), ...normalizationProviders])];
}

function runProviders(context: WarehouseStockContext, intent: WarehouseStockIntent): {
  results: WarehouseDataProviderResult[];
  providerTrace: string[];
} {
  const normalized = normalizeWarehouseIntent(intent);
  const keys = providerKeysForIntent(normalized);
  return {
    providerTrace: [
      "warehouseStockPipeline",
      "role:warehouse",
      "source_chain:material>specification>request>supplier>waybill>incoming>stock>reservation>issue>object>work>approval",
      ...keys,
    ],
    results: keys.map((key) => WAREHOUSE_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

export function answerWarehouseStockQuestion(params: {
  context: WarehouseStockContext;
  questionRu: string;
  actionId?: WarehouseStockIntent;
}): WarehouseStockAnswer {
  const hiddenByPermission = warehouseHiddenPermissionLimits(params.context);
  const safeContext = sanitizeWarehouseContext(params.context);
  const action = params.actionId ? getWarehouseActionQuestion(params.actionId, safeContext.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = normalizeWarehouseIntent(action?.actionId ?? routeWarehouseIntent(questionRu).intent);
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
    ...results.flatMap((result) => result.permissionLimited),
  ];
  return composeWarehouseStockAnswer({
    context: safeContext,
    intent,
    questionRu,
    providerTrace,
    missingData: [...new Set(missingData)],
    hiddenByPermission,
  });
}

export function answerWarehouseAction(params: {
  context: WarehouseStockContext;
  actionId: WarehouseStockIntent;
}): WarehouseStockAnswer {
  const action = getWarehouseActionQuestion(params.actionId, params.context.screenId);
  return answerWarehouseStockQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildWarehouseAiBlockViewModel(context: WarehouseStockContext): {
  titleRu: string;
  stockItemsCount: number;
  incomingCount: number;
  issueCount: number;
  criticalCount: number;
  readyToIssueCount: number;
  discrepancyCount: number;
  missingLocationCount: number;
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const stockAvailable = context.stockItems.reduce((sum, item) => sum + Math.max(0, (item.inStockQty ?? item.availableQty + item.reservedQty) - item.reservedQty), 0);
  const requested = context.issues.reduce((sum, issue) => sum + Math.max(0, issue.requestedQty - issue.issuedQty), 0);
  const discrepancyCount = [
    ...context.incoming.filter((item) => (item.expectedQty ?? item.waybillQty ?? item.quantity) !== (item.actualQty ?? item.quantity) || item.status === "disputed"),
    ...(context.inventoryCounts ?? []).filter((item) => typeof item.countedQty !== "number" || item.countedQty !== item.bookQty),
  ].length;
  const actions = [
    "Что критично",
    "Что можно выдать",
    "Проверить приход",
    "Найти расхождения",
    "Материалы блокируют работы",
    "Показать резервы",
    "Подготовить выдачу",
    "Подготовить акт расхождения",
  ];
  return {
    titleRu: "Готово от AI",
    stockItemsCount: context.stockItems.length,
    incomingCount: context.incoming.length,
    issueCount: context.issues.length,
    criticalCount: Math.max(0, requested - stockAvailable) > 0 ? 1 : 0,
    readyToIssueCount: context.issues.filter((issue) => {
      const stock = context.stockItems.find((item) => item.materialId === issue.materialId);
      const available = stock ? Math.max(0, (stock.inStockQty ?? stock.availableQty + stock.reservedQty) - stock.reservedQty) : 0;
      return available > 0 && issue.status !== "issued";
    }).length,
    discrepancyCount,
    missingLocationCount: context.stockItems.filter((item) => !item.location).length,
    missingData: [
      ...(context.unitConversionConfigured ? [] : ["не настроен источник нормализации единиц"]),
      ...(context.documentsProviderConnected ? [] : ["не подключен documents/PDF provider"]),
      ...(context.stockItems.length ? [] : ["строки склада не загружены"]),
    ],
    inputPlaceholderRu: "Спросить по складу, материалам, приходу, выдаче...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const warehouseStockPipeline = answerWarehouseStockQuestion;
