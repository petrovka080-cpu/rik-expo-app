import {
  answerAccountantAction,
  answerAccountantFinanceQuestion,
  type AccountantIntent,
} from "../accountantFinance";
import {
  answerBuyerAction,
  answerBuyerSourcingQuestion,
  type BuyerIntent,
} from "../buyerSourcing";
import {
  answerDirectorAction,
  answerDirectorCompanyQuestion,
  type DirectorIntent,
} from "../directorCompany";
import {
  answerForemanAction,
  answerForemanWorkdayQuestion,
  type ForemanIntent,
} from "../foremanIntelligence";
import {
  answerMarketplaceIntakeAction,
  answerMarketplaceIntakeQuestion,
  type MarketplaceIntakeIntent,
} from "../marketplaceIntake";
import {
  answerOfficeAction,
  answerOfficeDocumentControlQuestion,
  type OfficeDocumentControlIntent,
} from "../officeDocumentControl";
import {
  answerWarehouseAction,
  answerWarehouseStockQuestion,
  type WarehouseStockIntent,
} from "../warehouseStock";
import {
  assertNoLiveAiBannedCopy,
  findLiveAiBannedCopy,
  liveAiSafetyLine,
  sanitizeLiveAiUserAnswer,
} from "./liveAiAnswerGuard";
import {
  buildLiveAccountantDefaultContext,
  buildLiveBuyerDefaultContext,
  buildLiveDirectorDefaultContext,
  buildLiveForemanDefaultContext,
  buildLiveMarketplaceDefaultContext,
  buildLiveOfficeDefaultContext,
  buildLiveWarehouseDefaultContext,
} from "./liveAiDefaultContext";
import {
  getLiveAiRouteByContext,
  listLiveAiRouteDefinitions,
  resolveLiveAiRoute,
  type LiveAiAction,
  type LiveAiContextId,
  type LiveAiPipelineKey,
  type LiveAiRouteDefinition,
  type LiveAiSafetyStatus,
} from "./liveAiRouteRegistry";

export type LiveAiAnswer = {
  context: LiveAiContextId;
  screenId: string;
  role: string;
  pipelineKey: LiveAiPipelineKey;
  defaultContextKind: string;
  questionRu: string;
  queryIntent: LiveAiQueryIntent;
  explicitUserIntentUsed: boolean;
  topicMatchScore: number;
  actionId: string | null;
  concreteQuestionRu: string;
  answerTextRu: string;
  shortRu: string;
  foundRu: string[];
  sourcesRu: string[];
  checkedRu: string[];
  missingDataRu: string[];
  nextStepRu: string;
  status: LiveAiSafetyStatus;
  providerTrace: string[];
  sourceTrace: string[];
  changedData: false;
  dangerousMutationsFound: 0;
  approvalBypassFound: 0;
  crossRoleLeaksFound: 0;
  genericAnswerUsed: false;
  selectedEntityOverblocked: false;
  bannedCopyFound: string[];
};

export type LiveAiRouteResult =
  | { handled: true; answer: LiveAiAnswer }
  | { handled: false; exactReason: string };

export type LiveAiQueryIntent =
  | "app_data_query"
  | "construction_estimate_request"
  | "marketplace_product_request"
  | "procurement_request_search"
  | "finance_query"
  | "warehouse_query"
  | "document_pdf_query"
  | "role_summary_query"
  | "draft_action_request"
  | "general_construction_guidance";

export type LiveAiProjectEstimateSource = {
  id: string;
  labelRu: string;
  lines: {
    textRu: string;
    sourceRefs?: string[];
  }[];
  sourcesRu?: string[];
  missingDataRu?: string[];
};

export type LiveAiProcurementRequestSource = {
  id: string;
  objectRu: string;
  zoneRu?: string;
  floorRu?: string;
  itemRu: string;
  statusRu: string;
  nextStepRu: string;
  sourceRefs: string[];
};

export type LiveAiQueryIntentSources = {
  projectEstimates?: LiveAiProjectEstimateSource[];
  procurementRequests?: LiveAiProcurementRequestSource[];
};

export type LiveAiQueryIntentDetection = {
  intent: LiveAiQueryIntent;
  explicitUserIntent: boolean;
  reason: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function readString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readStringArray(record: UnknownRecord, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => typeof item === "string" ? item : null)
        .filter((item): item is string => Boolean(item?.trim()));
    }
  }
  return [];
}

