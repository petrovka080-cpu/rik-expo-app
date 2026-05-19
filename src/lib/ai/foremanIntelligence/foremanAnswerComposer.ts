import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import {
  buildConstructionTimeline,
  composeConstructionObjectReportSections,
  detectConstructionMissingData,
  scoreConstructionReadiness,
  type ConstructionDataGraphEvent,
} from "../constructionDataGraph";
import { getForemanIntentContract } from "./foremanIntentRouter";
import type {
  ForemanIntent,
  ForemanWorkdayAnswer,
  ForemanWorkdayAnswerStatus,
} from "./foremanTypes";

const TECHNICAL_COPY_PATTERNS = [
  /safe_read/i,
  /draft_only/i,
  /approval_required/i,
  /exact_blocker/i,
  /provider/i,
  /runtime/i,
  /transport/i,
  /mutation/i,
  /AI собирает этот блок/i,
  /нужен конкретный источник/i,
  /проверен экран/i,
  /generic fallback/i,
];

function sourceLabel(source: ConstructionKnowledgeSource): string {
  const file = source.fileName ? `, файл ${source.fileName}` : "";
  const page = source.page ? `, стр. ${source.page}` : "";
  const line = source.linkedEstimateLineId ? `, строка ${source.linkedEstimateLineId}` : "";
  return `${source.labelRu}${file}${page}${line}`;
}

function sourceLinesForRefs(
  sourceRefs: string[],
  sources: ConstructionKnowledgeSource[],
): string[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const lines = sourceRefs
    .map((ref) => sourceById.get(ref))
    .filter((source): source is ConstructionKnowledgeSource => Boolean(source))
    .map((source) => sourceLabel(source));
  return [...new Set(lines)];
}

function answerStatusForIntent(intent: ForemanIntent): ForemanWorkdayAnswerStatus {
  const mode = getForemanIntentContract(intent).answerMode;
  if (mode === "draft") return "draft_prepared";
  if (mode === "approval_route") return "requires_approval";
  return "data_not_changed";
}

function statusText(status: ForemanWorkdayAnswerStatus): string {
  if (status === "draft_prepared") {
    return "Черновик подготовлен. Финальная отправка не выполнена.";
  }
  if (status === "requires_approval") {
    return "Требуется согласование. Данные не изменены.";
  }
  return "Данные не изменены.";
}

function nextStepForIntent(params: {
  intent: ForemanIntent;
  hasWorks: boolean;
  hasProjectSources: boolean;
  hasEstimateSources: boolean;
  hasNormSources: boolean;
  hasMaterialBlockers: boolean;
}): string {
  if (!params.hasWorks) {
    return "Загрузить или выбрать работы/документы, привязать их к объекту и повторить сверку; пока можно использовать только общий чек-лист.";
  }
  if (params.intent === "estimate_comparison" && !params.hasEstimateSources) {
    return "Привязать смету или BOQ к объекту/работе, затем повторить сверку объёмов.";
  }
  if (params.intent === "architecture_pdf_check" && !params.hasProjectSources) {
    return "Загрузить PDF проекта, выбрать документ из загруженных или привязать проект к объекту.";
  }
  if (params.intent === "construction_norms_check" && !params.hasNormSources) {
    return "Загрузить стандарт компании или нормативный PDF; до этого использовать только общий строительный чек-лист.";
  }
  if (params.intent === "contractor_message_draft") {
    return "Отправить подрядчику черновик запроса после ручной проверки списка фото, документов и замечаний.";
  }
  if (params.intent === "material_blockers" || params.intent === "procurement_handoff") {
    return "Передать снабженцу черновик handoff с объектом, зоной, количеством и основанием; заказ не создаётся автоматически.";
  }
  if (params.intent === "act_draft") {
    return "Подготовить черновик акта и отправить человеку на проверку источников.";
  }
  if (params.hasMaterialBlockers) {
    return "Проверить missing data, запросить недостающие подтверждения и отдельно передать снабженцу material handoff по связанным работам.";
  }
  return "Проверить missing data, запросить недостающие подтверждения и готовить только черновик отчёта/акта.";
}

function shortSummary(params: {
  periodRu: string;
  events: ConstructionDataGraphEvent[];
  sources: ConstructionKnowledgeSource[];
}): string {
  if (params.events.length === 0 && params.sources.length > 0) {
    return `За ${params.periodRu} работы в системе не найдены, но есть документы/PDF. Подготовлен частичный разбор по источникам без утверждения проектных фактов сверх документов.`;
  }
  if (params.events.length === 0) {
    return `За ${params.periodRu} работы и документы не найдены. Ни один факт не выдуман; ниже список данных, которые нужно загрузить или привязать.`;
  }
  const readiness = scoreConstructionReadiness(params.events);
  return `За ${params.periodRu} найдено работ: ${readiness.total}. Выполнено или готово к акту: ${readiness.done}. Не закрыто: ${readiness.notClosed}.`;
}

