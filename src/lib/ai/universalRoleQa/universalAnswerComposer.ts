import {
  buildAiAppContextGraph,
  type AiAppContextGraphBuildInput,
  type AiContextGraphBuildResult,
  type AiSourceRef,
} from "../appContextGraph";
import { getUniversalAccountingKnowledgeDraft } from "./universalAccountingKnowledgeProvider";
import {
  retrieveUniversalAppData,
  type UniversalRoleQaAppDataRetrievalResult,
  type UniversalRoleQaOpenLink,
  type UniversalRoleQaRetrievalRequest,
} from "./universalAppDataRetriever";
import { getUniversalConstructionKnowledgeDraft } from "./universalConstructionKnowledgeProvider";
import { extractUniversalRoleQaEntity, type UniversalRoleQaEntity } from "./universalEntityExtractor";
import { extractUniversalRoleQaFilters, type UniversalRoleQaFilters } from "./universalFilterExtractor";
import { classifyUniversalRoleQaIntent, type UniversalRoleQaIntent } from "./universalIntentClassifier";
import { retrieveUniversalMarketplace } from "./universalMarketplaceRetriever";
import { retrieveUniversalPdfDocuments } from "./universalPdfRetriever";
import { resolveUniversalRoleContext } from "./universalRoleContextResolver";
import { resolveUniversalScreenContext } from "./universalScreenContextResolver";
import {
  retrieveUniversalExternalWeb,
  type UniversalExternalWebRetrievalResult,
} from "./universalExternalWebRetriever";
import {
  planUniversalRoleQaSources,
  type UniversalExternalWebResult,
  type UniversalRoleQaSourcePlan,
} from "./universalSourcePlanner";
import { retrieveUniversalSupplierHistory } from "./universalSupplierHistoryRetriever";
import {
  makeUniversalRoleQaId,
  normalizeUniversalRoleQaQuestion,
  uniqueUniversalStrings,
} from "./universalQuestionNormalizer";
import {
  buildGlobalEstimateInputFromRoute,
  routeUniversalEstimateIntent,
  type EstimateIntentRoute,
} from "../estimateRouting";
import {
  calculateGlobalConstructionEstimateSync,
  formatGlobalEstimateAnswer,
  type GlobalEstimateResult,
} from "../globalEstimate";

export type UniversalRoleQaAnswerKind =
  | "count_answer"
  | "list_answer"
  | "breakdown_answer"
  | "trace_answer"
  | "estimate_draft"
  | "calculation_answer"
  | "technology_reference"
  | "document_answer"
  | "finance_review"
  | "accounting_reference"
  | "supplier_selection"
  | "role_summary"
  | "checked_empty_answer"
  | "permission_limited_answer"
  | "clarifying_with_partial_answer";

export type UniversalRoleQaAnswer = {
  id: string;
  role: string;
  screenId: string;
  questionRu: string;
  normalizedQuestionRu: string;
  intent: UniversalRoleQaIntent;
  entity: UniversalRoleQaEntity;
  filters: UniversalRoleQaFilters;
  sourcePlan: UniversalRoleQaSourcePlan;
  answerKind: UniversalRoleQaAnswerKind;
  shortAnswerRu: string;
  sections: {
    titleRu: string;
    items: {
      textRu: string;
      sourceRefIds: string[];
      status:
        | "found"
        | "missing"
        | "risk"
        | "blocked"
        | "draft"
        | "checked_empty"
        | "external_reference"
        | "requires_review";
    }[];
  }[];
  openLinks: UniversalRoleQaOpenLink[];
  sourceRefs: AiSourceRef[];
  externalWebResults: UniversalExternalWebResult[];
  sourceDisclosure: {
    appData: "used" | "checked_empty" | "not_applicable" | "permission_limited";
    pdfDocuments: "used" | "checked_empty" | "not_applicable" | "permission_limited";
    marketplace: "used" | "checked_empty" | "not_applicable";
    supplierHistory: "used" | "checked_empty" | "not_applicable";
    externalWeb: "used" | "not_used" | "not_connected" | "not_allowed";
    generalKnowledge: "used_as_draft" | "not_used";
  };
  missingData: string[];
  permissionLimits: {
    hiddenSourceType: string;
    reasonRu: string;
  }[];
  nextStepRu: string;
  statusRu:
    | "Данные не изменены"
    | "Черновик подготовлен"
    | "Требуется согласование"
    | "Доступ ограничен";
  safetyStatus: {
    changedData: false;
    draftOnly: boolean;
    approvalRequired: boolean;
    finalSubmit: false;
    autoApproval: false;
    dangerousMutation: false;
  };
  estimateRoute?: EstimateIntentRoute;
  globalEstimateResult?: GlobalEstimateResult;
  estimateActions?: {
    id: "make_pdf" | "save_estimate" | "create_request" | "clarify_city" | "refresh_prices";
    labelRu: string;
    visible: boolean;
  }[];
};