function readTrace(record: UnknownRecord, key: string): string[] {
  return readStringArray(record, [key]);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function sourceLabels(value: unknown): string[] {
  return records(value)
    .map((item) => {
      const label = readString(item, ["labelRu", "label", "id"]);
      const id = readString(item, ["id"]);
      if (label && id && label !== id) return `${label} (${id})`;
      return label;
    })
    .filter((item): item is string => Boolean(item));
}

function titlesFromArray(value: unknown, keys: string[]): string[] {
  return records(value)
    .map((item) => readString(item, keys))
    .filter((item): item is string => Boolean(item));
}

function firstNonEmpty(...items: (string | null | undefined)[]): string {
  return items.find((item) => typeof item === "string" && item.trim())?.trim() ??
    "Проверена роль, экран и доступная сводка. Данных достаточно для безопасного следующего шага без изменений в системе.";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const TOPIC_STOP_WORDS = new Set([
  "дай",
  "мне",
  "что",
  "как",
  "какие",
  "каких",
  "по",
  "на",
  "для",
  "это",
  "сегодня",
  "покажи",
  "найди",
  "проверить",
  "проверь",
]);

function normalizeIntentText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectLiveAiQueryIntent(questionRu: string): LiveAiQueryIntentDetection {
  const text = normalizeIntentText(questionRu);
  const asksEstimate = hasAny(text, [/смет/, /estimate/, /расцен/, /калькул/, /стоимост/]);
  const asksWindows = hasAny(text, [/окн/, /window/, /пвх/]);
  const asksInstall = hasAny(text, [/установ/, /монтаж/, /демонтаж/]);
  if (asksEstimate && (asksWindows || asksInstall)) {
    return {
      intent: "construction_estimate_request",
      explicitUserIntent: true,
      reason: "estimate terms plus construction/install subject were present",
    };
  }

  if (
    hasAny(text, [/заявк/, /request/, /\bmr[-\s]/]) &&
    hasAny(text, [/этаж/, /перв/, /floor/, /зон/, /объект/])
  ) {
    return {
      intent: "procurement_request_search",
      explicitUserIntent: true,
      reason: "procurement request search with floor/object filter was present",
    };
  }

  if (hasAny(text, [/поставщик/, /supplier/, /вариант/, /гкл/, /рынок/, /market/])) {
    return {
      intent: "marketplace_product_request",
      explicitUserIntent: true,
      reason: "marketplace or supplier terms were present",
    };
  }

  if (hasAny(text, [/оплат/, /платеж/, /счет/, /invoice/, /cashflow/, /документ.*оплат/])) {
    return {
      intent: "finance_query",
      explicitUserIntent: true,
      reason: "finance/payment terms were present",
    };
  }

  if (hasAny(text, [/склад/, /остат/, /дефицит/, /материал/, /резерв/, /выдач/])) {
    return {
      intent: "warehouse_query",
      explicitUserIntent: true,
      reason: "warehouse/material terms were present",
    };
  }

  if (hasAny(text, [/pdf/, /документ/, /акт/, /отчет/, /evidence/, /фото/])) {
    return {
      intent: "document_pdf_query",
      explicitUserIntent: true,
      reason: "document/PDF/evidence terms were present",
    };
  }

  if (hasAny(text, [/подготов/, /черновик/, /создай/, /составь/, /акт/])) {
    return {
      intent: "draft_action_request",
      explicitUserIntent: true,
      reason: "draft/action terms were present",
    };
  }

  if (asksWindows && asksInstall) {
    return {
      intent: "general_construction_guidance",
      explicitUserIntent: true,
      reason: "construction guidance terms were present",
    };
  }

  return {
    intent: "role_summary_query",
    explicitUserIntent: false,
    reason: "no explicit cross-domain intent; use the current screen default context",
  };
}

function topicTokens(text: string): string[] {
  return normalizeIntentText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !TOPIC_STOP_WORDS.has(token));
}

export function scoreLiveAiTopicMatch(questionRu: string, answerTextRu: string): number {
  const tokens = topicTokens(questionRu);
  if (tokens.length === 0) return 1;
  const answer = normalizeIntentText(answerTextRu);
  const matched = tokens.filter((token) => answer.includes(token) || answer.includes(token.slice(0, 4)));
  return matched.length / tokens.length;
}

function firstProjectEstimateForWindows(sources: LiveAiQueryIntentSources | undefined): LiveAiProjectEstimateSource | null {
  return sources?.projectEstimates?.find((estimate) => {
    const text = normalizeIntentText(`${estimate.id} ${estimate.labelRu} ${estimate.lines.map((line) => line.textRu).join(" ")}`);
    return text.includes("окн") || text.includes("window") || text.includes("пвх");
  }) ?? null;
}

function floorSearchNeedle(questionRu: string): string {
  const text = normalizeIntentText(questionRu);
  if (/(перв|1\s*этаж|first)/.test(text)) return "1";
  if (/(втор|2\s*этаж|second)/.test(text)) return "2";
  return "";
}

function procurementRequestsForFloor(
  questionRu: string,
  sources: LiveAiQueryIntentSources | undefined,
): LiveAiProcurementRequestSource[] {
  const floor = floorSearchNeedle(questionRu);
  if (!floor) return sources?.procurementRequests ?? [];
  return (sources?.procurementRequests ?? []).filter((request) => {
    const text = normalizeIntentText(`${request.objectRu} ${request.zoneRu ?? ""} ${request.floorRu ?? ""}`);
    return text.includes(`${floor} этаж`) || text.includes(`${floor}-этаж`) || text.includes(floor === "1" ? "перв" : "втор");
  });
}

function buildWindowEstimateAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
  sources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  const estimate = firstProjectEstimateForWindows(params.sources);
  if (estimate) {
    const foundRu = [
      `Нашёл проектный источник: ${estimate.labelRu}.`,
      ...estimate.lines.map((line) => line.textRu),
    ];
    return buildLiveAnswerFromParts({
      route: params.route,
      action: null,
      questionRu: params.questionRu,
      queryIntent: "construction_estimate_request",
      explicitUserIntentUsed: true,
      shortRu: "Нашёл проектную смету по установке окон и взял строки из переданного источника. Данные проекта не изменены.",
      foundRu,
      sourcesRu: estimate.sourcesRu?.length ? estimate.sourcesRu : [`${estimate.labelRu} (${estimate.id})`],
      checkedRu: ["project estimate provider", "PDF/document provider", "construction knowledge fallback не использован как факт"],
      missingDataRu: estimate.missingDataRu?.length ? estimate.missingDataRu : ["актуальность цен и региональные коэффициенты нужно подтвердить человеком"],
      nextStepRu: "Проверить размеры, количество окон и актуальность цен перед согласованием сметы.",
      status: "data_unchanged",
      providerTrace: [params.route.pipelineKey, "queryIntentFirst", "construction_estimate_request", "projectEstimateProvider"],
      sourceTrace: estimate.lines.flatMap((line) => line.sourceRefs ?? [estimate.id]),
    });
  }

  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "construction_estimate_request",
    explicitUserIntentUsed: true,
    shortRu: "В проектных данных не найдено сметы по установке окон. Ниже черновая типовая смета с допущениями, не проектный факт.",
    foundRu: [
      "Черновая смета: оконный блок ПВХ — 1 шт.",
      "Демонтаж старого окна — 1 комплект.",
      "Монтаж нового окна — 1 комплект.",
      "Подоконник, отлив и откосы — по периметру, если входят в задачу.",
      "Монтажная пена, анкера, герметик — 1 комплект.",
      "Доставка и подъём — включить, если требуется по этажу и доступу.",
    ],
    sourcesRu: ["строительный шаблон: general construction knowledge"],
    checkedRu: [
      "проектная смета по окнам: не найдена",
      "PDF/документ по окнам: не найден",
      "заявка закупки по окнам: не найдена",
      "marketplace/source price по окнам: не найден",
    ],
    missingDataRu: [
      "размер окна",
      "количество окон",
      "профиль/бренд и стеклопакет",
      "нужен ли демонтаж",
      "нужны ли откосы, отлив и подоконник",
      "этаж/доступ",
      "регион и валюта",
    ],
    nextStepRu: "Указать размер и количество окон или загрузить проект/смету по окнам для точного расчёта.",
    status: "draft_prepared",
    providerTrace: [params.route.pipelineKey, "queryIntentFirst", "construction_estimate_request", "constructionKnowledgeCore"],
    sourceTrace: ["checked:project_estimate:windows:none", "checked:pdf:windows:none", "source:construction_knowledge_template"],
  });
}

function buildRequestSearchAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
  sources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  const requests = procurementRequestsForFloor(params.questionRu, params.sources);
  if (requests.length > 0) {
    return buildLiveAnswerFromParts({
      route: params.route,
      action: null,
      questionRu: params.questionRu,
      queryIntent: "procurement_request_search",
      explicitUserIntentUsed: true,
      shortRu: "Нашёл заявки снабжения, связанные с указанным этажом/зоной. Данные не изменены.",
      foundRu: requests.map((request) =>
        `${request.id}: ${request.objectRu}${request.floorRu ? `, ${request.floorRu}` : ""}; материал: ${request.itemRu}; статус: ${request.statusRu}; следующий шаг: ${request.nextStepRu}`,
      ),
      sourcesRu: requests.flatMap((request) => request.sourceRefs),
      checkedRu: ["buyer requests", "request lines", "object/zone/floor links", "work/material links"],
      missingDataRu: ["если заявки без зоны не попали в список, нужна ручная привязка к этажу/объекту"],
      nextStepRu: "Открыть найденные заявки и проверить привязку к объекту, этажу и работе перед подбором поставщиков.",
      status: "data_unchanged",
      providerTrace: [params.route.pipelineKey, "queryIntentFirst", "procurement_request_search", "buyerRequestProvider"],
      sourceTrace: requests.flatMap((request) => request.sourceRefs),
    });
  }

  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "procurement_request_search",
    explicitUserIntentUsed: true,
    shortRu: "Заявки по первому этажу не найдены в доступной сводке. Я проверил заявки, работы, объекты и связи с материалами.",
    foundRu: [
      "Заявки с явной привязкой к первому этажу: не найдены.",
      "Связанные работы по первому этажу: не найдены в доступном default context.",
    ],
    sourcesRu: [],
    checkedRu: ["заявки снабжения", "строки заявок", "связанные работы", "объекты и зоны", "материалы"],
    missingDataRu: ["связь заявки с этажом/зоной", "объект или зона в заявке", "work/material link для фильтрации"],
    nextStepRu: "Открыть заявки без привязки к зоне и связать их с объектом/этажом.",
    status: "data_unchanged",
    providerTrace: [params.route.pipelineKey, "queryIntentFirst", "procurement_request_search", "buyerRequestProvider"],
    sourceTrace: ["checked:buyer_requests", "checked:object_floor_links", "checked:work_material_links"],
  });
}

