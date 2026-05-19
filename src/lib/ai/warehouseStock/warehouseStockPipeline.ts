import { getWarehouseActionQuestion } from "./warehouseActionQuestionMap";
import { composeWarehouseStockAnswer } from "./warehouseAnswerComposer";
import { WAREHOUSE_DATA_PROVIDER_FUNCTIONS } from "./warehouseDataProviders";
import { routeWarehouseIntent } from "./warehouseIntentRouter";
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
  const always: WarehouseProviderKey[] = [
    "aiWarehouseSourceSanitizer",
    "aiWarehouseScreenContextProvider",
    "aiWarehouseStockProvider",
    "aiWarehouseIncomingProvider",
    "aiWarehouseIssueProvider",
    "aiWarehouseDiscrepancyProvider",
    "aiWarehouseAnswerComposer",
  ];
  const byIntent: Partial<Record<WarehouseStockIntent, WarehouseProviderKey[]>> = {
    today_stock_summary: ["aiMaterialSpecificationProvider", "aiDocumentsProvider", "aiApprovalProvider"],
    what_to_issue_by_object: ["aiWorkObjectLinkedProvider", "aiProcurementLinkedRequestProvider", "aiApprovalProvider"],
    critical_materials: ["aiMaterialSpecificationProvider", "aiProcurementLinkedRequestProvider"],
    material_blockers: ["aiWorkObjectLinkedProvider", "aiProcurementLinkedRequestProvider"],
    warehouse_linked_status: ["aiMaterialSpecificationProvider"],
    incoming_readiness: ["aiDocumentsProvider", "aiPdfAggregatorProvider", "aiApprovalProvider"],
    incoming_discrepancy_check: ["aiDocumentsProvider", "aiApprovalProvider", "aiWarehouseDiscrepancyProvider"],
    issue_readiness_check: ["aiWorkObjectLinkedProvider", "aiApprovalProvider"],
    missing_documents_check: ["aiDocumentsProvider", "aiPdfAggregatorProvider"],
    specification_match_check: ["aiMaterialSpecificationProvider", "aiPdfAggregatorProvider"],
    unit_conversion_check: ["aiUnitConversionProvider", "aiMaterialSpecificationProvider"],
    procurement_handoff: ["aiProcurementLinkedRequestProvider", "aiApprovalProvider"],
    foreman_handoff: ["aiWorkObjectLinkedProvider"],
    approval_route: ["aiApprovalProvider", "aiDocumentsProvider"],
    document_request_draft: ["aiDocumentsProvider", "aiPdfAggregatorProvider"],
    inventory_reconciliation: ["aiWarehouseDiscrepancyProvider", "aiDocumentsProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: WarehouseStockContext, intent: WarehouseStockIntent): {
  results: WarehouseDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "warehouseStockPipeline",
      "role:warehouse",
      "source_chain:material>specification>stock>incoming>issue>object>work>approval",
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
  const intent = action?.actionId ?? routeWarehouseIntent(questionRu).intent;
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
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const criticalCount = context.issues.filter((issue) => issue.status === "blocked" || issue.status === "needs_approval").length;
  const actions = [
    "Stock today",
    "Critical materials",
    "Issue by object",
    "Check incoming",
    "Incoming discrepancies",
    "Check specification",
    "Handoff to buyer",
    "Route to approval",
  ];
  return {
    titleRu: "Ready from AI",
    stockItemsCount: context.stockItems.length,
    incomingCount: context.incoming.length,
    issueCount: context.issues.length,
    criticalCount,
    missingData: [
      ...(context.unitConversionConfigured ? [] : ["unit conversion source is not configured"]),
      ...(context.documentsProviderConnected ? [] : ["documents/PDF provider is not connected"]),
      ...(context.stockItems.length ? [] : ["stock rows are not loaded"]),
    ],
    inputPlaceholderRu: "Ask about stock, incoming, issue, object, work, documents...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const warehouseStockPipeline = answerWarehouseStockQuestion;