export type UniversalRoleQaOrchestratorInput = {
  questionRu: string;
  role: string;
  screenId: string;
  route?: string;
  userId?: string;
  companyId?: string;
  graph?: AiContextGraphBuildResult;
  appContextGraphInput?: AiAppContextGraphBuildInput;
  externalWebConnected?: boolean;
  externalWebResults?: UniversalExternalWebResult[];
  countryCode?: string;
  cityOrRegion?: string;
  referenceDate?: string;
};

function uniqueRefs(refs: readonly AiSourceRef[]): AiSourceRef[] {
  const seen = new Set<string>();
  const result: AiSourceRef[] = [];
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    result.push(ref);
  }
  return result;
}

function uniqueOpenLinks(links: readonly UniversalRoleQaOpenLink[]): UniversalRoleQaOpenLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.sourceRefId)) return false;
    seen.add(link.sourceRefId);
    return true;
  });
}

function createEmptyGraph(): AiContextGraphBuildResult {
  return { nodes: [], sourceRefs: [], externalSourceRefs: [], providerTrace: [] };
}

function buildRequest(
  sourcePlan: UniversalRoleQaSourcePlan,
  input: UniversalRoleQaOrchestratorInput,
): UniversalRoleQaRetrievalRequest {
  return {
    sourcePlan,
    query: {
      normalizedQuestionRu: sourcePlan.normalizedQuestionRu,
      intent: sourcePlan.intent,
      entity: sourcePlan.entity,
      filters: sourcePlan.filters,
    },
    roleScope: {
      role: input.role,
      userId: input.userId ?? "ai-readonly-user",
      companyId: input.companyId ?? "company-scope",
    },
    limits: {
      maxRows: 25,
      maxPdfChunks: 8,
      maxMarketplaceOffers: 8,
      maxWebResults: 5,
    },
  };
}

function disclosureFor(input: {
  sourcePlan: UniversalRoleQaSourcePlan;
  app: UniversalRoleQaAppDataRetrievalResult;
  pdfUsed: boolean;
  pdfCheckedEmpty: boolean;
  marketplaceUsed: boolean;
  marketplaceCheckedEmpty: boolean;
  supplierUsed: boolean;
  supplierCheckedEmpty: boolean;
  web: UniversalExternalWebRetrievalResult;
  generalKnowledgeUsed: boolean;
}): UniversalRoleQaAnswer["sourceDisclosure"] {
  return {
    appData: input.sourcePlan.appDataRequired ? (input.app.used ? "used" : "checked_empty") : "not_applicable",
    pdfDocuments: input.sourcePlan.pdfRequired ? (input.pdfUsed ? "used" : input.pdfCheckedEmpty ? "checked_empty" : "not_applicable") : "not_applicable",
    marketplace: input.sourcePlan.sourceOrder.includes("internal_marketplace")
      ? (input.marketplaceUsed ? "used" : input.marketplaceCheckedEmpty ? "checked_empty" : "not_applicable")
      : "not_applicable",
    supplierHistory: input.sourcePlan.sourceOrder.includes("supplier_history")
      ? (input.supplierUsed ? "used" : input.supplierCheckedEmpty ? "checked_empty" : "not_applicable")
      : "not_applicable",
    externalWeb: input.web.notAllowed ? "not_allowed" : input.web.used ? "used" : input.web.connected ? "not_used" : "not_connected",
    generalKnowledge: input.generalKnowledgeUsed ? "used_as_draft" : "not_used",
  };
}