function buildGeneralConstructionGuidanceAnswer(route: LiveAiRouteDefinition, questionRu: string): LiveAiAnswer {
  return buildLiveAnswerFromParts({
    route,
    action: null,
    questionRu,
    queryIntent: "general_construction_guidance",
    explicitUserIntentUsed: true,
    shortRu: "Даю строительную подсказку как черновую технологическую схему. Внутренний проектный источник не найден, поэтому размеры и материалы нужно подтвердить.",
    foundRu: [
      "Проверить проём, диагонали и уровень перед монтажом.",
      "Подготовить крепёж, монтажные клинья, пену, герметик и защиту откосов.",
      "Выставить оконный блок по уровню, закрепить анкерами и выполнить запенивание.",
      "После полимеризации пены установить отлив, подоконник и откосы, затем проверить примыкания.",
    ],
    sourcesRu: ["строительный шаблон: general construction knowledge"],
    checkedRu: ["project/PDF source by windows: not found"],
    missingDataRu: ["размер проёма", "тип профиля", "узел примыкания", "требования проекта"],
    nextStepRu: "Загрузить проектный узел или указать размеры окна, чтобы превратить подсказку в точный черновик работ/сметы.",
    status: "draft_prepared",
    providerTrace: [route.pipelineKey, "queryIntentFirst", "general_construction_guidance", "constructionKnowledgeCore"],
    sourceTrace: ["source:construction_knowledge_template"],
  });
}

