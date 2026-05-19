import {
  answerConstructionQuestion,
  type ConstructionKnowledgeSource,
} from "../constructionKnowledgeCore";
import {
  normalizeConstructionEvents,
  sanitizeConstructionSourcesForForeman,
  type ConstructionDataGraphEvent,
  type ConstructionDataGraphEventInput,
} from "../constructionDataGraph";
import { getForemanActionQuestion } from "./foremanActionQuestionMap";
import { composeForemanWorkdayAnswer } from "./foremanAnswerComposer";
import { FOREMAN_DATA_PROVIDER_FUNCTIONS } from "./foremanDataProviders";
import { routeForemanIntent } from "./foremanIntentRouter";
import type {
  AiDataProviderResult,
  ForemanIntent,
  ForemanProviderKey,
  ForemanWorkItem,
  ForemanWorkdayAnswer,
  ForemanWorkdayContext,
} from "./foremanTypes";

const GENERAL_FOREMAN_SOURCE: ConstructionKnowledgeSource = {
  id: "foreman:general:construction-closeout",
  type: "general_construction_knowledge",
  labelRu: "Общий строительный чек-лист закрытия работ",
  confidence: "high",
};

function toEventInput(work: ForemanWorkItem): ConstructionDataGraphEventInput {
  return {
    id: work.id,
    date: work.date,
    objectId: work.objectId,
    objectNameRu: work.objectNameRu,
    zoneId: work.zoneId,
    zoneNameRu: work.zoneNameRu,
    workId: work.id,
    workNameRu: work.nameRu,
    contractorId: work.contractorId,
    contractorNameRu: work.contractorNameRu,
    plannedQty: work.plannedQty,
    actualQty: work.actualQty,
    unit: work.unit,
    status: work.status,
    blockers: work.blockers,
    sourceRefs: work.sourceRefs,
  };
}

function periodFromContext(context: ForemanWorkdayContext): string {
  return context.periodRu ?? context.currentDate;
}

function sanitizeContext(context: ForemanWorkdayContext): ForemanWorkdayContext {
  const allowedObjectIds = [...new Set(context.works.map((work) => work.objectId))];
  const allowedWorkIds = context.works.map((work) => work.id);
  const allowedMaterialIds = [...new Set(context.works.flatMap((work) => work.materialIds ?? []))];
  const allowedContractorIds = [...new Set(context.works.map((work) => work.contractorId).filter(Boolean) as string[])];
  const safeSources = sanitizeConstructionSourcesForForeman({
    sources: [GENERAL_FOREMAN_SOURCE, ...context.sources],
    allowedObjectIds,
    allowedWorkIds,
    allowedMaterialIds,
    allowedContractorIds,
  });
  return {
    ...context,
    sources: safeSources,
  };
}