function objectSections(params: {
  events: ConstructionDataGraphEvent[];
  sources: ConstructionKnowledgeSource[];
}): string[] {
  if (params.events.length === 0) {
    return [
      "1. Объект не найден",
      "   Сделано:",
      "   - Работы за период не найдены в доступном контексте.",
      "",
      "   Не сделано:",
      "   - Нельзя подтвердить выполнение без работы, объекта или документа.",
      "",
      "   Не хватает:",
      "   - выбрать объект или работу;",
      "   - загрузить/привязать PDF проекта, смету, акт или ежедневный отчёт;",
      "   - добавить фото/evidence.",
      "",
      "   Источники:",
      "   - Точный источник по объекту не найден.",
    ];
  }

  const sections = composeConstructionObjectReportSections(params.events);
  return sections.flatMap((section, index) => {
    const relatedSources = sourceLinesForRefs(section.sources, params.sources);
    return [
      `${index + 1}. ${section.objectNameRu}`,
      "   Сделано:",
      ...(section.done.length ? section.done.map((item) => `   - ${item}`) : ["   - Нет подтверждённых выполненных работ."]),
      "",
      "   Не сделано:",
      ...(section.notDone.length ? section.notDone.map((item) => `   - ${item}`) : ["   - Не выявлено по доступным данным."]),
      "",
      "   Не хватает:",
      ...(section.missing.length ? section.missing.map((item) => `   - ${item}`) : ["   - Не выявлено по доступным данным."]),
      "",
      "   Источники:",
      ...(relatedSources.length ? relatedSources.map((item) => `   - ${item}`) : ["   - Источник по объекту не найден."]),
    ];
  });
}

function dataSpecificLines(params: {
  intent: ForemanIntent;
  events: ConstructionDataGraphEvent[];
  sources: ConstructionKnowledgeSource[];
}): string[] {
  const projectSources = params.sources.filter((source) =>
    ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"].includes(source.type),
  );
  const estimateSources = params.sources.filter((source) => ["estimate_pdf", "boq"].includes(source.type));
  const normSources = params.sources.filter((source) =>
    ["normative_pdf", "company_standard", "country_profile"].includes(source.type),
  );
  const warehouseSources = params.sources.filter((source) => source.type === "warehouse_stock");
  const requestSources = params.sources.filter((source) => source.type === "procurement_request");

  if (params.intent === "estimate_comparison") {
    return [
      "Сверка со сметой:",
      ...(estimateSources.length
        ? estimateSources.map((source) => `- ${sourceLabel(source)}`)
        : ["- Смета или BOQ не привязаны к работе/объекту."]),
      ...params.events
        .filter((event) => typeof event.plannedQty === "number" || typeof event.actualQty === "number")
        .map((event) => `- ${event.workNameRu ?? "Работа"}: план ${event.plannedQty ?? "не указан"} ${event.unit ?? ""}, факт ${event.actualQty ?? "не указан"} ${event.unit ?? ""}.`),
    ];
  }

  if (params.intent === "architecture_pdf_check") {
    return [
      "Сверка с проектом:",
      ...(projectSources.length
        ? projectSources.map((source) => `- ${sourceLabel(source)}`)
        : [
          "- Точный проектный источник не найден.",
          "- Что можно сделать: загрузить PDF проекта; выбрать документ; привязать к объекту; показать общий чек-лист.",
        ]),
    ];
  }

  if (params.intent === "construction_norms_check") {
    return [
      "Основание по нормам:",
      ...(normSources.length
        ? normSources.map((source) => `- ${sourceLabel(source)}`)
        : [
          "- Общий строительный чек-лист: фото до/после, акт для скрытых работ, подпись ответственного, привязка к объекту/зоне, подтверждение материала.",
          "- В проекте не найден привязанный нормативный документ, country profile или стандарт компании.",
        ]),
    ];
  }

  if (params.intent === "material_blockers" || params.intent === "procurement_handoff") {
    return [
      "Материалы и handoff:",
      ...(warehouseSources.length ? warehouseSources.map((source) => `- Склад: ${sourceLabel(source)}`) : ["- Связанный складской остаток не найден."]),
      ...(requestSources.length ? requestSources.map((source) => `- Заявка: ${sourceLabel(source)}`) : ["- Связанная заявка снабжения не найдена."]),
    ];
  }

  if (params.intent === "contractor_message_draft" || params.intent === "subcontractor_blockers") {
    return [
      "Черновик подрядчику:",
      ...params.events.map((event) =>
        `- ${event.contractorNameRu ?? "Подрядчик"}: по работе ${event.workNameRu ?? event.id} нужно сдать ${event.blockers.map((blocker) => blocker.textRu).join("; ") || "подтверждения по источникам"}.`,
      ),
    ];
  }

  return [];
}