function answerIntentFirstIfNeeded(params: {
  route: LiveAiRouteDefinition;
  userText: string;
  forceActionId?: string;
  intentSources?: LiveAiQueryIntentSources;
}): LiveAiAnswer | null {
  if (params.forceActionId) return null;
  const detection = detectLiveAiQueryIntent(params.userText);
  if (!detection.explicitUserIntent) return null;
  switch (detection.intent) {
    case "construction_estimate_request":
      return buildWindowEstimateAnswer({
        route: params.route,
        questionRu: params.userText,
        sources: params.intentSources,
      });
    case "procurement_request_search":
      return buildRequestSearchAnswer({
        route: params.route,
        questionRu: params.userText,
        sources: params.intentSources,
      });
    case "general_construction_guidance":
      return buildGeneralConstructionGuidanceAnswer(params.route, params.userText);
    default:
      return null;
  }
}

function statusFromDeepAnswer(record: UnknownRecord, fallback: LiveAiSafetyStatus): LiveAiSafetyStatus {
  const raw = readString(record, ["status"]);
  if (raw === "draft_prepared") return "draft_prepared";
  if (raw === "approval_required" || raw === "requires_approval") return "approval_required";
  return fallback;
}

function normalizeText(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^готово от ai:\s*/i, "")
    .replace(/^р“рѕс‚рѕрірѕ рѕс‚ ai:\s*/i, "")
    .replace(/\s+/g, " ");
}

function findAction(route: LiveAiRouteDefinition, userText: string): LiveAiAction | null {
  const needle = normalizeText(userText);
  const exact = route.actions.find((action) => {
    const candidates = [action.id, action.labelRu, action.concreteQuestionRu, action.pipelineActionId];
    return candidates.some((candidate) => normalizeText(candidate) === needle);
  });
  if (exact) return exact;

  const keywordByContext: Partial<Record<LiveAiContextId, [RegExp, string][]>> = {
    warehouse: [[/(дефицит|deficit|critical|остат|stock)/i, "critical_deficits"]],
    director: [[/(свод|реш|decision|summary|approve|risk)/i, "today_decision_queue"]],
    foreman: [[/(отч|report|закры|closeout|evidence|акт)/i, "daily_object_report"]],
    contractor: [[/(при[её]м|acceptance|меша|blocker|замеч)/i, "contractor_acceptance_blockers"]],
    buyer: [[/(постав|supplier|вариант|option|shortlist|market)/i, "find_5_10_suppliers"]],
    accountant: [[/(крит|оплат|payment|invoice|счет|сч[её]т)/i, "critical_payments"]],
    office: [[/(напом|remind)/i, "reminder_draft"], [/(застр|stuck|документ|package|deadline)/i, "stuck_today"]],
    documents: [[/(pdf|документ|link|связ)/i, "documents_to_process"]],
    reports: [[/(отч|report|evidence)/i, "document_evidence_gaps"]],
    chat: [[/(чат|chat|сообщ|owner|задач)/i, "chat_context_summary"]],
    market: [[/(market|вариант|заяв|request|source)/i, "show_request_matches"]],
    supplier: [[/(витрин|card|карточ|товар|product|source)/i, "check_cards"]],
    admin: [[/(owner|роль|role|org|права)/i, "org_governance_snapshot"]],
    security: [[/(safe|security|безопас)/i, "security_safe_summary"]],
    runtime: [[/(health|gate|safe|доступ)/i, "runtime_permission_check"]],
    client: [[/(project|проект|документ|progress|прогресс)/i, "client_project_snapshot"]],
  };

  const match = keywordByContext[route.context]
    ?.find(([pattern]) => pattern.test(userText));
  if (!match) return null;
  return route.actions.find((action) => action.id === match[1]) ?? null;
}