function providerKeysForIntent(intent: ForemanIntent): ForemanProviderKey[] {
  const always: ForemanProviderKey[] = [
    "aiForemanScreenContextProvider",
    "aiForemanWorksProvider",
    "aiObjectsZonesProvider",
    "aiWorkStatusProvider",
    "aiWorkEvidenceProvider",
    "aiPhotosProvider",
    "aiActsProvider",
    "aiReportsProvider",
    "aiSubcontractorProvider",
    "aiDocumentsProvider",
    "aiApprovalStatusProvider",
    "aiChatLinkedContextProvider",
  ];
  const byIntent: Partial<Record<ForemanIntent, ForemanProviderKey[]>> = {
    estimate_comparison: ["aiPdfAggregatorProvider", "aiEstimateProvider"],
    architecture_pdf_check: ["aiPdfAggregatorProvider", "aiArchitectureProjectProvider"],
    construction_norms_check: ["aiPdfAggregatorProvider", "aiConstructionNormsProvider", "aiCountryProfileProvider"],
    material_blockers: ["aiMaterialBlockerProvider", "aiWarehouseLinkedStockProvider", "aiProcurementLinkedRequestProvider"],
    warehouse_linked_status: ["aiMaterialBlockerProvider", "aiWarehouseLinkedStockProvider"],
    procurement_handoff: ["aiMaterialBlockerProvider", "aiWarehouseLinkedStockProvider", "aiProcurementLinkedRequestProvider"],
    closeout_readiness: ["aiPdfAggregatorProvider", "aiMaterialBlockerProvider", "aiWarehouseLinkedStockProvider", "aiProcurementLinkedRequestProvider"],
    act_draft: ["aiPdfAggregatorProvider", "aiEstimateProvider"],
    daily_report_draft: ["aiPdfAggregatorProvider"],
    daily_object_report: ["aiPdfAggregatorProvider", "aiEstimateProvider", "aiArchitectureProjectProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

function runProviders(context: ForemanWorkdayContext, intent: ForemanIntent): {
  results: AiDataProviderResult[];
  providerTrace: string[];
} {
  const keys = providerKeysForIntent(intent);
  return {
    providerTrace: [
      "foremanWorkdayPipeline",
      "constructionDataGraph",
      "aiConstructionKnowledgeProvider",
      ...keys,
    ],
    results: keys.map((key) => FOREMAN_DATA_PROVIDER_FUNCTIONS[key](context)),
  };
}

function eventSourceRefs(events: ConstructionDataGraphEvent[]): Set<string> {
  return new Set(events.flatMap((event) => event.sourceRefs));
}

function sourcesForAnswer(params: {
  context: ForemanWorkdayContext;
  providerResults: AiDataProviderResult[];
  events: ConstructionDataGraphEvent[];
  intent: ForemanIntent;
}): ConstructionKnowledgeSource[] {
  const refs = eventSourceRefs(params.events);
  const providerSources = params.providerResults.flatMap((result) => result.sources);
  const sourceCandidates = [
    ...params.context.sources,
    ...providerSources,
  ];
  const all = new Map(sourceCandidates.map((source) => [source.id, source]));
  const selected = Array.from(all.values()).filter((source) => refs.has(source.id));
  const intentSpecific = Array.from(all.values()).filter((source) => {
    if (params.intent === "estimate_comparison") return ["estimate_pdf", "boq"].includes(source.type);
    if (params.intent === "architecture_pdf_check") return ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"].includes(source.type);
    if (params.intent === "construction_norms_check") return ["general_construction_knowledge", "normative_pdf", "company_standard", "country_profile"].includes(source.type);
    if (params.intent === "material_blockers" || params.intent === "procurement_handoff") return ["material", "warehouse_stock", "procurement_request"].includes(source.type);
    return source.type !== "general_construction_knowledge";
  });
  const combined = [...selected, ...intentSpecific];
  const unique = new Map(combined.map((source) => [source.id, source]));
  return Array.from(unique.values());
}

export function answerForemanWorkdayQuestion(params: {
  context: ForemanWorkdayContext;
  questionRu: string;
  actionId?: ForemanIntent;
}): ForemanWorkdayAnswer {
  const action = params.actionId ? getForemanActionQuestion(params.actionId, params.context.screenId) : null;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeForemanIntent(questionRu).intent;
  const safeContext = sanitizeContext(params.context);
  const constructionCoreAnswer = answerConstructionQuestion({
    role: "foreman",
    screenId: safeContext.screenId,
    questionRu,
    sources: safeContext.sources,
  });
  const events = normalizeConstructionEvents(
    safeContext.works.map(toEventInput),
    safeContext.currentDate,
  );
  const { results, providerTrace } = runProviders(safeContext, intent);
  const missingData = [
    ...results.flatMap((result) => result.missingData),
    ...constructionCoreAnswer.missingData,
  ];
  const answer = composeForemanWorkdayAnswer({
    intent,
    events,
    sources: sourcesForAnswer({ context: safeContext, providerResults: results, events, intent }),
    missingData,
    providerTrace: [
      ...providerTrace,
      ...constructionCoreAnswer.providerTrace,
    ],
    periodRu: periodFromContext(safeContext),
  });
  return {
    ...answer,
    providerTrace: [...new Set(answer.providerTrace)],
  };
}

export function answerForemanAction(params: {
  context: ForemanWorkdayContext;
  actionId: ForemanIntent;
}): ForemanWorkdayAnswer {
  const action = getForemanActionQuestion(params.actionId, params.context.screenId);
  return answerForemanWorkdayQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildForemanAiBlockViewModel(context: ForemanWorkdayContext): {
  titleRu: string;
  today: {
    done: number;
    notClosed: number;
    readyForAct: number;
    materialBlocked: number;
    missingEvidence: number;
  };
  mainRu: string[];
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const events = normalizeConstructionEvents(context.works.map(toEventInput), context.currentDate);
  const done = events.filter((event) => event.status === "done" || event.status === "ready_for_act").length;
  const readyForAct = events.filter((event) => event.status === "ready_for_act").length;
  const materialBlocked = events.filter((event) => event.blockers.some((blocker) => blocker.kind === "material_missing")).length;
  const missingEvidence = events.filter((event) => event.blockers.length > 0).length;
  const actions = [
    "Что сделано / что нет",
    "Что мешает закрыть",
    "Проверить фото и документы",
    "Подготовить отчёт",
    "Подготовить акт",
    "Сверить со сметой/проектом",
    "Материалы и склад",
    "Написать подрядчику",
  ];
  return {
    titleRu: "Готово от AI",
    today: {
      done,
      notClosed: events.length - done,
      readyForAct,
      materialBlocked,
      missingEvidence,
    },
    mainRu: events.slice(0, 3).map((event) => `${event.objectNameRu}: ${event.workNameRu ?? event.id} - ${workStatusText(event.status)}`),
    inputPlaceholderRu: "Спросите по работам, объектам, фото, актам, материалам...",
    visibleActionLabelsRu: actions.slice(0, 5),
    hiddenActionLabelsRu: actions.slice(5),
  };
}

function workStatusText(status: ConstructionDataGraphEvent["status"]): string {
  if (status === "ready_for_act") return "можно готовить акт";
  if (status === "done") return "сделано";
  if (status === "blocked") return "заблокировано";
  if (status === "partially_done") return "частично";
  if (status === "in_progress") return "в работе";
  return "не подтверждено";
}

export const foremanWorkdayPipeline = answerForemanWorkdayQuestion;