function answerKindFor(intent: UniversalRoleQaIntent): UniversalRoleQaAnswerKind {
  if (intent === "app_data_count") return "count_answer";
  if (intent === "app_data_list" || intent === "procurement_request_review") return "list_answer";
  if (intent === "warehouse_issue_trace") return "trace_answer";
  if (intent === "construction_estimate") return "estimate_draft";
  if (intent === "construction_material_calculation") return "calculation_answer";
  if (intent === "construction_technology" || intent === "construction_norm_reference") return "technology_reference";
  if (intent.startsWith("document_")) return "document_answer";
  if (intent.startsWith("finance_")) return "finance_review";
  if (intent === "accounting_entry_help") return "accounting_reference";
  if (intent === "marketplace_supplier_search" || intent === "procurement_offer_selection") return "supplier_selection";
  if (intent.includes("summary") || intent.includes("review")) return "role_summary";
  return "clarifying_with_partial_answer";
}

function composeInternalSections(app: UniversalRoleQaAppDataRetrievalResult): UniversalRoleQaAnswer["sections"] {
  if (app.items.length === 0) {
    return [{
      titleRu: "Что проверено",
      items: [{
        textRu: "Проверен app context graph с role/company scope и bounded limit. Подходящие записи не найдены.",
        sourceRefIds: [],
        status: "checked_empty",
      }],
    }];
  }
  return [{
    titleRu: "Что найдено",
    items: app.items.map((item) => ({
      textRu: item.textRu,
      sourceRefIds: item.sourceRefIds,
      status: item.status,
    })),
  }];
}

function composeConstructionSections(input: {
  filters: UniversalRoleQaFilters;
  web: UniversalExternalWebRetrievalResult;
}): { sections: UniversalRoleQaAnswer["sections"]; missingData: string[] } {
  const draft = getUniversalConstructionKnowledgeDraft(input.filters);
  const sections: UniversalRoleQaAnswer["sections"] = [
    {
      titleRu: "Допущения",
      items: draft.assumptionsRu.map((textRu) => ({ textRu, sourceRefIds: [], status: "draft" })),
    },
    {
      titleRu: "Состав работ",
      items: draft.workStepsRu.map((textRu) => ({ textRu, sourceRefIds: [], status: "draft" })),
    },
    {
      titleRu: "Материалы и услуги",
      items: draft.materialsRu.map((textRu) => ({ textRu, sourceRefIds: [], status: "draft" })),
    },
  ];
  if (input.web.results.length) {
    sections.push({
      titleRu: "Внешние источники",
      items: input.web.results.map((result) => ({
        textRu: `${result.titleRu}; ${result.domain}; проверено: ${result.checkedAt}`,
        sourceRefIds: [],
        status: result.requiresReview ? "requires_review" : "external_reference",
      })),
    });
  }
  return { sections, missingData: draft.missingDataRu };
}

const ESTIMATE_ACTIONS: NonNullable<UniversalRoleQaAnswer["estimateActions"]> = [
  { id: "make_pdf", labelRu: "Сделать PDF", visible: true },
  { id: "save_estimate", labelRu: "Сохранить в сметы", visible: true },
  { id: "create_request", labelRu: "Создать заявку", visible: true },
  { id: "clarify_city", labelRu: "Уточнить город", visible: true },
  { id: "refresh_prices", labelRu: "Обновить цены", visible: true },
];