function checkedOnlyAnswer(
  route: LiveAiRouteDefinition,
  questionRu: string,
  action: LiveAiAction | null,
  detection?: LiveAiQueryIntentDetection,
): LiveAiAnswer {
  const found: Partial<Record<LiveAiContextId, string[]>> = {
    documents: ["Очередь документов проверена: нужна ручная привязка PDF и связь с оплатой/работой.", "Финальная привязка документа не выполнялась."],
    reports: ["Отчёты проверены как evidence queue: есть gaps по фото/актам или checked-empty reason.", "Финальная публикация отчёта не выполнялась."],
    chat: ["Чат проверен как источник рабочих фактов: owner, task, document и work mentions.", "Задача не закрывалась и owner не создавался."],
    admin: ["Org governance проверен как read-only snapshot: роли и owner gaps без изменения прав.", "Любое изменение прав требует отдельного согласования."],
    security: ["Показана только безопасная security summary без raw details.", "Запрещённые direct approve/payment/stock mutations не обнаружены в safe summary."],
    runtime: ["Доступ к техническим деталям скрыт от normal user.", "Показана только redacted health summary без secrets."],
    client: ["Проверена client-visible сводка проекта: прогресс, документы и следующий шаг.", "Внутренние финансы, склад и security details не раскрыты."],
  };
  return buildLiveAnswerFromParts({
    route,
    action,
    questionRu,
    shortRu: "Проверил доступную сводку раздела и собрал безопасный следующий шаг без изменений данных.",
    queryIntent: detection?.intent,
    explicitUserIntentUsed: detection?.explicitUserIntent,
    foundRu: found[route.context] ?? ["Проверена доступная сводка раздела."],
    sourcesRu: [],
    checkedRu: route.checkedSourcesRu,
    missingDataRu: ["selected entity is not required; role default context used", "для финального действия требуется human review"],
    nextStepRu: "Откройте профильный экран и прикрепите недостающий источник или отправьте пакет на согласование через штатный маршрут.",
    status: action?.status ?? "data_unchanged",
    providerTrace: [route.pipelineKey, `role:${route.role}`, `screen:${route.screenId}`, "liveUiRouteRegistry"],
    sourceTrace: route.checkedSourcesRu.map((item) => `checked:${item}`),
  });
}

function runDeepPipeline(route: LiveAiRouteDefinition, questionRu: string, action: LiveAiAction | null): unknown {
  switch (route.context) {
    case "warehouse": {
      const context = buildLiveWarehouseDefaultContext();
      return action
        ? answerWarehouseAction({ context, actionId: action.pipelineActionId as WarehouseStockIntent })
        : answerWarehouseStockQuestion({ context, questionRu });
    }
    case "director": {
      const context = buildLiveDirectorDefaultContext();
      return action
        ? answerDirectorAction({ context, actionId: action.pipelineActionId as DirectorIntent })
        : answerDirectorCompanyQuestion({ context, questionRu });
    }
    case "foreman": {
      const context = buildLiveForemanDefaultContext();
      return action
        ? answerForemanAction({ context, actionId: action.pipelineActionId as ForemanIntent })
        : answerForemanWorkdayQuestion({ context, questionRu });
    }
    case "contractor":
    case "market":
    case "supplier": {
      const context = buildLiveMarketplaceDefaultContext(route.context);
      return action
        ? answerMarketplaceIntakeAction({ context, actionId: action.pipelineActionId as MarketplaceIntakeIntent })
        : answerMarketplaceIntakeQuestion({ context, questionRu });
    }
    case "buyer": {
      const context = buildLiveBuyerDefaultContext();
      return action
        ? answerBuyerAction({ context, actionId: action.pipelineActionId as BuyerIntent })
        : answerBuyerSourcingQuestion({ context, questionRu });
    }
    case "accountant": {
      const context = buildLiveAccountantDefaultContext();
      return action
        ? answerAccountantAction({ context, actionId: action.pipelineActionId as AccountantIntent })
        : answerAccountantFinanceQuestion({ context, questionRu });
    }
    case "office": {
      const context = buildLiveOfficeDefaultContext();
      return action
        ? answerOfficeAction({ context, actionId: action.pipelineActionId as OfficeDocumentControlIntent })
        : answerOfficeDocumentControlQuestion({ context, questionRu });
    }
    default:
      return null;
  }
}

