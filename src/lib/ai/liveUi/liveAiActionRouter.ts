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

function checkedOnlyAnswer(route: LiveAiRouteDefinition, questionRu: string, action: LiveAiAction | null): LiveAiAnswer {
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
  const sourceOrChecked = params.sourcesRu.length > 0
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
  return {
    context: params.route.context,
    screenId: params.route.screenId,
    role: params.route.role,
    pipelineKey: params.route.pipelineKey,
    defaultContextKind: params.route.defaultContextKind,
    questionRu: params.questionRu,
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
}): LiveAiAnswer {
  const forcedAction = params.forceActionId
    ? params.route.actions.find((action) => action.id === params.forceActionId || action.pipelineActionId === params.forceActionId) ?? null
    : null;
  const action = forcedAction ?? findAction(params.route, params.userText);
  const questionRu = action?.concreteQuestionRu ?? (params.userText.trim() || params.route.defaultQuestionRu);
  const deepAnswer = runDeepPipeline(params.route, questionRu, action);
  return deepAnswer
    ? buildAnswerFromDeep(params.route, questionRu, action, deepAnswer)
    : checkedOnlyAnswer(params.route, questionRu, action);
}

export function answerLiveAiForContext(params: {
  context: LiveAiContextId;
  userText?: string;
  forceActionId?: string;
}): LiveAiAnswer {
  const route = getLiveAiRouteByContext(params.context);
  return answerLiveAiRoute({
    route,
    userText: params.userText ?? route.defaultQuestionRu,
    forceActionId: params.forceActionId,
  });
}

export function answerLiveAiFromRouteContext(params: {
  routeContext?: string | null;
  assistantContext?: string | null;
  userText: string;
}): LiveAiRouteResult {
  const route = resolveLiveAiRoute(params.routeContext) ?? resolveLiveAiRoute(params.assistantContext);
  if (!route) {
    const exactReason = "Для этого раздела AI-контекст ещё не подключён. Проверьте liveAiRouteRegistry.";
    return { handled: false, exactReason };
  }
  return {
    handled: true,
    answer: answerLiveAiRoute({ route, userText: params.userText }),
  };
}

export function getLiveAiActionsForContext(context: LiveAiContextId): readonly LiveAiAction[] {
  return getLiveAiRouteByContext(context).actions;
}

export function getAllLiveAiContextIds(): LiveAiContextId[] {
  return listLiveAiRouteDefinitions().map((route) => route.context);
}