function composeGlobalEstimateSections(result: GlobalEstimateResult): UniversalRoleQaAnswer["sections"] {
  const formatted = formatGlobalEstimateAnswer(result);
  const sourceItems = result.sections
    .flatMap((section) => section.rows)
    .flatMap((row) => row.sourceEvidence.map((evidence) => ({
      textRu: `${row.rowNumber}. ${row.name}: ${evidence.label}; freshness=${evidence.freshness}; confidence=${evidence.confidence}; checked=${evidence.checkedAt}.`,
      sourceRefIds: [evidence.sourceId],
      status: evidence.freshness === "stale" || evidence.freshness === "expired" ? "requires_review" as const : "external_reference" as const,
    })));

  return [
    {
      titleRu: "Профессиональная смета",
      items: [{
        textRu: formatted,
        sourceRefIds: result.sources.map((source) => source.id),
        status: result.requiresReview ? "requires_review" : "draft",
      }],
    },
    {
      titleRu: "Источники и точность",
      items: sourceItems.length > 0
        ? sourceItems
        : [{
          textRu: "Для рассчитанных строк не найдены подтвержденные источники цен.",
          sourceRefIds: [],
          status: "blocked",
        }],
    },
    {
      titleRu: "Действия",
      items: ESTIMATE_ACTIONS.map((action) => ({
        textRu: action.labelRu,
        sourceRefIds: [],
        status: "draft" as const,
      })),
    },
  ];
}

function composeAccountingSections(countryCode: string): { sections: UniversalRoleQaAnswer["sections"]; missingData: string[] } {
  const draft = getUniversalAccountingKnowledgeDraft(countryCode);
  return {
    sections: [{
      titleRu: "Проводка и учет",
      items: draft.guidanceRu.map((textRu) => ({ textRu, sourceRefIds: [], status: "requires_review" })),
    }],
    missingData: draft.missingDataRu,
  };
}

function shortAnswerFor(input: {
  intent: UniversalRoleQaIntent;
  entity: UniversalRoleQaEntity;
  filters: UniversalRoleQaFilters;
  app: UniversalRoleQaAppDataRetrievalResult;
  web: UniversalExternalWebRetrievalResult;
}): string {
  const count = input.app.items.length;
  if (input.intent === "app_data_count") {
    const label = input.filters.period?.labelRu ? `за ${input.filters.period.labelRu}` : "по заданному фильтру";
    const entityLabel = input.entity === "payment" ? "платежей" : input.entity === "invoice" ? "счетов" : "заявок";
    return count > 0 ? `${label[0].toUpperCase()}${label.slice(1)} найдено ${count} ${entityLabel}.` : `${label[0].toUpperCase()}${label.slice(1)} ${entityLabel} не найдены.`;
  }
  if (input.intent === "warehouse_issue_trace") return count > 0 ? "Движение материала найдено по складу, выдаче и связанным работам." : "Движение материала не найдено в переданном app context graph.";
  if (input.intent.startsWith("finance_") || input.intent === "document_payment_blocker_review") return count > 0 ? `Найдено платежей/финансовых объектов с блокерами: ${count}.` : "Платежи с указанным блокером не найдены.";
  if (input.intent.startsWith("document_")) return count > 0 ? "Документ/PDF найден и связан с объектами приложения." : "Документ/PDF не найден в доступном контексте.";
  if (input.intent === "marketplace_supplier_search" || input.intent === "procurement_offer_selection") return `По поставщикам и товарам найдено внутренних вариантов: ${count}; внешний web ${input.web.used ? "использован как рыночная справка" : "не использован как внутренний факт"}.`;
  if (input.intent === "construction_estimate") {
    const quantity = input.filters.quantity ? `${input.filters.quantity.value} ${input.filters.quantity.unit}` : "без объема";
    return `Готовая проектная смета не найдена. Ниже черновой расчет на ${quantity}; его нужно уточнить по проекту, ценам и условиям.`;
  }
  if (input.intent === "accounting_entry_help") return "Проводка дана как справочная рекомендация. Требуется проверка бухгалтером.";
  if (input.intent.includes("summary") || input.intent.includes("review")) return count > 0 ? `По роли найдено ${count} связанных объектов и блокеров.` : "По роли выполнена первая проверка, подходящие объекты не найдены.";
  return count > 0 ? `Найдено объектов: ${count}.` : "Подходящие данные не найдены, но вопрос распознан и проверен.";
}