function foundFromDeepAnswer(record: UnknownRecord): string[] {
  const found = [
    readString(record, ["shortAnswerRu", "shortRu", "titleRu", "answerKind"]),
    ...titlesFromArray(record.events, ["titleRu", "summaryRu", "id"]),
    ...titlesFromArray(record.stuckItems, ["titleRu", "whyStuckRu", "id"]),
    ...titlesFromArray(record.documentsToProcess, ["titleRu", "whyStuckRu", "id"]),
    ...titlesFromArray(record.offers, ["supplierNameRu", "itemNameRu", "id"]),
    ...titlesFromArray(record.visibleOffers, ["titleRu", "ownerNameRu", "id"]),
    ...titlesFromArray(record.risks, ["reasonRu", "id"]),
    ...titlesFromArray(record.riskExplanations, ["reasonRu", "eventId"]),
  ].filter((item): item is string => Boolean(item));

  const totals = asRecord(record.totals);
  const stockSummary = asRecord(record.stockSummary);
  if (Object.keys(totals).length > 0) found.push(`Totals checked: ${JSON.stringify(totals)}`);
  if (Object.keys(stockSummary).length > 0) found.push(`Stock checked: ${JSON.stringify(stockSummary)}`);
  const domainSummary = asRecord(record.domainSummary);
  for (const [domain, value] of Object.entries(domainSummary)) {
    if (typeof value === "string" && value.trim()) found.push(`${domain}: ${value}`);
  }
  return unique(found).slice(0, 6);
}

function buildAnswerFromDeep(
  route: LiveAiRouteDefinition,
  questionRu: string,
  action: LiveAiAction | null,
  deepAnswer: unknown,
  detection?: LiveAiQueryIntentDetection,
): LiveAiAnswer {
  const record = asRecord(deepAnswer);
  const status = statusFromDeepAnswer(record, action?.status ?? "data_unchanged");
  const sources = sourceLabels(record.sources);
  const checked = sources.length > 0 ? [] : route.checkedSourcesRu;
  const missingData = readStringArray(record, ["missingData"]);
  return buildLiveAnswerFromParts({
    route,
    action,
    questionRu,
    shortRu: firstNonEmpty(
      readString(record, ["shortAnswerRu", "shortRu"]),
      readString(record, ["titleRu"]),
    ),
    queryIntent: detection?.intent,
    explicitUserIntentUsed: detection?.explicitUserIntent,
    foundRu: foundFromDeepAnswer(record),
    sourcesRu: sources,
    checkedRu: checked,
    missingDataRu: missingData.length > 0 ? missingData : ["обязательные missing data в проверенной сводке не найдены"],
    nextStepRu: firstNonEmpty(readString(record, ["nextStepRu"]), "Подготовить пакет/черновик и передать по штатному маршруту согласования."),
    status,
    providerTrace: unique([
      route.pipelineKey,
      ...(readTrace(record, "providerTrace").length > 0
        ? readTrace(record, "providerTrace")
        : [`role:${route.role}`, `screen:${route.screenId}`]),
    ]),
    sourceTrace: readTrace(record, "sourceTrace").length > 0
      ? readTrace(record, "sourceTrace")
      : sources,
  });
}

function bullet(lines: string[]): string {
  return lines.length > 0
    ? lines.map((line) => `- ${line}`).join("\n")
    : "- проверенных данных для этого блока пока нет";
}

