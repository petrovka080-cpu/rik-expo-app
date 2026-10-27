import { getDirectorActionQuestion } from "./directorActionQuestionMap";
import { composeDirectorCompanyAnswer } from "./directorAnswerComposer";
import { DIRECTOR_DATA_PROVIDER_FUNCTIONS } from "./directorDataProviders";
import { routeDirectorIntent } from "./directorIntentRouter";
import {
  directorHiddenTechnicalData,
  sanitizeDirectorContext,
} from "./directorSourceSanitizer";
import type {
  DirectorCompanyAnswer,
  DirectorCompanyContext,
  DirectorDataProviderResult,
  DirectorIntent,
  DirectorProviderKey,
} from "./directorCompanyTypes";

function providerKeysForIntent(intent: DirectorIntent): DirectorProviderKey[] {
  const always: DirectorProviderKey[] = [
    "aiDirectorSourceSanitizer",
    "aiDirectorScreenContextProvider",
    "aiCompanyDecisionEventProvider",
    "aiCompanyRiskProvider",
    "aiCompanyKpiProvider",
    "aiApprovalQueueProvider",
    "aiDirectorApprovalContextProvider",
    "aiDirectorFinanceProvider",
    "aiDirectorProcurementProvider",
    "aiDirectorWarehouseProvider",
    "aiDirectorFieldProvider",
    "aiDirectorDocumentsProvider",
    "aiDirectorReportsProvider",
    "aiDirectorOfficeProvider",
    "aiDirectorAnswerComposer",
  ];
  const byIntent: Partial<Record<DirectorIntent, DirectorProviderKey[]>> = {
    today_decision_queue: ["aiDirectorCashflowProvider", "aiDirectorSecuritySummaryProvider", "aiCompanyTimelineProvider"],
    top_company_risks: ["aiDirectorCashflowProvider", "aiForecastProvider", "aiDirectorSecuritySummaryProvider"],
    blocked_objects_summary: ["aiConstructionKnowledgeCoreProvider", "aiDirectorContractorProvider"],
    approval_queue_review: ["aiApprovalQueueProvider", "aiDirectorApprovalContextProvider"],
    finance_risk_summary: ["aiDirectorCashflowProvider", "aiForecastProvider", "aiCountryProfileProvider"],
    cashflow_risk_summary: ["aiDirectorCashflowProvider", "aiForecastProvider", "aiCountryProfileProvider"],
    procurement_blockers: ["aiDirectorSupplierProvider", "aiDirectorMarketplaceProvider"],
    supplier_delivery_risks: ["aiDirectorSupplierProvider", "aiDirectorMarketplaceProvider"],
    warehouse_deficits: ["aiDirectorWarehouseProvider", "aiConstructionKnowledgeCoreProvider"],
    incoming_discrepancies: ["aiDirectorWarehouseProvider", "aiDirectorDocumentsProvider"],
    field_closeout_blockers: ["aiDirectorFieldProvider", "aiDirectorContractorProvider", "aiConstructionKnowledgeCoreProvider"],
    contractor_blockers: ["aiDirectorContractorProvider", "aiDirectorFieldProvider"],
    document_evidence_gaps: ["aiDirectorDocumentsProvider", "aiDirectorReportsProvider"],
    office_stuck_work: ["aiDirectorOfficeProvider", "aiDirectorDocumentsProvider"],
    company_timeline: ["aiCompanyTimelineProvider", "aiConstructionKnowledgeCoreProvider"],
    object_chain_trace: ["aiCompanyTimelineProvider", "aiConstructionKnowledgeCoreProvider"],
    weekly_executive_summary: ["aiCompanyTimelineProvider", "aiDirectorCashflowProvider", "aiForecastProvider", "aiDirectorSecuritySummaryProvider"],
    director_delegation_draft: ["aiCompanyTimelineProvider", "aiDirectorSecuritySummaryProvider"],
    approval_rationale_review: ["aiApprovalQueueProvider", "aiDirectorApprovalContextProvider", "aiDirectorFinanceProvider"],
    security_safe_summary: ["aiDirectorSecuritySummaryProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: DirectorCompanyContext, intent: DirectorIntent): {
  results: DirectorDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "directorCompanyPipeline",
      "role:director",
      "source_chain:approval>field>procurement>warehouse>finance>documents>office>security_summary>decision_queue",
      ...keys,
    ],
    results: keys.map((key) => DIRECTOR_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

export function answerDirectorCompanyQuestion(params: {
  context: DirectorCompanyContext;
  questionRu: string;
  actionId?: DirectorIntent;
}): DirectorCompanyAnswer {
  const hiddenTechnicalData = directorHiddenTechnicalData(params.context);
  const safeContext = sanitizeDirectorContext(params.context);
  const action = params.actionId ? getDirectorActionQuestion(params.actionId, safeContext.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeDirectorIntent(questionRu).intent;
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
    ...results.flatMap((result) => result.permissionLimited),
  ];
  return composeDirectorCompanyAnswer({
    context: safeContext,
    intent,
    questionRu,
    providerTrace,
    missingData: [...new Set(missingData)],
    hiddenTechnicalData,
  });
}

export function answerDirectorAction(params: {
  context: DirectorCompanyContext;
  actionId: DirectorIntent;
}): DirectorCompanyAnswer {
  const action = getDirectorActionQuestion(params.actionId, params.context.screenId);
  return answerDirectorCompanyQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildDirectorAiBlockViewModel(context: DirectorCompanyContext): {
  titleRu: string;
  decisionsCount: number;
  overdueCount: number;
  blockedObjectsCount: number;
  financeRiskCount: number;
  procurementRiskCount: number;
  warehouseRiskCount: number;
  documentRiskCount: number;
  topDecisionRu: string;
  missingData: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const financeRiskCount = context.finance.filter((item) => item.status !== "paid").length;
  const procurementRiskCount = context.procurementRequests.filter((item) => item.status !== "approved").length;
  const warehouseRiskCount = context.warehouse.filter((item) => (item.deficitQty ?? 0) > 0 || !item.incomingConfirmed).length;
  const documentRiskCount = context.documents.filter((item) => item.status !== "ready").length;
  const blockedObjectsCount = context.works.filter((item) => item.status === "blocked").length;
  const overdueCount = context.approvals.filter((item) => item.status === "overdue" || (item.overdueDays ?? 0) > 0).length;
  const decisionsCount =
    context.approvals.length +
    financeRiskCount +
    procurementRiskCount +
    warehouseRiskCount +
    documentRiskCount +
    blockedObjectsCount;
  const actions = [
    "Что решить сегодня",
    "Что блокирует объекты",
    "Риски по деньгам",
    "Риски по закупкам",
    "Риски по складу",
    "Документы и evidence",
    "Подготовить поручения",
    "Открыть approvals",
  ];
  const topFinance = context.finance.find((item) => item.status === "blocked" || item.riskLevel === "high" || item.riskLevel === "critical");
  const topWork = context.works.find((item) => item.status === "blocked");
  return {
    titleRu: "Готово от AI",
    decisionsCount,
    overdueCount,
    blockedObjectsCount,
    financeRiskCount,
    procurementRiskCount,
    warehouseRiskCount,
    documentRiskCount,
    topDecisionRu: topFinance
      ? `Проверить ${topFinance.invoiceId ?? topFinance.paymentId ?? topFinance.id}: ${topFinance.amount} ${topFinance.currency}`
      : topWork
        ? `${topWork.objectNameRu}: ${topWork.workNameRu}`
        : "Нет source-backed top decision",
    missingData: [
      ...(context.forecastProviderConnected ? [] : ["cashflow source не подключён"]),
      ...(context.securitySummaryProviderConnected ? [] : ["security summary provider не подключён"]),
      ...(context.sources.length ? [] : ["источники не загружены"]),
    ],
    inputPlaceholderRu: "Спросить по компании, объектам, деньгам, складу, закупкам...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

export const directorCompanyPipeline = answerDirectorCompanyQuestion;