export function answerUniversalRoleQa(input: UniversalRoleQaOrchestratorInput): UniversalRoleQaAnswer {
  const normalizedQuestionRu = normalizeUniversalRoleQaQuestion(input.questionRu);
  const roleContext = resolveUniversalRoleContext(input.role);
  const screenContext = resolveUniversalScreenContext(input.screenId, input.route);
  const intent = classifyUniversalRoleQaIntent(input.questionRu, roleContext.role);
  const entity = extractUniversalRoleQaEntity(input.questionRu);
  const filters = extractUniversalRoleQaFilters(input.questionRu, input.referenceDate);
  const estimateRoute = routeUniversalEstimateIntent(input.questionRu);
  const shouldUseGlobalEstimate = estimateRoute.shouldCallEstimateTool;
  const globalEstimateResult = shouldUseGlobalEstimate
    ? calculateGlobalConstructionEstimateSync(buildGlobalEstimateInputFromRoute(estimateRoute, {
      countryCode: estimateRoute.location?.countryCode ?? input.countryCode ?? "KG",
      city: estimateRoute.location?.city ?? input.cityOrRegion,
    }))
    : undefined;
  const sourcePlan = planUniversalRoleQaSources({
    questionRu: input.questionRu,
    roleContext,
    screenContext,
    intent,
    entity,
    filters,
  });
  const graph = input.graph ?? (input.appContextGraphInput ? buildAiAppContextGraph(input.appContextGraphInput) : createEmptyGraph());
  const request = buildRequest(sourcePlan, input);
  const app = retrieveUniversalAppData(request, graph);
  const pdf = retrieveUniversalPdfDocuments(request, graph);
  const marketplace = retrieveUniversalMarketplace(request, graph);
  const supplierHistory = retrieveUniversalSupplierHistory(request, graph);
  const web = retrieveUniversalExternalWeb({
    sourcePlan,
    connected: input.externalWebConnected === true,
    providedResults: input.externalWebResults,
    countryCode: input.countryCode ?? "KG",
    cityOrRegion: input.cityOrRegion,
  });

  const useMarketplace = sourcePlan.marketplaceFirst || intent === "marketplace_supplier_search";
  const usePdf = sourcePlan.pdfRequired;
  const useConstructionDraft = !shouldUseGlobalEstimate && (intent === "construction_estimate" || intent === "construction_material_calculation" || intent === "construction_technology" || intent === "construction_norm_reference");
  const useAccountingDraft = intent === "accounting_entry_help";

  let sections = globalEstimateResult ? composeGlobalEstimateSections(globalEstimateResult) : composeInternalSections(app);
  let missingData = globalEstimateResult
    ? uniqueUniversalStrings(globalEstimateResult.clarifyingQuestions)
    : uniqueUniversalStrings(app.items.flatMap((item) => item.status === "risk" || item.status === "blocked" ? [item.textRu] : []));
  if (!shouldUseGlobalEstimate && usePdf && pdf.items.length) {
    sections = [...sections, { titleRu: "PDF/документы", items: pdf.items }];
  }
  if (!shouldUseGlobalEstimate && useMarketplace && marketplace.items.length) {
    sections = [...sections, { titleRu: "Marketplace", items: marketplace.items }];
  }
  if (!shouldUseGlobalEstimate && useMarketplace && supplierHistory.items.length) {
    sections = [...sections, { titleRu: "История поставщиков", items: supplierHistory.items }];
  }
  if (useConstructionDraft) {
    const construction = composeConstructionSections({ filters, web });
    sections = [...sections, ...construction.sections];
    missingData = uniqueUniversalStrings([...missingData, ...construction.missingData]);
  }
  if (useAccountingDraft) {
    const accounting = composeAccountingSections(input.countryCode ?? "KG");
    sections = [...sections, ...accounting.sections];
    missingData = uniqueUniversalStrings([...missingData, ...accounting.missingData]);
  }

  const sourceRefs = uniqueRefs([
    ...app.sourceRefs,
    ...(usePdf ? pdf.sourceRefs : []),
    ...(useMarketplace ? marketplace.sourceRefs : []),
    ...(useMarketplace ? supplierHistory.sourceRefs : []),
  ]);
  const openLinks = uniqueOpenLinks([
    ...app.openLinks,
    ...sourceRefs
      .filter((ref) => ref.permission.canOpen || ref.permission.reasonRu)
      .map((ref) => ({
        labelRu: ref.labelRu,
        sourceRefId: ref.id,
        enabled: ref.permission.canOpen && Boolean(ref.appLink?.route),
        route: ref.appLink?.route,
        disabledReasonRu: ref.permission.canOpen ? undefined : ref.permission.reasonRu,
      })),
  ]);

  const shortAnswerRu = globalEstimateResult
    ? `Ниже профессиональная смета на ${globalEstimateResult.work.title} — ${globalEstimateResult.input.volume} ${globalEstimateResult.input.unit}. Расчет выполнен backend-движком по source-backed ставкам.`
    : shortAnswerFor({ intent, entity, filters, app, web });
  const sourceDisclosure = disclosureFor({
    sourcePlan,
    app,
    pdfUsed: pdf.used,
    pdfCheckedEmpty: pdf.checkedEmpty,
    marketplaceUsed: marketplace.used,
    marketplaceCheckedEmpty: marketplace.checkedEmpty,
    supplierUsed: supplierHistory.used,
    supplierCheckedEmpty: supplierHistory.checkedEmpty,
    web,
    generalKnowledgeUsed: shouldUseGlobalEstimate || useConstructionDraft || useAccountingDraft,
  });
  const statusRu = globalEstimateResult || useConstructionDraft ? "Черновик подготовлен" : useAccountingDraft ? "Требуется согласование" : "Данные не изменены";

  return {
    id: makeUniversalRoleQaId("universal-role-qa-answer", `${input.role}:${input.screenId}:${input.questionRu}`),
    role: roleContext.role,
    screenId: screenContext.screenId,
    questionRu: input.questionRu,
    normalizedQuestionRu,
    intent,
    entity,
    filters,
    sourcePlan,
    answerKind: globalEstimateResult
      ? "estimate_draft"
      : app.items.length === 0 && !useConstructionDraft && !useAccountingDraft ? "checked_empty_answer" : answerKindFor(intent),
    shortAnswerRu,
    sections,
    openLinks,
    sourceRefs,
    externalWebResults: web.results,
    sourceDisclosure,
    missingData,
    permissionLimits: openLinks
      .filter((link) => !link.enabled && link.disabledReasonRu)
      .map((link) => ({ hiddenSourceType: link.sourceRefId, reasonRu: link.disabledReasonRu ?? "Доступ ограничен." })),
    nextStepRu: globalEstimateResult
      ? "Проверить город, выбранный уровень качества и открыть действие «Сделать PDF» для структурированной сметы."
      : useConstructionDraft
        ? "Уточнить недостающие параметры и затем собрать точную смету по проекту и актуальным ценам."
        : useAccountingDraft
          ? "Проверить рекомендацию бухгалтером и сверить первичные документы."
          : app.items.length
            ? "Открыть связанные объекты и проверить недостающие связи без изменения данных."
            : "Уточнить период, объект или источник и повторить read-only проверку.",
    statusRu,
    safetyStatus: {
      changedData: false,
      draftOnly: Boolean(globalEstimateResult) || useConstructionDraft || useAccountingDraft || intent === "marketplace_product_draft",
      approvalRequired: useAccountingDraft || intent === "draft_action",
      finalSubmit: false,
      autoApproval: false,
      dangerousMutation: false,
    },
    estimateRoute: shouldUseGlobalEstimate ? estimateRoute : undefined,
    globalEstimateResult,
    estimateActions: globalEstimateResult ? ESTIMATE_ACTIONS : undefined,
  };
}