export function composeForemanWorkdayAnswer(params: {
  intent: ForemanIntent;
  events: ConstructionDataGraphEvent[];
  sources: ConstructionKnowledgeSource[];
  missingData: string[];
  providerTrace: string[];
  periodRu?: string;
}): ForemanWorkdayAnswer {
  const timeline = buildConstructionTimeline(params.events);
  const periodRu = params.periodRu ?? timeline.periodRu;
  const status = answerStatusForIntent(params.intent);
  const readiness = scoreConstructionReadiness(params.events);
  const missing = [
    ...params.missingData,
    ...detectConstructionMissingData(params.events).flatMap((entry) => entry.missing),
  ];
  const uniqueMissing = [...new Set(missing)].filter(Boolean);
  const projectSources = params.sources.some((source) => ["project_pdf", "architecture_pdf", "engineering_pdf", "specification"].includes(source.type));
  const estimateSources = params.sources.some((source) => ["estimate_pdf", "boq"].includes(source.type));
  const normSources = params.sources.some((source) => ["normative_pdf", "company_standard", "country_profile"].includes(source.type));
  const materialBlockers = params.events.some((event) => event.blockers.some((blocker) => blocker.kind === "material_missing"));
  const risks = [
    ...(readiness.notClosed > 0 ? [`Не закрыто работ: ${readiness.notClosed}.`] : []),
    ...(materialBlockers ? ["Есть material blocker по связанным работам."] : []),
    ...(uniqueMissing.length > 0 ? ["Закрытие работ рискованно без missing evidence."] : []),
  ];
  const nextStepRu = nextStepForIntent({
    intent: params.intent,
    hasWorks: params.events.length > 0,
    hasProjectSources: projectSources,
    hasEstimateSources: estimateSources,
    hasNormSources: normSources,
    hasMaterialBlockers: materialBlockers,
  });

  const sourceLines = params.sources.length
    ? params.sources.map((source) => `- ${sourceLabel(source)}`)
    : ["- Основание: общий строительный чек-лист; проектный/сметный/PDF источник не найден."];

  const answerRu = [
    "Ответ",
    "",
    "Коротко:",
    shortSummary({ periodRu, events: params.events, sources: params.sources }),
    "",
    "Период:",
    periodRu,
    "",
    "По объектам:",
    ...objectSections({ events: params.events, sources: params.sources }),
    "",
    ...dataSpecificLines({ intent: params.intent, events: params.events, sources: params.sources }),
    "",
    "Источники:",
    ...sourceLines,
    "",
    "Что не хватает:",
    ...(uniqueMissing.length ? uniqueMissing.map((item) => `- ${item}`) : ["- Не выявлено по доступным данным."]),
    "",
    "Риски:",
    ...(risks.length ? risks.map((risk) => `- ${risk}`) : ["- Подтверждённые риски не выявлены по доступным источникам."]),
    "",
    "Следующий шаг:",
    nextStepRu,
    "",
    "Статус:",
    statusText(status),
  ].join("\n");

  const technicalCopyVisible = TECHNICAL_COPY_PATTERNS.some((pattern) => pattern.test(answerRu));
  if (technicalCopyVisible) {
    throw new Error("Foreman answer contains technical copy");
  }

  return {
    intent: params.intent,
    answerRu,
    shortRu: shortSummary({ periodRu, events: params.events, sources: params.sources }),
    periodRu,
    sources: params.sources,
    missingData: uniqueMissing,
    risks,
    nextStepRu,
    status,
    changedData: false,
    providerTrace: params.providerTrace,
    noSelectedWorkOverblocked: false,
    genericBlockerUsed: false,
    directSigningUsed: false,
    directFinalSubmitUsed: false,
    directWorkCloseUsed: false,
    approvalBypassUsed: false,
  };
}

export const foremanAnswerComposer = composeForemanWorkdayAnswer;