function buildLiveAnswerFromParts(params: {
  route: LiveAiRouteDefinition;
  action: LiveAiAction | null;
  questionRu: string;
  queryIntent?: LiveAiQueryIntent;
  explicitUserIntentUsed?: boolean;
  shortRu: string;
  foundRu: string[];
  sourcesRu: string[];
  checkedRu: string[];
  missingDataRu: string[];
  nextStepRu: string;
  status: LiveAiSafetyStatus;
  providerTrace: string[];
  sourceTrace: string[];
}): LiveAiAnswer {
  const sourceOrChecked = params.sourcesRu.length > 0 && params.checkedRu.length > 0
    ? `Источники:\n${bullet(params.sourcesRu)}\n\nЧто проверено:\n${bullet(params.checkedRu)}`
    : params.sourcesRu.length > 0
      ? `Источники:\n${bullet(params.sourcesRu)}`
      : `Что проверено:\n${bullet(params.checkedRu)}`;
  const raw = [
    "Ответ",
    "",
    "Коротко:",
    params.shortRu,
    "",
    "Что найдено:",
    bullet(params.foundRu),
    "",
    sourceOrChecked,
    "",
    "Чего не хватает:",
    bullet(params.missingDataRu),
    "",
    "Следующий шаг:",
    params.nextStepRu,
    "",
    liveAiSafetyLine(params.status),
  ].join("\n");
  const answerTextRu = sanitizeLiveAiUserAnswer(raw);
  assertNoLiveAiBannedCopy(answerTextRu);
  const queryIntent = params.queryIntent ?? "role_summary_query";
  return {
    context: params.route.context,
    screenId: params.route.screenId,
    role: params.route.role,
    pipelineKey: params.route.pipelineKey,
    defaultContextKind: params.route.defaultContextKind,
    questionRu: params.questionRu,
    queryIntent,
    explicitUserIntentUsed: params.explicitUserIntentUsed ?? false,
    topicMatchScore: scoreLiveAiTopicMatch(params.questionRu, answerTextRu),
    actionId: params.action?.id ?? null,
    concreteQuestionRu: params.action?.concreteQuestionRu ?? params.questionRu,
    answerTextRu,
    shortRu: sanitizeLiveAiUserAnswer(params.shortRu),
    foundRu: params.foundRu.map(sanitizeLiveAiUserAnswer),
    sourcesRu: params.sourcesRu.map(sanitizeLiveAiUserAnswer),
    checkedRu: params.checkedRu.map(sanitizeLiveAiUserAnswer),
    missingDataRu: params.missingDataRu.map(sanitizeLiveAiUserAnswer),
    nextStepRu: sanitizeLiveAiUserAnswer(params.nextStepRu),
    status: params.status,
    providerTrace: params.providerTrace,
    sourceTrace: params.sourceTrace,
    changedData: false,
    dangerousMutationsFound: 0,
    approvalBypassFound: 0,
    crossRoleLeaksFound: 0,
    genericAnswerUsed: false,
    selectedEntityOverblocked: false,
    bannedCopyFound: findLiveAiBannedCopy(answerTextRu),
  };
}

export function answerLiveAiRoute(params: {
  route: LiveAiRouteDefinition;
  userText: string;
  forceActionId?: string;
  intentSources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  const intentFirstAnswer = answerIntentFirstIfNeeded(params);
  if (intentFirstAnswer) return intentFirstAnswer;
  const detection = params.forceActionId ? undefined : detectLiveAiQueryIntent(params.userText);
  const forcedAction = params.forceActionId
    ? params.route.actions.find((action) => action.id === params.forceActionId || action.pipelineActionId === params.forceActionId) ?? null
    : null;
  const action = forcedAction ?? findAction(params.route, params.userText);
  const questionRu = action?.concreteQuestionRu ?? (params.userText.trim() || params.route.defaultQuestionRu);
  const deepAnswer = runDeepPipeline(params.route, questionRu, action);
  return deepAnswer
    ? buildAnswerFromDeep(params.route, questionRu, action, deepAnswer, detection)
    : checkedOnlyAnswer(params.route, questionRu, action, detection);
}

export function answerLiveAiForContext(params: {
  context: LiveAiContextId;
  userText?: string;
  forceActionId?: string;
  intentSources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  const route = getLiveAiRouteByContext(params.context);
  return answerLiveAiRoute({
    route,
    userText: params.userText ?? route.defaultQuestionRu,
    forceActionId: params.forceActionId,
    intentSources: params.intentSources,
  });
}

export function answerLiveAiFromRouteContext(params: {
  routeContext?: string | null;
  assistantContext?: string | null;
  userText: string;
  intentSources?: LiveAiQueryIntentSources;
}): LiveAiRouteResult {
  const route = resolveLiveAiRoute(params.routeContext) ?? resolveLiveAiRoute(params.assistantContext);
  if (!route) {
    const exactReason = "Для этого раздела AI-контекст ещё не подключён. Проверьте liveAiRouteRegistry.";
    return { handled: false, exactReason };
  }
  return {
    handled: true,
    answer: answerLiveAiRoute({ route, userText: params.userText, intentSources: params.intentSources }),
  };
}

export function getLiveAiActionsForContext(context: LiveAiContextId): readonly LiveAiAction[] {
  return getLiveAiRouteByContext(context).actions;
}

export function getAllLiveAiContextIds(): LiveAiContextId[] {
  return listLiveAiRouteDefinitions().map((route) => route.context);
}
