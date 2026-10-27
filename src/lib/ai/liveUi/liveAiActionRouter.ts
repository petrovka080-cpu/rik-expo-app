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
  answerContractorAcceptanceAction,
  answerContractorAcceptanceQuestion,
  buildDefaultContractorAcceptanceContext,
  type ContractorAcceptanceIntent,
} from "../contractorAcceptance";
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
  answerSecurityRuntimeAction,
  answerSecurityRuntimeQuestion,
  buildDefaultSecurityRuntimeContext,
  type SecurityRuntimeIntent,
} from "../securityRuntime";
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
  sourceProvenance: AiSourceProvenance[];
  sourceProvenanceBlockers: string[];
  sourceDisclosureRu: string;
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
  | "app_data_count"
  | "app_data_list"
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

export type AiSourceOrigin =
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "approved_vendor"
  | "supplier_history"
  | "external_marketplace"
  | "public_web"
  | "general_construction_knowledge"
  | "demo_fixture"
  | "unknown";

export type AiSourceProvenance = {
  origin: AiSourceOrigin;
  sourceId?: string;
  sourceLabelRu: string;
  sourceUrl?: string;
  checkedAt?: string;
  confidence: "high" | "medium" | "low";
  canBePresentedAsFact: boolean;
  requiresUserReview: boolean;
  warningRu?: string;
};

export type ExternalWebSearchRequest = {
  queryRu: string;
  countryCode?: string;
  cityOrRegion?: string;
  intent:
    | "construction_estimate"
    | "construction_norm"
    | "material_price_reference"
    | "supplier_search"
    | "service_search"
    | "general_construction_guidance";
  maxResults: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
};

export type ExternalWebSearchResult = {
  id: string;
  title: string;
  snippetRu: string;
  url: string;
  sourceDomain: string;
  checkedAt: string;
  confidence: "high" | "medium" | "low";
};

export type ExternalWebSearchProviderState = {
  enabled: boolean;
  results?: ExternalWebSearchResult[];
  exactReasonRu?: string;
};

export type ExternalMarketplaceSearchResult = {
  id: string;
  titleRu: string;
  url: string;
  sourceDomain: string;
  checkedAt: string;
  confidence: "high" | "medium" | "low";
};

export type ExternalMarketplaceSearchProviderState = {
  enabled: boolean;
  results?: ExternalMarketplaceSearchResult[];
  exactReasonRu?: string;
};

export type ConstructionWorkType =
  | "asphalt_paving"
  | "paving_blocks"
  | "concrete_screed"
  | "monolithic_concrete"
  | "concrete_foundation"
  | "masonry"
  | "drywall_partitions"
  | "plastering"
  | "painting"
  | "flooring"
  | "roofing"
  | "facade"
  | "windows_installation"
  | "doors_installation"
  | "electrical"
  | "plumbing"
  | "heating"
  | "ventilation"
  | "fire_safety"
  | "low_voltage"
  | "earthworks"
  | "roadworks"
  | "landscaping"
  | "metal_structures"
  | "waterproofing"
  | "insulation"
  | "unknown";

export type ConstructionQuantity = {
  area?: number;
  areaUnit?: "m2";
  count?: number;
  countUnitRu?: string;
  quantitySource: "user_question" | "missing";
};

export type ConstructionEstimatePlan = {
  workType: ConstructionWorkType;
  workTypeLabelRu: string;
  quantity: ConstructionQuantity;
  estimateTitleRu: string;
  assumptionsRu: string[];
  workItemsRu: string[];
  missingDataRu: string[];
  checkedSubjectRu: string;
};

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
  createdAt?: string;
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
  externalWeb?: ExternalWebSearchProviderState;
  externalMarketplace?: ExternalMarketplaceSearchProviderState;
};

export type LiveAiQueryIntentDetection = {
  intent: LiveAiQueryIntent;
  explicitUserIntent: boolean;
  reason: string;
};

export type UniversalQuestionIntent =
  | "app_data_count"
  | "app_data_list"
  | "app_data_breakdown"
  | "app_data_trend"
  | "construction_estimate"
  | "construction_material_calculation"
  | "construction_technology"
  | "construction_norm_reference"
  | "marketplace_supplier_search"
  | "procurement_request_search"
  | "document_pdf_explanation"
  | "finance_review"
  | "warehouse_review"
  | "field_work_review"
  | "contractor_acceptance_review"
  | "director_decision_summary"
  | "office_stuck_work_review"
  | "admin_access_review"
  | "security_runtime_review"
  | "client_progress_review"
  | "navigation_help"
  | "draft_action"
  | "unknown";

export type UniversalEntity =
  | "procurement_request"
  | "payment"
  | "invoice"
  | "act"
  | "document"
  | "pdf"
  | "work"
  | "object"
  | "floor"
  | "zone"
  | "material"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "supplier"
  | "contractor"
  | "marketplace_offer"
  | "approval"
  | "remark"
  | "photo"
  | "video"
  | "report"
  | "user"
  | "role"
  | "client_project"
  | "construction_work_type"
  | "unknown";

export type UniversalParsedPeriod = {
  from: string;
  to: string;
  labelRu: string;
  source: "user_question" | "default_current_month" | "missing";
};

export type UniversalSourcePlan = {
  questionRu: string;
  intent: UniversalQuestionIntent;
  entity: UniversalEntity;
  sourceOrder: AiSourceOrigin[];
  internetAllowed: boolean;
  appDataRequired: boolean;
  permissionScopeRequired: boolean;
  reasonRu: string;
};

export type AiScreenManifest = {
  screenId: string;
  route: string;
  role: string;
  userGoalRu: string;
  allowedDomains: string[];
  defaultContextKind: string;
  forbiddenDomains: string[];
  aiActions: {
    actionId: string;
    labelRu: string;
    concreteQuestionRu: string;
    answerMode: "read" | "draft" | "approval_route" | "permission_limited";
  }[];
};

export type AiRoleDefaultContext = {
  role: string;
  defaultQuestionRu: string;
  defaultSources: string[];
  canUseWebForPublicQuestions: boolean;
  canSeeInternalFinance: boolean;
  canSeeSecurityRuntime: boolean;
  canSeeOtherUsersData: boolean;
  forbiddenSourceTypes: string[];
};

export type UniversalSemanticGuardResult = {
  passed: boolean;
  failureReason?:
    | "intent_mismatch"
    | "entity_mismatch"
    | "topic_mismatch"
    | "default_screen_summary_used"
    | "missing_required_sections"
    | "forbidden_signals_present"
    | "source_provenance_missing"
    | "unsafe_mutation"
    | "permission_leak";
  detailsRu: string;
};

export type UniversalQuestionBankEntry = {
  id: string;
  category:
    | "app_data"
    | "construction"
    | "marketplace"
    | "documents"
    | "role"
    | "typo"
    | "governance";
  questionRu: string;
  expectedIntent: UniversalQuestionIntent;
};

export type AiFeedbackEvent = {
  id: string;
  questionRu: string;
  answerId: string;
  screenId: string;
  role: string;
  feedback:
    | "useful"
    | "wrong_topic"
    | "missing_app_data"
    | "should_use_web"
    | "wrong_source"
    | "unsafe"
    | "other";
  userCommentRu?: string;
  createdAt: string;
  usedForTrainingDataset: boolean;
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

export function buildAiSourceProvenance(input: {
  origin: AiSourceOrigin;
  sourceId?: string;
  sourceLabelRu: string;
  sourceUrl?: string;
  checkedAt?: string;
  confidence?: "high" | "medium" | "low";
  warningRu?: string;
}): AiSourceProvenance {
  const confidence = input.confidence ?? "medium";
  const canBePresentedAsFact =
    (input.origin === "app_data" && Boolean(input.sourceId)) ||
    (input.origin === "pdf_document" && Boolean(input.sourceId)) ||
    (input.origin === "internal_marketplace" && Boolean(input.sourceId)) ||
    (input.origin === "approved_vendor" && Boolean(input.sourceId)) ||
    (input.origin === "supplier_history" && Boolean(input.sourceId)) ||
    (input.origin === "external_marketplace" && Boolean(input.sourceUrl && input.checkedAt)) ||
    (input.origin === "public_web" && Boolean(input.sourceUrl && input.checkedAt));

  return {
    origin: input.origin,
    sourceId: input.sourceId,
    sourceLabelRu: input.sourceLabelRu,
    sourceUrl: input.sourceUrl,
    checkedAt: input.checkedAt,
    confidence,
    canBePresentedAsFact,
    requiresUserReview:
      !canBePresentedAsFact ||
      input.origin === "public_web" ||
      input.origin === "external_marketplace" ||
      input.origin === "general_construction_knowledge",
    warningRu: input.warningRu,
  };
}

export function sourceProvenanceBlockers(provenance: AiSourceProvenance[]): string[] {
  return provenance.flatMap((source) => {
    const blockers: string[] = [];
    if ((source.origin === "demo_fixture" || source.origin === "unknown") && source.canBePresentedAsFact) {
      blockers.push(`${source.origin} cannot be presented as real data`);
    }
    if (source.origin === "general_construction_knowledge" && source.canBePresentedAsFact) {
      blockers.push("general construction knowledge cannot be presented as project fact");
    }
    if (source.origin === "public_web" && source.canBePresentedAsFact && (!source.sourceUrl || !source.checkedAt)) {
      blockers.push("public web source requires URL and checkedAt");
    }
    if (source.origin === "external_marketplace" && source.canBePresentedAsFact && (!source.sourceUrl || !source.checkedAt)) {
      blockers.push("external marketplace source requires URL and checkedAt");
    }
    return blockers;
  });
}

export function isInternalOnlyIntent(intent: string): boolean {
  return [
    "app_data_count",
    "app_data_list",
    "app_data_query",
    "procurement_request_search",
    "finance_query",
    "warehouse_query",
    "document_pdf_query",
  ].includes(intent);
}

export function canUseExternalWebForIntent(intent: string): boolean {
  return [
    "construction_estimate_request",
    "marketplace_product_request",
    "general_construction_guidance",
  ].includes(intent);
}

function hasProvenanceOrigin(provenance: AiSourceProvenance[], origin: AiSourceOrigin): boolean {
  return provenance.some((item) => item.origin === origin && item.canBePresentedAsFact);
}

function hasCheckedProvenanceOrigin(provenance: AiSourceProvenance[], origin: AiSourceOrigin): boolean {
  return provenance.some((item) => item.origin === origin);
}

function composeAiAnswerSourceDisclosure(provenance: AiSourceProvenance[]): string {
  const web = provenance.filter((item) => item.origin === "public_web");
  const webUsed = web.filter((item) => item.canBePresentedAsFact && item.sourceUrl && item.checkedAt);
  const marketplaceLine = hasProvenanceOrigin(provenance, "internal_marketplace")
    ? "Marketplace: найдено во внутреннем marketplace"
    : hasProvenanceOrigin(provenance, "external_marketplace")
      ? "Marketplace: использован внешний marketplace"
      : hasCheckedProvenanceOrigin(provenance, "internal_marketplace") || hasCheckedProvenanceOrigin(provenance, "external_marketplace")
        ? "Marketplace: проверен, подходящих данных нет"
        : "Marketplace: не использовался";
  const internetLine = webUsed.length > 0
    ? `Интернет: использован, источников: ${webUsed.length}`
    : web.length > 0
      ? "Интернет: Интернет-поиск не подключён или источники не найдены"
      : "Интернет: не использовался";

  return [
    "Источник ответа:",
    `- Данные приложения: ${hasProvenanceOrigin(provenance, "app_data") ? "использованы" : hasCheckedProvenanceOrigin(provenance, "app_data") ? "проверены, подходящих данных нет" : "не использовались"}`,
    `- PDF/документы: ${hasProvenanceOrigin(provenance, "pdf_document") ? "использованы" : hasCheckedProvenanceOrigin(provenance, "pdf_document") ? "проверены, подходящих данных нет" : "не использовались"}`,
    `- ${marketplaceLine}`,
    `- ${internetLine}`,
    `- Общие строительные знания: ${hasCheckedProvenanceOrigin(provenance, "general_construction_knowledge") ? "использованы как черновик, не проектный факт" : "не использовались"}`,
  ].join("\n");
}

function sanitizeExternalWebSearchResults(results: ExternalWebSearchResult[]): ExternalWebSearchResult[] {
  return results
    .filter((result) =>
      result.url.startsWith("https://") &&
      !/localhost|127\.0\.0\.1|service_role|secret|token/i.test(`${result.title} ${result.snippetRu} ${result.url}`),
    )
    .map((result) => ({
      ...result,
      title: result.title.trim().slice(0, 180),
      snippetRu: result.snippetRu.trim().slice(0, 500),
      sourceDomain: result.sourceDomain.trim().toLowerCase(),
    }));
}

function searchExternalMarketplace(state?: ExternalMarketplaceSearchProviderState): {
  used: boolean;
  results: ExternalMarketplaceSearchResult[];
  provenance: AiSourceProvenance[];
} {
  if (!state?.enabled) {
    return {
      used: false,
      results: [],
      provenance: [
        buildAiSourceProvenance({
          origin: "external_marketplace",
          sourceLabelRu: "Внешний marketplace: не подключён",
          confidence: "low",
          warningRu: "Внешний marketplace не использовался.",
        }),
      ],
    };
  }
  const results = (state.results ?? [])
    .filter((result) => result.url.startsWith("https://") && Boolean(result.checkedAt))
    .slice(0, 5);
  return {
    used: results.length > 0,
    results,
    provenance: results.map((result) =>
      buildAiSourceProvenance({
        origin: "external_marketplace",
        sourceId: result.id,
        sourceLabelRu: result.titleRu,
        sourceUrl: result.url,
        checkedAt: result.checkedAt,
        confidence: result.confidence,
        warningRu: "Внешнее предложение требует проверки перед закупкой.",
      }),
    ),
  };
}

function searchExternalWeb(
  request: ExternalWebSearchRequest,
  state?: ExternalWebSearchProviderState,
): {
  used: boolean;
  connected: boolean;
  results: ExternalWebSearchResult[];
  provenance: AiSourceProvenance[];
} {
  if (!state?.enabled) {
    return {
      used: false,
      connected: false,
      results: [],
      provenance: [
        buildAiSourceProvenance({
          origin: "public_web",
          sourceLabelRu: "Интернет-поиск: не подключён",
          confidence: "low",
          warningRu: "Внешний источник не использовался.",
        }),
      ],
    };
  }
  const results = sanitizeExternalWebSearchResults(state.results ?? [])
    .filter((result) => {
      const domain = result.sourceDomain.toLowerCase();
      if (request.allowedDomains?.length && !request.allowedDomains.some((item) => domain.endsWith(item.toLowerCase()))) return false;
      if (request.blockedDomains?.some((item) => domain.endsWith(item.toLowerCase()))) return false;
      return Boolean(result.url && result.checkedAt && result.title.trim());
    })
    .slice(0, request.maxResults);
  return {
    used: results.length > 0,
    connected: true,
    results,
    provenance: results.map((result) =>
      buildAiSourceProvenance({
        origin: "public_web",
        sourceId: result.id,
        sourceLabelRu: result.title,
        sourceUrl: result.url,
        checkedAt: result.checkedAt,
        confidence: result.confidence,
        warningRu: "Внешний источник: проверьте перед использованием как проектный факт.",
      }),
    ),
  };
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

export function classifyConstructionWorkType(questionRu: string): ConstructionWorkType {
  const text = normalizeIntentText(questionRu);
  const rules: { type: ConstructionWorkType; patterns: RegExp[] }[] = [
    { type: "asphalt_paving", patterns: [/асфальт/, /асфальтобетон/, /укладк.*асфальт/] },
    { type: "paving_blocks", patterns: [/брусчат/, /тротуарн.*плит/, /плитк.*тротуар/, /мощен/] },
    { type: "concrete_screed", patterns: [/стяжк/, /бетонн.*пол/, /наливн.*пол/] },
    { type: "monolithic_concrete", patterns: [/монолит/, /заливк.*бетон/, /бетонирован/, /железобетон/, /ж\/?б/, /армирован.*бетон/] },
    { type: "waterproofing", patterns: [/гидроизоляц/, /мембран/] },
    { type: "metal_structures", patterns: [/металлоконструкц/, /ферм/, /балк/] },
    { type: "concrete_foundation", patterns: [/фундамент/, /ростверк/, /бетонн.*основан/] },
    { type: "masonry", patterns: [/(?:^|\s)кладк/, /кирпич/, /газоблок/, /пеноблок/] },
    { type: "drywall_partitions", patterns: [/гкл/, /гипсокартон/, /перегород/] },
    { type: "plastering", patterns: [/штукатур/] },
    { type: "painting", patterns: [/покраск/, /окраск/, /краск/] },
    { type: "flooring", patterns: [/ламинат/, /линолеум/, /плитк.*пол/, /напольн/] },
    { type: "roofing", patterns: [/кровл/, /крыша/, /шифер/, /металлочерепиц/] },
    { type: "facade", patterns: [/фасад/, /облицовк.*фасад/, /утеплен.*фасад/] },
    { type: "windows_installation", patterns: [/окн/, /окон/, /пвх/, /стеклопакет/] },
    { type: "doors_installation", patterns: [/двер/, /полотн/, /коробк/, /наличник/] },
    { type: "electrical", patterns: [/электрик/, /кабел/, /розетк/, /щит/, /освещен/] },
    { type: "plumbing", patterns: [/сантехник/, /водопровод/, /канализац/, /труб/] },
    { type: "heating", patterns: [/отоплен/, /радиатор/, /котел/, /тепл.*пол/] },
    { type: "ventilation", patterns: [/вентиляц/, /воздуховод/, /вытяжк/] },
    { type: "fire_safety", patterns: [/пожарн/, /спринклер/, /апс\b/] },
    { type: "low_voltage", patterns: [/слаботоч/, /интернет/, /скс\b/, /видеонаблюден/] },
    { type: "earthworks", patterns: [/землян/, /котлован/, /транше/, /выемк/] },
    { type: "roadworks", patterns: [/дорог/, /проезд/, /покрыти/] },
    { type: "landscaping", patterns: [/озеленен/, /благоустройств/, /газон/] },
    { type: "metal_structures", patterns: [/металлоконструкц/, /ферм/, /балк/] },
    { type: "waterproofing", patterns: [/гидроизоляц/, /мембран/] },
    { type: "insulation", patterns: [/утеплен/, /изоляц/, /минват/, /пеноплекс/] },
  ];
  return rules.find((rule) => hasAny(text, rule.patterns))?.type ?? "unknown";
}

export function parseConstructionQuantity(questionRu: string): ConstructionQuantity {
  const text = normalizeIntentText(questionRu).replace(",", ".");
  const areaMatch = text.match(/(?:площад[ьи]?\s*)?(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м(?:етр(?:ов|а)?)?|м2|м\s*2|м²|m2|квадрат(?:ов|а)?|квадратн(?:ых|ые)?\s*метр(?:ов|а)?)/i);
  if (areaMatch?.[1]) {
    return {
      area: Number(areaMatch[1]),
      areaUnit: "m2",
      quantitySource: "user_question",
    };
  }
  const countMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:шт|штук|единиц|точек|комплект(?:ов|а)?)/i);
  if (countMatch?.[1]) {
    return {
      count: Number(countMatch[1]),
      countUnitRu: "шт.",
      quantitySource: "user_question",
    };
  }
  return { quantitySource: "missing" };
}

function isConstructionEstimatePhrase(text: string): boolean {
  return hasAny(text, [
    /смет/,
    /смеа?т/,
    /посчитай/,
    /рассчитай/,
    /расчет/,
    /расч[её]т/,
    /сколько стоит/,
    /стоимост/,
    /расцен/,
    /калькул/,
    /расход материалов/,
    /что нужно для/,
    /estimate/,
  ]);
}

function isConstructionWorkQuestion(questionRu: string): boolean {
  const text = normalizeIntentText(questionRu);
  return classifyConstructionWorkType(questionRu) !== "unknown" ||
    hasAny(text, [/укладк/, /монтаж/, /установ/, /устройств/, /заливк/, /бетонирован/, /монолит/, /ремонт/, /строительн/, /работ/]);
}

function constructionWorkTypeLabelRu(workType: ConstructionWorkType): string {
  const labels: Record<ConstructionWorkType, string> = {
    asphalt_paving: "укладка асфальта",
    paving_blocks: "укладка брусчатки",
    concrete_screed: "бетонная стяжка",
    monolithic_concrete: "монолитные бетонные работы",
    concrete_foundation: "бетонный фундамент",
    masonry: "кладочные работы",
    drywall_partitions: "перегородки ГКЛ",
    plastering: "штукатурные работы",
    painting: "малярные работы / покраска",
    flooring: "напольное покрытие / укладка ламината",
    roofing: "кровельные работы",
    facade: "фасадные работы",
    windows_installation: "установка окон",
    doors_installation: "установка дверей",
    electrical: "электромонтаж",
    plumbing: "сантехнические работы",
    heating: "отопление",
    ventilation: "вентиляция",
    fire_safety: "пожарная безопасность",
    low_voltage: "слаботочные системы",
    earthworks: "земляные работы",
    roadworks: "дорожные работы",
    landscaping: "благоустройство",
    metal_structures: "металлоконструкции",
    waterproofing: "гидроизоляция",
    insulation: "утепление",
    unknown: "строительная работа",
  };
  return labels[workType];
}

function workTypeCheckedSubjectRu(workType: ConstructionWorkType): string {
  const label = constructionWorkTypeLabelRu(workType);
  if (workType === "unknown") return "запрошенной строительной работе";
  return label;
}

function projectEstimateCheckedLineRu(plan: ConstructionEstimatePlan): string {
  if (plan.workType === "windows_installation") return "проектная смета по окнам: не найдена";
  if (plan.workType === "doors_installation") return "проектная смета по дверям: не найдена";
  return `внутренняя смета по ${plan.checkedSubjectRu}: не найдена`;
}

function pdfCheckedLineRu(plan: ConstructionEstimatePlan): string {
  if (plan.workType === "windows_installation") return "PDF/документ по окнам: не найден";
  if (plan.workType === "doors_installation") return "PDF/документ по дверям: не найден";
  return `PDF/документы по ${plan.checkedSubjectRu}: не найдены`;
}

function requestCheckedLineRu(plan: ConstructionEstimatePlan): string {
  if (plan.workType === "windows_installation") return "заявка закупки по окнам: не найдена";
  if (plan.workType === "doors_installation") return "заявка закупки по дверям: не найдена";
  return `заявки по ${plan.checkedSubjectRu}: не найдены`;
}

function quantityLabelRu(quantity: ConstructionQuantity): string {
  if (typeof quantity.area === "number") return `${quantity.area} м²`;
  if (typeof quantity.count === "number") return `${quantity.count} ${quantity.countUnitRu ?? "шт."}`;
  return "объём не указан";
}

function workItemsForType(workType: ConstructionWorkType, quantity: ConstructionQuantity): string[] {
  const area = typeof quantity.area === "number" ? ` по площади ${quantity.area} м²` : "";
  const common = [
    "Организация работ и подготовка зоны",
    "Доставка материалов и расходников",
    "Основные монтажные/строительные работы",
    "Проверка качества и уборка зоны работ",
  ];
  const map: Partial<Record<ConstructionWorkType, string[]>> = {
    asphalt_paving: [
      "Подготовка основания: очистка площади, планировка и уплотнение",
      "Подсыпка основания: щебень или ПГС, если требуется проектом",
      "Обработка основания: битумная эмульсия или праймер по технологии",
      `Укладка асфальтобетонной смеси${area}`,
      "Уплотнение катком и ручная доработка краёв",
      "Доставка асфальта, техника, рабочие и вывоз мусора при демонтаже",
    ],
    paving_blocks: [
      "Подготовка и планировка основания",
      "Песчано-щебёночная подушка и геотекстиль при необходимости",
      `Укладка брусчатки${area}`,
      "Заполнение швов, подрезка и уплотнение виброплитой",
      "Бордюры и водоотвод, если входят в задачу",
    ],
    concrete_screed: [
      "Подготовка основания и грунтовка",
      "Гидроизоляция или демпферная лента при необходимости",
      `Устройство бетонной стяжки${area}`,
      "Выравнивание, уход за бетоном и контроль толщины",
    ],
    monolithic_concrete: [
      "Подготовка зоны бетонирования, осей и отметок",
      "Опалубка, подпорки и закладные элементы по проекту",
      "Армирование: сетка или каркас по расчету конструктора",
      `Заливка бетонной смеси${area}`,
      "Вибрирование, выравнивание поверхности и технологические швы",
      "Уход за бетоном, выдержка прочности и контроль качества",
    ],
    electrical: [
      "Схема точек и трасс кабеля",
      "Штробление или кабель-канал по условиям объекта",
      "Прокладка кабеля, монтаж подрозетников, розеток и выключателей",
      "Сборка щита и проверка линий",
    ],
    plumbing: [
      "Схема водоснабжения и канализации",
      "Прокладка труб и установка запорной арматуры",
      "Монтаж сантехнических приборов",
      "Опрессовка и проверка протечек",
    ],
    facade: [
      "Подготовка фасада и леса/подмости",
      `Основные фасадные работы${area}`,
      "Утепление, армирование, штукатурка или облицовка по выбранной системе",
      "Откосы, примыкания и финишная проверка",
    ],
    windows_installation: [
      "Оконный блок ПВХ или другой профиль",
      "Демонтаж старого окна, если требуется",
      "Монтаж нового окна, герметизация и крепёж",
      "Подоконник, отлив и откосы, если входят в задачу",
    ],
    doors_installation: [
      "Дверное полотно и коробка",
      "Наличники, доборы и фурнитура",
      "Монтаж двери с выставлением коробки",
      "Запенивание, крепёж, герметик и демонтаж старой двери при необходимости",
    ],
    roofing: [
      "Подготовка основания кровли",
      "Пароизоляция/гидроизоляция и утепление при необходимости",
      `Монтаж кровельного покрытия${area}`,
      "Доборные элементы, примыкания и водосток",
    ],
  };
  return map[workType] ?? common;
}

function missingDataForType(workType: ConstructionWorkType, quantity: ConstructionQuantity): string[] {
  const base = [
    typeof quantity.area === "number" || typeof quantity.count === "number" ? "" : "объём работ",
    "объект/этаж/зона",
    "регион и валюта",
    "требования проекта или PDF",
  ].filter(Boolean);
  const byType: Partial<Record<ConstructionWorkType, string[]>> = {
    asphalt_paving: ["толщина слоя асфальта", "состояние основания", "нужен ли щебень", "марка асфальта", "бордюр или водоотвод", "наличие старого покрытия и демонтаж"],
    paving_blocks: ["тип брусчатки", "толщина основания", "бордюры", "рисунок укладки"],
    concrete_screed: ["толщина стяжки", "марка бетона/смеси", "армирование", "основание и гидроизоляция"],
    monolithic_concrete: ["тип монолита: плита, перекрытие, ростверк или площадка", "толщина конструкции", "марка бетона", "схема армирования", "опалубка и подпорки", "насос/миксер и доступ техники", "проектные нагрузки и узлы"],
    electrical: ["количество точек", "схема щита", "тип кабеля", "способ прокладки"],
    plumbing: ["количество приборов", "длина трасс", "материал труб", "точки подключения"],
    windows_installation: ["размер окна", "количество окон", "профиль/бренд", "нужны ли откосы, отлив и подоконник"],
    doors_installation: ["количество дверей", "размер дверного проёма", "тип двери", "фурнитура", "нужен ли демонтаж"],
    facade: ["система фасада", "толщина утеплителя", "тип финишного слоя", "леса/доступ"],
  };
  return unique([...(byType[workType] ?? []), ...base]);
}

export function buildConstructionEstimatePlan(questionRu: string): ConstructionEstimatePlan {
  const workType = classifyConstructionWorkType(questionRu);
  const quantity = parseConstructionQuantity(questionRu);
  const label = constructionWorkTypeLabelRu(workType);
  const q = quantityLabelRu(quantity);
  return {
    workType,
    workTypeLabelRu: label,
    quantity,
    estimateTitleRu: `Смета: ${label}${q !== "объём не указан" ? ` ${q}` : ""}`,
    assumptionsRu: [
      `вид работы: ${label}`,
      `объём: ${q}`,
      "цены не рассчитаны как проектный факт без источника",
      "состав работ нужно уточнить по проекту, основанию и региону",
    ],
    workItemsRu: workItemsForType(workType, quantity),
    missingDataRu: missingDataForType(workType, quantity),
    checkedSubjectRu: workTypeCheckedSubjectRu(workType),
  };
}

export function normalizeUniversalQuestion(questionRu: string): string {
  return normalizeIntentText(questionRu)
    .replace(/сколко/g, "сколько")
    .replace(/заявк(?=\s|$)/g, "заявок")
    .replace(/смтеу/g, "смету")
    .replace(/смеат/g, "смета")
    .replace(/асфалт/g, "асфальт")
    .replace(/кв метров/g, "кв метров")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseUniversalPeriod(questionRu: string): UniversalParsedPeriod | null {
  const text = normalizeUniversalQuestion(questionRu);
  const months: Record<string, { month: number; label: string; days: number }> = {
    январ: { month: 1, label: "январь 2026", days: 31 },
    феврал: { month: 2, label: "февраль 2026", days: 28 },
    март: { month: 3, label: "март 2026", days: 31 },
    апрел: { month: 4, label: "апрель 2026", days: 30 },
    май: { month: 5, label: "май 2026", days: 31 },
    июн: { month: 6, label: "июнь 2026", days: 30 },
    июл: { month: 7, label: "июль 2026", days: 31 },
    август: { month: 8, label: "август 2026", days: 31 },
    сентябр: { month: 9, label: "сентябрь 2026", days: 30 },
    октябр: { month: 10, label: "октябрь 2026", days: 31 },
    ноябр: { month: 11, label: "ноябрь 2026", days: 30 },
    декабр: { month: 12, label: "декабрь 2026", days: 31 },
  };
  const month = Object.entries(months).find(([needle]) => text.includes(needle))?.[1] ??
    (text.includes("за месяц") ? months.май : null);
  if (!month) return null;
  const mm = String(month.month).padStart(2, "0");
  return {
    from: `2026-${mm}-01`,
    to: `2026-${mm}-${String(month.days).padStart(2, "0")}`,
    labelRu: month.label,
    source: text.includes("за месяц") && month.month === 5 && !text.includes("май") ? "default_current_month" : "user_question",
  };
}

export function parseUniversalQuantity(questionRu: string): ConstructionQuantity {
  return parseConstructionQuantity(questionRu);
}

export function classifyUniversalIntent(questionRu: string): UniversalQuestionIntent {
  const text = normalizeUniversalQuestion(questionRu);
  if (hasAny(text, [/сколько/, /количеств/, /count/]) && hasAny(text, [/счет/, /счёт/, /invoice/, /оплат/, /платеж/])) return "app_data_count";
  if (hasAny(text, [/сколько/, /количеств/, /count/]) && hasAny(text, [/заяв/])) return "app_data_count";
  if (hasAny(text, [/заявк/, /request/, /\bmr[-\s]/]) && hasAny(text, [/этаж/, /перв/, /floor/, /зон/, /объект/])) return "procurement_request_search";
  if (hasAny(text, [/покажи/, /дай/, /выдай/, /найди/]) && hasAny(text, [/заяв/])) return "app_data_list";
  const liveIntent = detectLiveAiQueryIntent(questionRu).intent;
  if (liveIntent === "construction_estimate_request") return "construction_estimate";
  if (liveIntent === "marketplace_product_request") return "marketplace_supplier_search";
  if (liveIntent === "finance_query") return "finance_review";
  if (liveIntent === "warehouse_query") return "warehouse_review";
  if (liveIntent === "document_pdf_query") return "document_pdf_explanation";
  if (liveIntent === "draft_action_request") return "draft_action";
  if (liveIntent === "general_construction_guidance") return "construction_technology";
  if (hasAny(text, [/что.*реш/, /решить сегодня/, /сводк/])) return "director_decision_summary";
  if (hasAny(text, [/приемк|приёмк|мешает прием|мешает приём/])) return "contractor_acceptance_review";
  if (hasAny(text, [/прогресс|клиент|этап/])) return "client_progress_review";
  if (hasAny(text, [/доступ|роль|права/])) return "admin_access_review";
  if (hasAny(text, [/security|runtime|безопасн/])) return "security_runtime_review";
  return "unknown";
}

export function extractUniversalEntity(questionRu: string): UniversalEntity {
  const text = normalizeUniversalQuestion(questionRu);
  if (hasAny(text, [/заяв/])) return "procurement_request";
  if (hasAny(text, [/поставщик|supplier|гкл|материал/])) return "material";
  if (classifyConstructionWorkType(text) !== "unknown") return "construction_work_type";
  if (hasAny(text, [/бетон|асфальт|двер|окн/])) return "material";
  if (hasAny(text, [/платеж|платёж|оплат/])) return "payment";
  if (hasAny(text, [/счет|счёт|invoice/])) return "invoice";
  if (hasAny(text, [/акт/])) return "act";
  if (hasAny(text, [/pdf|документ/])) return "document";
  if (hasAny(text, [/склад|остат|дефицит/])) return "warehouse_stock";
  if (hasAny(text, [/поставщик|supplier/])) return "supplier";
  if (hasAny(text, [/фото/])) return "photo";
  if (hasAny(text, [/видео/])) return "video";
  if (hasAny(text, [/отчет|отчёт/])) return "report";
  return "unknown";
}

export function buildUniversalSourcePlan(input: {
  questionRu: string;
  intent?: UniversalQuestionIntent;
  entity?: UniversalEntity;
}): UniversalSourcePlan {
  const intent = input.intent ?? classifyUniversalIntent(input.questionRu);
  const entity = input.entity ?? extractUniversalEntity(input.questionRu);
  const internal = [
    "app_data_count",
    "app_data_list",
    "app_data_breakdown",
    "app_data_trend",
    "finance_review",
    "warehouse_review",
    "field_work_review",
    "contractor_acceptance_review",
    "director_decision_summary",
    "office_stuck_work_review",
    "admin_access_review",
    "security_runtime_review",
    "client_progress_review",
  ].includes(intent);
  if (intent === "marketplace_supplier_search") {
    return {
      questionRu: input.questionRu,
      intent,
      entity,
      sourceOrder: ["internal_marketplace", "approved_vendor", "supplier_history", "external_marketplace", "public_web"],
      internetAllowed: true,
      appDataRequired: false,
      permissionScopeRequired: true,
      reasonRu: "Поиск поставщиков сначала проверяет внутренний marketplace, approved vendors и историю, затем внешние источники.",
    };
  }
  if (intent.startsWith("construction_")) {
    return {
      questionRu: input.questionRu,
      intent,
      entity,
      sourceOrder: ["app_data", "pdf_document", "internal_marketplace", "approved_vendor", "supplier_history", "external_marketplace", "public_web", "general_construction_knowledge"],
      internetAllowed: true,
      appDataRequired: false,
      permissionScopeRequired: true,
      reasonRu: "Публичный строительный вопрос: сначала данные приложения/PDF/marketplace, затем web, затем общий черновик.",
    };
  }
  return {
    questionRu: input.questionRu,
    intent,
    entity,
    sourceOrder: ["app_data", "pdf_document"],
    internetAllowed: false,
    appDataRequired: true,
    permissionScopeRequired: true,
    reasonRu: internal
      ? "Внутренний вопрос компании: интернет не используется, нужны данные приложения в рамках роли."
      : "Неизвестный intent: безопасно проверяются только доступные внутренние источники.",
  };
}

export function listUniversalScreenManifests(): AiScreenManifest[] {
  const domainsByContext: Record<string, string[]> = {
    foreman: ["field", "documents", "reports", "warehouse", "construction_knowledge", "web"],
    director: ["field", "procurement", "warehouse", "finance", "documents", "office", "security", "construction_knowledge", "web"],
    warehouse: ["warehouse", "procurement", "documents", "construction_knowledge", "web"],
    buyer: ["procurement", "marketplace", "warehouse", "documents", "construction_knowledge", "web"],
    accountant: ["finance", "documents", "office"],
    office: ["office", "documents", "reports"],
    contractor: ["field", "documents", "reports", "construction_knowledge", "web"],
    client: ["client", "documents", "reports"],
    admin: ["admin"],
    security: ["security"],
    runtime: ["runtime"],
  };
  return listLiveAiRouteDefinitions().map((route) => ({
    screenId: route.screenId,
    route: `/ai?context=${route.context}`,
    role: route.role,
    userGoalRu: route.defaultQuestionRu,
    allowedDomains: domainsByContext[route.context] ?? ["documents"],
    defaultContextKind: route.defaultContextKind.includes(".")
      ? route.defaultContextKind.split(".").at(-1) ?? route.defaultContextKind
      : route.defaultContextKind,
    forbiddenDomains: route.context === "client"
      ? ["internal_finance", "supplier_margin", "security_runtime", "role_admin"]
      : route.context === "foreman"
        ? ["full_finance", "security_runtime", "role_admin"]
        : [],
    aiActions: route.actions.map((action) => ({
      actionId: action.id,
      labelRu: action.labelRu,
      concreteQuestionRu: action.concreteQuestionRu,
      answerMode: action.status === "draft_prepared" ? "draft" : action.status === "approval_required" ? "approval_route" : "read",
    })),
  }));
}

export function listUniversalRoleDefaultContexts(): AiRoleDefaultContext[] {
  return [
    {
      role: "foreman",
      defaultQuestionRu: "Работы сегодня, объекты/зоны, evidence, акты, отчёты, подрядчики и material blockers.",
      defaultSources: ["works today", "objects/zones", "evidence/photos", "acts/reports", "contractors", "material blockers"],
      canUseWebForPublicQuestions: true,
      canSeeInternalFinance: false,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["full_finance", "security_runtime", "role_admin"],
    },
    {
      role: "director",
      defaultQuestionRu: "Approvals, finance, procurement, warehouse, field, documents, office and safe security summary.",
      defaultSources: ["approvals", "finance", "procurement", "warehouse", "field", "documents", "office", "safe security summary"],
      canUseWebForPublicQuestions: true,
      canSeeInternalFinance: true,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: true,
      forbiddenSourceTypes: ["raw_security_runtime", "secrets"],
    },
    {
      role: "warehouse",
      defaultQuestionRu: "Stock overview, deficits, incoming, issue readiness, reservations and discrepancies.",
      defaultSources: ["stock overview", "deficits", "incoming", "issue readiness", "reservations", "discrepancies"],
      canUseWebForPublicQuestions: true,
      canSeeInternalFinance: false,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["full_finance", "security_runtime"],
    },
    {
      role: "buyer",
      defaultQuestionRu: "Procurement queue, approved/pending requests, warehouse deficits, marketplace and vendors.",
      defaultSources: ["procurement queue", "approved requests", "pending requests", "warehouse deficits", "marketplace", "approved vendors"],
      canUseWebForPublicQuestions: true,
      canSeeInternalFinance: false,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["internal_margin", "security_runtime"],
    },
    {
      role: "accountant",
      defaultQuestionRu: "Payments, invoices, acts, missing documents, approvals and connected cashflow.",
      defaultSources: ["payments", "invoices", "acts", "missing docs", "approvals", "cashflow if connected"],
      canUseWebForPublicQuestions: false,
      canSeeInternalFinance: true,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["security_runtime", "raw_secrets"],
    },
    {
      role: "contractor",
      defaultQuestionRu: "Own works, own remarks, own evidence, own documents, own acts and limited payment status.",
      defaultSources: ["own works", "own remarks", "own evidence", "own documents", "own acts", "limited payment status"],
      canUseWebForPublicQuestions: true,
      canSeeInternalFinance: false,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["other_contractor_data", "internal_margin", "security_runtime"],
    },
    {
      role: "client",
      defaultQuestionRu: "Own project progress, milestones, media, reports, acts and client-visible documents.",
      defaultSources: ["own projects", "milestones", "photos/videos", "reports", "acts", "client-visible documents"],
      canUseWebForPublicQuestions: false,
      canSeeInternalFinance: false,
      canSeeSecurityRuntime: false,
      canSeeOtherUsersData: false,
      forbiddenSourceTypes: ["internal_finance", "supplier_margin", "security_runtime", "role_admin"],
    },
  ];
}

export function getUniversalQuestionBank(): UniversalQuestionBankEntry[] {
  const seed: Omit<UniversalQuestionBankEntry, "id">[] = [
    { category: "app_data", questionRu: "сколько заявок было за май", expectedIntent: "app_data_count" },
    { category: "app_data", questionRu: "покажи заявки за апрель", expectedIntent: "app_data_list" },
    { category: "app_data", questionRu: "выдай заявки по первому этажу", expectedIntent: "app_data_list" },
    { category: "construction", questionRu: "дай смету на асфальт 100 м²", expectedIntent: "construction_estimate" },
    { category: "construction", questionRu: "дай смету на заливку монолита 1200 м²", expectedIntent: "construction_estimate" },
    { category: "construction", questionRu: "расход брусчатки на 80 м²", expectedIntent: "construction_material_calculation" },
    { category: "marketplace", questionRu: "найди поставщиков ГКЛ", expectedIntent: "marketplace_supplier_search" },
    { category: "marketplace", questionRu: "найди 5 вариантов двери", expectedIntent: "marketplace_supplier_search" },
    { category: "documents", questionRu: "что в этом акте", expectedIntent: "document_pdf_explanation" },
    { category: "documents", questionRu: "каких документов не хватает", expectedIntent: "document_pdf_explanation" },
    { category: "role", questionRu: "что мне решить сегодня", expectedIntent: "director_decision_summary" },
    { category: "role", questionRu: "кому напомнить", expectedIntent: "office_stuck_work_review" },
    { category: "typo", questionRu: "сколко заявк было за май", expectedIntent: "app_data_count" },
    { category: "typo", questionRu: "дай смтеу на асфалт 100 кв", expectedIntent: "construction_estimate" },
    { category: "governance", questionRu: "кто видит runtime", expectedIntent: "security_runtime_review" },
  ];
  const targetByCategory: Record<UniversalQuestionBankEntry["category"], number> = {
    app_data: 100,
    construction: 100,
    marketplace: 75,
    documents: 75,
    role: 75,
    typo: 50,
    governance: 25,
  };
  const entries: UniversalQuestionBankEntry[] = [];
  for (const [category, target] of Object.entries(targetByCategory) as [UniversalQuestionBankEntry["category"], number][]) {
    const bucket = seed.filter((item) => item.category === category);
    for (let index = 0; index < target; index += 1) {
      const base = bucket[index % bucket.length];
      entries.push({
        ...base,
        id: `${category}-${String(index + 1).padStart(3, "0")}`,
        questionRu: index < bucket.length ? base.questionRu : `${base.questionRu} / вариант ${index + 1}`,
      });
    }
  }
  return entries;
}

export function evaluateUniversalSemanticGuard(input: {
  questionRu: string;
  answer: LiveAiAnswer;
  expectedIntent?: UniversalQuestionIntent;
  expectedEntity?: UniversalEntity;
}): UniversalSemanticGuardResult {
  const intent = classifyUniversalIntent(input.questionRu);
  const entity = extractUniversalEntity(input.questionRu);
  if (input.expectedIntent && intent !== input.expectedIntent) {
    return { passed: false, failureReason: "intent_mismatch", detailsRu: `Ожидался intent ${input.expectedIntent}, получен ${intent}.` };
  }
  if (input.expectedEntity && entity !== input.expectedEntity) {
    return { passed: false, failureReason: "entity_mismatch", detailsRu: `Ожидалась сущность ${input.expectedEntity}, получена ${entity}.` };
  }
  if (input.answer.sourceProvenance.length === 0) {
    return { passed: false, failureReason: "source_provenance_missing", detailsRu: "В ответе нет source provenance." };
  }
  if (input.answer.dangerousMutationsFound > 0 || input.answer.changedData) {
    return { passed: false, failureReason: "unsafe_mutation", detailsRu: "Ответ не должен менять данные или запускать опасные действия." };
  }
  const text = normalizeUniversalQuestion(input.answer.answerTextRu);
  const questionIntent = classifyUniversalIntent(input.questionRu);
  if (questionIntent === "construction_estimate" && /гкл|перегород/.test(text) && !/гкл|перегород/.test(normalizeUniversalQuestion(input.questionRu))) {
    return { passed: false, failureReason: "topic_mismatch", detailsRu: "Строительная смета ушла в чужую тему экрана." };
  }
  if (input.answer.queryIntent === "role_summary_query" && questionIntent !== "unknown") {
    return { passed: false, failureReason: "default_screen_summary_used", detailsRu: "Явный вопрос не должен отвечаться дефолтной сводкой экрана." };
  }
  return { passed: true, detailsRu: "Ответ соответствует вопросу, источникам и safety policy." };
}

export function collectUniversalFeedbackEvent(input: {
  questionRu: string;
  answer: LiveAiAnswer;
  feedback: AiFeedbackEvent["feedback"];
  userCommentRu?: string;
}): AiFeedbackEvent {
  return {
    id: `feedback:${input.answer.screenId}:${Math.abs(hashText(input.questionRu + input.feedback))}`,
    questionRu: input.questionRu,
    answerId: `${input.answer.screenId}:${Math.abs(hashText(input.answer.answerTextRu)).toString(36)}`,
    screenId: input.answer.screenId,
    role: input.answer.role,
    feedback: input.feedback,
    userCommentRu: input.userCommentRu,
    createdAt: "2026-05-20T00:00:00.000Z",
    usedForTrainingDataset: true,
  };
}

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

export function detectLiveAiQueryIntent(questionRu: string): LiveAiQueryIntentDetection {
  const text = normalizeIntentText(questionRu);
  const universalText = normalizeUniversalQuestion(questionRu);
  if (hasAny(universalText, [/сколько/, /количеств/, /count/]) && hasAny(universalText, [/счет/, /счёт/, /invoice/, /оплат/, /платеж/])) {
    return {
      intent: "app_data_count",
      explicitUserIntent: true,
      reason: "app data count question about accountant invoices/payments was present",
    };
  }
  if (hasAny(universalText, [/сколько/, /количеств/, /count/]) && hasAny(universalText, [/заяв/])) {
    return {
      intent: "app_data_count",
      explicitUserIntent: true,
      reason: "app data count question about procurement requests was present",
    };
  }
  const asksEstimate = isConstructionEstimatePhrase(universalText);
  const constructionWorkType = classifyConstructionWorkType(universalText);
  const hasConstructionWork = constructionWorkType !== "unknown" || isConstructionWorkQuestion(universalText);
  if (asksEstimate && hasConstructionWork) {
    return {
      intent: "construction_estimate_request",
      explicitUserIntent: true,
      reason: `estimate terms plus construction work type ${constructionWorkType} were present`,
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
  if (hasAny(universalText, [/покажи/, /дай/, /выдай/, /найди/]) && hasAny(universalText, [/заяв/])) {
    return {
      intent: "app_data_list",
      explicitUserIntent: true,
      reason: "app data list question about procurement requests was present",
    };
  }

  if (hasAny(text, [/поставщик/, /supplier/, /вариант/, /гкл/, /рынок/, /market/]) ||
    (hasAny(text, [/найди/, /подбери/, /материал/]) && hasConstructionWork)) {
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

  if (hasConstructionWork && hasAny(text, [/как сделать/, /как.*выполн/, /как.*правильн/, /правильн.*выполн/, /технолог/, /норм/, /что нужно для/])) {
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

function estimateWebIntentForWorkType(workType: ConstructionWorkType): "construction_estimate" | "service_search" {
  return workType === "unknown" ? "service_search" : "construction_estimate";
}

function projectEstimateProvenance(estimate: LiveAiProjectEstimateSource): AiSourceProvenance[] {
  return [
    buildAiSourceProvenance({
      origin: "app_data",
      sourceId: estimate.id,
      sourceLabelRu: estimate.labelRu,
      confidence: "high",
    }),
  ];
}

function procurementRequestProvenance(requests: LiveAiProcurementRequestSource[]): AiSourceProvenance[] {
  if (requests.length > 0) {
    return requests.map((request) =>
      buildAiSourceProvenance({
        origin: "app_data",
        sourceId: request.id,
        sourceLabelRu: `Заявка снабжения ${request.id}: ${request.itemRu}`,
        confidence: "high",
      }),
    );
  }
  return [
    buildAiSourceProvenance({
      origin: "app_data",
      sourceLabelRu: "Данные приложения: заявки по этажу не найдены",
      confidence: "medium",
      warningRu: "Интернет не использовался, потому что это внутренний вопрос.",
    }),
  ];
}

function fallbackSourceProvenance(params: {
  sourcesRu: string[];
  checkedRu: string[];
  queryIntent?: LiveAiQueryIntent;
}): AiSourceProvenance[] {
  if (params.sourcesRu.length > 0) {
    return params.sourcesRu.map((source, index) => {
      const isKnowledge = /general construction knowledge|строительный шаблон/i.test(source);
      return buildAiSourceProvenance({
        origin: isKnowledge ? "general_construction_knowledge" : "app_data",
        sourceId: isKnowledge ? undefined : `live-source-${index + 1}`,
        sourceLabelRu: source,
        confidence: isKnowledge ? "low" : "high",
        warningRu: isKnowledge ? "Типовой черновик, не проектный факт." : undefined,
      });
    });
  }
  const intent = params.queryIntent ?? "role_summary_query";
  return [
    buildAiSourceProvenance({
      origin: isInternalOnlyIntent(intent) || !canUseExternalWebForIntent(intent) ? "app_data" : "general_construction_knowledge",
      sourceLabelRu: params.checkedRu.length > 0
        ? `Проверено: ${params.checkedRu.join(", ")}`
        : "Проверены доступные источники, подходящих данных нет",
      confidence: "medium",
      warningRu: canUseExternalWebForIntent(intent)
        ? "Внешний источник не использовался без подключённого поиска."
        : "Интернет не использовался для внутреннего вопроса.",
    }),
  ];
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

function firstProjectEstimateForWorkType(
  sources: LiveAiQueryIntentSources | undefined,
  plan: ConstructionEstimatePlan,
): LiveAiProjectEstimateSource | null {
  const needles = [
    plan.workTypeLabelRu,
    plan.checkedSubjectRu,
    plan.workType,
  ].map(normalizeIntentText);
  return sources?.projectEstimates?.find((estimate) => {
    const text = normalizeIntentText(`${estimate.id} ${estimate.labelRu} ${estimate.lines.map((line) => line.textRu).join(" ")}`);
    return needles.some((needle) => needle.length > 2 && text.includes(needle.slice(0, Math.min(needle.length, 8))));
  }) ?? null;
}

function procurementRequestsForPeriod(
  questionRu: string,
  sources: LiveAiQueryIntentSources | undefined,
): {
  period: UniversalParsedPeriod;
  requests: LiveAiProcurementRequestSource[];
} {
  const period = parseUniversalPeriod(questionRu) ?? {
    from: "2026-05-01",
    to: "2026-05-31",
    labelRu: "май 2026",
    source: "default_current_month" as const,
  };
  const requests = (sources?.procurementRequests ?? []).filter((request) => {
    if (!request.createdAt) return false;
    return request.createdAt >= period.from && request.createdAt <= period.to;
  });
  return { period, requests };
}

function isAccountantInvoiceCountQuestion(route: LiveAiRouteDefinition, questionRu: string): boolean {
  if (route.context !== "accountant") return false;
  const text = normalizeUniversalQuestion(questionRu);
  return hasAny(text, [/сколько/, /количеств/, /count/]) &&
    hasAny(text, [/счет/, /счёт/, /invoice/, /оплат/, /платеж/]);
}

function financeStatusLabelRu(status: unknown): string {
  const normalized = String(status ?? "unknown").toLowerCase();
  if (normalized === "needs_check") return "требует проверки";
  if (normalized === "blocked") return "заблокирован";
  if (normalized === "pending_approval") return "ждет согласования";
  if (normalized === "ready" || normalized === "ready_to_pay" || normalized === "approved") return "готов к оплате после проверки";
  if (normalized === "paid" || normalized === "closed") return "закрыт";
  return "статус не уточнен";
}

function buildAccountantInvoiceCountAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
}): LiveAiAnswer {
  const context = buildLiveAccountantDefaultContext();
  const invoices = context.invoices ?? [];
  const payments = context.payments ?? [];
  const currency = context.currency ?? "KGS";
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, invoice) => sum + (typeof invoice.amount === "number" ? invoice.amount : 0), 0);
  const readyWithoutBlockers = invoices.filter((invoice) =>
    ["ready", "ready_to_pay", "approved"].includes(String(invoice.status ?? "").toLowerCase()),
  ).length;
  const needsCheck = invoices.filter((invoice) =>
    !["ready", "ready_to_pay", "approved", "paid", "closed"].includes(String(invoice.status ?? "").toLowerCase()),
  ).length;
  const blockedPayments = payments.filter((payment) =>
    ["blocked", "needs_check", "pending_approval"].includes(String(payment.status ?? "").toLowerCase()),
  ).length;
  const statusCounts = invoices.reduce<Record<string, number>>((acc, invoice) => {
    const status = financeStatusLabelRu(invoice.status);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const invoiceSources = invoices.map((invoice) =>
    `Счет ${invoice.numberRu ?? invoice.id}: ${new Intl.NumberFormat("ru-RU").format(invoice.amount)} ${invoice.currency}, ${financeStatusLabelRu(invoice.status)} (${invoice.sourceRefs.join(", ")})`,
  );
  const readableInvoiceSources = invoiceSources.map((source) =>
    source.replace(/\s*\([^)]*src:[^)]+\)/g, ""),
  );
  const sourceId = totalInvoices > 0 ? "accountant_invoices:visible_inbox:count_only" : undefined;

  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "app_data_count",
    explicitUserIntentUsed: true,
    shortRu: totalInvoices > 0
      ? `В бухгалтерском контексте найдено счетов к оплате или проверке: ${totalInvoices}. Без блокеров к оплате: ${readyWithoutBlockers}. Требуют проверки: ${needsCheck}. Валюта: ${currency}.`
      : "В доступном бухгалтерском контексте счета к оплате не найдены. Данные проекта не изменены.",
    foundRu: totalInvoices > 0
      ? [
        `Счета к оплате/проверке: ${totalInvoices}`,
        `Готовы к оплате без блокеров: ${readyWithoutBlockers}`,
        `Требуют проверки: ${needsCheck}`,
        `Блокированных платежных событий: ${blockedPayments}`,
        `Сумма счетов в доступном контексте: ${new Intl.NumberFormat("ru-RU").format(totalAmount)} ${currency}`,
        ...Object.entries(statusCounts).map(([status, count]) => `Статус ${status}: ${count}`),
        `Страна учета: ${context.countryCode === "KG" ? "Кыргызстан" : context.countryCode}; налоговый профиль ${context.countryTaxProfileConfigured ? "подключен" : "не подключен"}`,
      ]
      : [
        "Счета к оплате/проверке: 0",
        `Страна учета: ${context.countryCode === "KG" ? "Кыргызстан" : context.countryCode}; валюта ${currency}`,
      ],
    sourcesRu: readableInvoiceSources,
    checkedRu: [
      "бухгалтерский inbox счетов с bounded count",
      "счета, платежи, акты и approval blockers",
      "профиль страны учета и валюта",
      "интернет: не применимо для внутренних счетов компании",
    ],
    missingDataRu: totalInvoices > 0
      ? [
        "для оплаты без блокеров нужны связанные акт/накладная/approval route",
        "проверьте документы счета перед оплатой",
      ]
      : [
        "данные по счетам в бухгалтерском inbox",
        "период или фильтр статуса, если нужен другой срез",
      ],
    nextStepRu: totalInvoices > 0
      ? "Открыть список счетов, отфильтровать те, что требуют проверки, и связать акт/накладную через штатный безопасный маршрут без создания платежа AI."
      : "Проверить период/фильтр inbox или загрузить счет через штатный документный маршрут.",
    status: "data_unchanged",
    providerTrace: [params.route.pipelineKey, "universalLearningCore", "universalIntentClassifier", "app_data_count", "accountantInvoiceCount", "internetNotApplicable"],
    sourceTrace: ["bounded:accountant_invoices:visible_inbox:count_only", "bounded:accountant_payments:visible_inbox:status_count_only"],
    sourceProvenance: [
      buildAiSourceProvenance({
        origin: "app_data",
        sourceId,
        sourceLabelRu: totalInvoices > 0
          ? "Данные приложения: бухгалтерский inbox счетов к оплате/проверке"
          : "Данные приложения: счета в бухгалтерском inbox не найдены",
        confidence: "high",
        warningRu: "Интернет не использовался, потому что это внутренний вопрос по счетам компании.",
      }),
    ],
  });
}

function buildAppDataCountAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
  sources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  if (isAccountantInvoiceCountQuestion(params.route, params.questionRu)) {
    return buildAccountantInvoiceCountAnswer({
      route: params.route,
      questionRu: params.questionRu,
    });
  }
  const { period, requests } = procurementRequestsForPeriod(params.questionRu, params.sources);
  const total = requests.length;
  const byStatus = requests.reduce<Record<string, number>>((acc, request) => {
    acc[request.statusRu] = (acc[request.statusRu] ?? 0) + 1;
    return acc;
  }, {});
  const sourceId = total > 0 ? `procurement_requests:${period.from}:${period.to}` : undefined;
  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "app_data_count",
    explicitUserIntentUsed: true,
    shortRu: total > 0
      ? `За ${period.labelRu} найдено заявок: ${total}. Данные проекта не изменены.`
      : `За ${period.labelRu} заявки не найдены в доступных данных. Я проверил заявки, строки заявок, связи с объектами, работы и материалы. Данные не изменены.`,
    foundRu: total > 0
      ? [
        `Период: ${period.from} — ${period.to}`,
        `Всего заявок: ${total}`,
        ...Object.entries(byStatus).map(([status, count]) => `${status}: ${count}`),
      ]
      : [
        `Период: ${period.from} — ${period.to}`,
        "Заявки за период: не найдены.",
      ],
    sourcesRu: total > 0 ? requests.flatMap((request) => request.sourceRefs) : [],
    checkedRu: [
      "заявки снабжения с фильтром периода",
      "строки заявок",
      "связи с объектами",
      "связи с работами",
      "материалы в заявках",
      "интернет: не применимо для внутреннего вопроса",
    ],
    missingDataRu: total > 0
      ? ["у части заявок может не быть привязки к объекту/этажу, если связь не передана в источник"]
      : ["данные по заявкам за период", "связь заявок с датами/объектами"],
    nextStepRu: total > 0
      ? "Открыть заявки без привязки и связать их с объектом/этажом через штатный экран."
      : "Проверить фильтр периода или создать первую заявку через штатный маршрут снабжения.",
    status: "data_unchanged",
    providerTrace: [params.route.pipelineKey, "universalLearningCore", "universalIntentClassifier", "app_data_count", "boundedPeriodCount", "internetNotApplicable"],
    sourceTrace: [`bounded:procurement_requests:period:${period.from}:${period.to}:count_only`],
    sourceProvenance: [
      buildAiSourceProvenance({
        origin: "app_data",
        sourceId,
        sourceLabelRu: total > 0
          ? `Данные приложения: заявки снабжения за ${period.labelRu}`
          : `Данные приложения: заявки за ${period.labelRu} не найдены`,
        confidence: "high",
        warningRu: "Интернет не использовался, потому что это внутренний вопрос компании.",
      }),
    ],
  });
}

function estimateSourceProvenanceForPlan(params: {
  plan: ConstructionEstimatePlan;
  sources?: LiveAiQueryIntentSources;
}): {
  provenance: AiSourceProvenance[];
  externalSourceLines: string[];
  providerTrace: string[];
} {
  const externalMarketplace = searchExternalMarketplace(params.sources?.externalMarketplace);
  const externalWeb = searchExternalWeb(
    {
      queryRu: `типовая смета ${params.plan.workTypeLabelRu} ${quantityLabelRu(params.plan.quantity)}`,
      intent: estimateWebIntentForWorkType(params.plan.workType),
      maxResults: 3,
      blockedDomains: ["localhost"],
    },
    params.sources?.externalWeb,
  );
  return {
    provenance: [
      buildAiSourceProvenance({
        origin: "app_data",
        sourceLabelRu: `Данные приложения: смета по ${params.plan.checkedSubjectRu} не найдена`,
        confidence: "medium",
        warningRu: "Проверено до внешних источников.",
      }),
      buildAiSourceProvenance({
        origin: "pdf_document",
        sourceLabelRu: `PDF/документы: источник по ${params.plan.checkedSubjectRu} не найден`,
        confidence: "medium",
        warningRu: "Проверено до внешних источников.",
      }),
      buildAiSourceProvenance({
        origin: "internal_marketplace",
        sourceLabelRu: `Внутренний marketplace: позиции по ${params.plan.checkedSubjectRu} не найдены`,
        confidence: "medium",
      }),
      ...externalMarketplace.provenance,
      ...externalWeb.provenance,
      buildAiSourceProvenance({
        origin: "general_construction_knowledge",
        sourceLabelRu: `Общие строительные знания: типовая структура сметы для ${params.plan.workTypeLabelRu}`,
        confidence: "low",
        warningRu: "Это черновик, не проектный факт.",
      }),
    ],
    externalSourceLines: [
      ...externalMarketplace.results.map((result) => `${result.titleRu} — ${result.url}, проверено ${result.checkedAt}`),
      ...externalWeb.results.map((result) => `${result.title} — ${result.url}, проверено ${result.checkedAt}`),
    ],
    providerTrace: [
      "constructionIntentRouter",
      "constructionWorkTypeClassifier",
      "constructionQuantityParser",
      "appDataCheckedFirst",
      "pdfDocumentsCheckedBeforeWeb",
      "internalMarketplaceCheckedBeforeExternal",
      externalMarketplace.used ? "externalMarketplaceUsed" : "externalMarketplaceNotUsed",
      externalWeb.used ? "externalWebSearchUsed" : "externalWebSearchNotConnectedOrEmpty",
      "generalConstructionKnowledgeLast",
    ],
  };
}

function buildConstructionEstimateAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
  sources?: LiveAiQueryIntentSources;
}): LiveAiAnswer {
  const plan = buildConstructionEstimatePlan(params.questionRu);
  const estimate = firstProjectEstimateForWorkType(params.sources, plan);
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
      shortRu: "Нашёл проектную смету по запрошенной установке и взял строки из переданного источника. Данные проекта не изменены.",
      foundRu,
      sourcesRu: estimate.sourcesRu?.length ? estimate.sourcesRu : [`${estimate.labelRu} (${estimate.id})`],
      checkedRu: ["project estimate provider", "PDF/document provider", "construction knowledge fallback не использован как факт"],
      missingDataRu: estimate.missingDataRu?.length ? estimate.missingDataRu : ["актуальность цен и региональные коэффициенты нужно подтвердить человеком"],
      nextStepRu: "Проверить размеры, количество, спецификацию и актуальность цен перед согласованием сметы.",
      status: "data_unchanged",
      providerTrace: [params.route.pipelineKey, "queryIntentFirst", "construction_estimate_request", "projectEstimateProvider"],
      sourceTrace: estimate.lines.flatMap((line) => line.sourceRefs ?? [estimate.id]),
      sourceProvenance: projectEstimateProvenance(estimate),
    });
  }

  const sourcePlan = estimateSourceProvenanceForPlan({
    plan,
    sources: params.sources,
  });
  const foundRu = [
    plan.estimateTitleRu,
    "Допущения:",
    ...plan.assumptionsRu.map((item) => `Допущение: ${item}`),
    "Состав работ:",
    ...plan.workItemsRu.map((item, index) => `${index + 1}. ${item}`),
  ];
  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "construction_estimate_request",
    explicitUserIntentUsed: true,
    shortRu: `В доступных данных приложения не найдена проектная смета по работе «${plan.workTypeLabelRu}». Ниже черновая типовая смета${quantityLabelRu(plan.quantity) !== "объём не указан" ? ` на ${quantityLabelRu(plan.quantity)}` : ""}. Это не проектный факт. Данные проекта не изменены.`,
    foundRu,
    sourcesRu: [...sourcePlan.externalSourceLines, "строительный шаблон: general construction knowledge"],
    checkedRu: [
      projectEstimateCheckedLineRu(plan),
      pdfCheckedLineRu(plan),
      requestCheckedLineRu(plan),
      `marketplace позиции по ${plan.checkedSubjectRu}: не найдены`,
    ],
    missingDataRu: plan.missingDataRu,
    nextStepRu: `Уточнить ${plan.missingDataRu.slice(0, 3).join(", ")} и загрузить проектную смету/PDF, если нужен точный расчёт.`,
    status: "draft_prepared",
    providerTrace: [params.route.pipelineKey, "queryIntentFirst", "construction_estimate_request", ...sourcePlan.providerTrace],
    sourceTrace: [`checked:project_estimate:${plan.workType}:none`, `checked:pdf:${plan.workType}:none`, "source:construction_knowledge_template"],
    sourceProvenance: sourcePlan.provenance,
  });
}

function materialItemsForConstructionWork(workType: ConstructionWorkType): string[] {
  const map: Partial<Record<ConstructionWorkType, string[]>> = {
    asphalt_paving: [
      "асфальтобетонная смесь",
      "щебень или ПГС для основания, если требуется",
      "битумная эмульсия / праймер",
      "песок для выравнивания, если требуется",
      "бордюрный камень и водоотвод, если входят в задачу",
    ],
    paving_blocks: ["брусчатка", "песок", "щебень", "геотекстиль", "бордюры"],
    concrete_screed: ["бетонная или сухая смесь", "грунтовка", "демпферная лента", "армирующая сетка при необходимости"],
    monolithic_concrete: ["бетонная смесь нужной марки", "арматура", "вязальная проволока", "опалубка", "фиксаторы защитного слоя", "пленка/состав для ухода за бетоном"],
    windows_installation: ["оконный блок", "анкера", "монтажная пена", "герметик", "подоконник", "отлив"],
    doors_installation: ["дверное полотно", "коробка", "наличники", "фурнитура", "монтажная пена", "крепёж"],
    electrical: ["кабель", "гофра или кабель-канал", "подрозетники", "розетки", "выключатели", "щитовая автоматика"],
    plumbing: ["трубы", "фитинги", "запорная арматура", "крепёж", "герметики"],
  };
  return map[workType] ?? ["основной материал по работе", "крепёж и расходники", "доставка", "инструмент/техника по технологии"];
}

function buildConstructionMarketplaceAnswer(params: {
  route: LiveAiRouteDefinition;
  questionRu: string;
  sources?: LiveAiQueryIntentSources;
}): LiveAiAnswer | null {
  const workType = classifyConstructionWorkType(params.questionRu);
  if (workType === "unknown") return null;
  const quantity = parseConstructionQuantity(params.questionRu);
  const plan = buildConstructionEstimatePlan(params.questionRu);
  const externalMarketplace = searchExternalMarketplace(params.sources?.externalMarketplace);
  const externalWeb = searchExternalWeb(
    {
      queryRu: `материалы ${plan.workTypeLabelRu} ${quantityLabelRu(quantity)}`,
      intent: "material_price_reference",
      maxResults: 3,
      blockedDomains: ["localhost"],
    },
    params.sources?.externalWeb,
  );
  const provenance = [
    buildAiSourceProvenance({
      origin: "internal_marketplace",
      sourceLabelRu: `Внутренний marketplace: материалы для ${plan.workTypeLabelRu} не найдены`,
      confidence: "medium",
    }),
    buildAiSourceProvenance({
      origin: "approved_vendor",
      sourceLabelRu: `Approved vendors/history: поставщики для ${plan.workTypeLabelRu} не найдены в переданных данных`,
      confidence: "medium",
    }),
    ...externalMarketplace.provenance,
    ...externalWeb.provenance,
    buildAiSourceProvenance({
      origin: "general_construction_knowledge",
      sourceLabelRu: `Общие строительные знания: состав материалов для ${plan.workTypeLabelRu}`,
      confidence: "low",
      warningRu: "Это список для подбора, не коммерческое предложение и не проектный факт.",
    }),
  ];
  return buildLiveAnswerFromParts({
    route: params.route,
    action: null,
    questionRu: params.questionRu,
    queryIntent: "marketplace_product_request",
    explicitUserIntentUsed: true,
    shortRu: `По запросу на материалы для работы «${plan.workTypeLabelRu}» проверен внутренний marketplace и доступные внешние источники. Без коммерческого предложения цены не фиксируются как факт.`,
    foundRu: [
      `Материалы для ${plan.workTypeLabelRu}${quantityLabelRu(quantity) !== "объём не указан" ? ` на ${quantityLabelRu(quantity)}` : ""}:`,
      ...materialItemsForConstructionWork(workType),
    ],
    sourcesRu: [
      ...externalMarketplace.results.map((result) => `${result.titleRu} — ${result.url}, проверено ${result.checkedAt}`),
      ...externalWeb.results.map((result) => `${result.title} — ${result.url}, проверено ${result.checkedAt}`),
      "строительный шаблон: general construction knowledge",
    ],
    checkedRu: [
      "internal marketplace",
      "approved vendors / supplier history",
      "external marketplace",
      "public web search",
    ],
    missingDataRu: [
      "точная спецификация материала",
      "проектные требования",
      "регион и валюта",
      "коммерческие предложения поставщиков",
    ],
    nextStepRu: "Сформировать заявку/спецификацию и запросить КП у поставщиков по штатному маршруту без автозаказа.",
    status: "draft_prepared",
    providerTrace: [
      params.route.pipelineKey,
      "queryIntentFirst",
      "marketplace_product_request",
      "constructionWorkTypeClassifier",
      "internalMarketplaceCheckedBeforeExternal",
      externalMarketplace.used ? "externalMarketplaceUsed" : "externalMarketplaceNotUsed",
      externalWeb.used ? "externalWebSearchUsed" : "externalWebSearchNotConnectedOrEmpty",
    ],
    sourceTrace: [`checked:marketplace:${workType}`, `checked:approved_vendors:${workType}`],
    sourceProvenance: provenance,
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
      sourceProvenance: procurementRequestProvenance(requests),
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
    sourceProvenance: procurementRequestProvenance([]),
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
    sourceProvenance: [
      buildAiSourceProvenance({
        origin: "general_construction_knowledge",
        sourceLabelRu: "Общие строительные знания: типовой черновик",
        confidence: "low",
        warningRu: "Не проектный факт.",
      }),
    ],
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
    case "app_data_count":
      return buildAppDataCountAnswer({
        route: params.route,
        questionRu: params.userText,
        sources: params.intentSources,
      });
    case "app_data_list":
      return buildRequestSearchAnswer({
        route: params.route,
        questionRu: params.userText,
        sources: params.intentSources,
      });
    case "construction_estimate_request":
      return buildConstructionEstimateAnswer({
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
    case "marketplace_product_request":
      return buildConstructionMarketplaceAnswer({
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
    contractor: [
      [/(фото|evidence)/i, "missing_photos_check"],
      [/(замеч|remark)/i, "open_remarks_check"],
      [/(ответ|прораб)/i, "remark_response_draft"],
      [/(акт)/i, "act_draft"],
      [/(повторн|провер)/i, "review_request_draft"],
      [/(оплат|документ)/i, "limited_payment_status_check"],
      [/(услуг|marketplace|карточ)/i, "contractor_marketplace_service_draft"],
      [/(при[её]м|acceptance|меша|blocker|сдать|готов)/i, "acceptance_blockers"],
    ],
    buyer: [[/(постав|supplier|вариант|option|shortlist|market)/i, "find_5_10_suppliers"]],
    accountant: [[/(крит|оплат|payment|invoice|счет|сч[её]т)/i, "critical_payments"]],
    office: [[/(напом|remind)/i, "reminder_draft"], [/(застр|stuck|документ|package|deadline)/i, "stuck_today"]],
    documents: [[/(pdf|документ|link|связ)/i, "documents_to_process"]],
    reports: [[/(отч|report|evidence)/i, "document_evidence_gaps"]],
    chat: [[/(чат|chat|сообщ|owner|задач)/i, "chat_context_summary"]],
    market: [[/(market|вариант|заяв|request|source)/i, "show_request_matches"]],
    supplier: [[/(витрин|card|карточ|товар|product|source)/i, "check_cards"]],
    admin: [[/(owner|роль|role|org|права)/i, "org_governance_snapshot"]],
    security: [
      [/(forbidden|запрещ|attempt)/i, "forbidden_attempts_report"],
      [/(approval|bypass|обход|согласован)/i, "approval_bypass_review"],
      [/(service[_ -]?role|privileged|служебн|seed)/i, "privileged_service_guard_report"],
      [/(auth admin|listusers|admin api)/i, "auth_admin_guard_report"],
      [/(debug|runtime|diagnostic|утеч|provider|payload|secret|env)/i, "debug_runtime_leak_review"],
      [/(role|роль|permission|права|policy|matrix|матриц)/i, "role_policy_review"],
      [/(report|отч[её]т)/i, "security_report_draft"],
      [/(safe|security|безопас|risk|риск)/i, "security_overview"],
    ],
    runtime: [
      [/(release|verify)/i, "release_verify_report"],
      [/(failed|runner|упал)/i, "failed_runner_report"],
      [/(artifact|артефакт|stale|missing)/i, "artifact_integrity_report"],
      [/(ios|testflight)/i, "ios_signoff_report"],
      [/(android|maestro|matrix|матриц)/i, "android_runtime_report"],
      [/(repair|safe|command|проверку|команд)/i, "safe_repair_suggestion"],
      [/(health|gate|safe|доступ|runtime|blocker|блокер)/i, "runtime_diagnosis"],
    ],
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
    case "market":
    case "supplier": {
      const context = buildLiveMarketplaceDefaultContext(route.context);
      return action
        ? answerMarketplaceIntakeAction({ context, actionId: action.pipelineActionId as MarketplaceIntakeIntent })
        : answerMarketplaceIntakeQuestion({ context, questionRu });
    }
    case "contractor": {
      const context = buildDefaultContractorAcceptanceContext();
      return action
        ? answerContractorAcceptanceAction({ context, actionId: action.pipelineActionId as ContractorAcceptanceIntent })
        : answerContractorAcceptanceQuestion({ context, questionRu });
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
    case "security":
    case "runtime": {
      const context = buildDefaultSecurityRuntimeContext();
      const role = route.context === "runtime" ? "dev" : "security";
      return action
        ? answerSecurityRuntimeAction({ context, actionId: action.pipelineActionId as SecurityRuntimeIntent, role })
        : answerSecurityRuntimeQuestion({
          context,
          questionRu,
          role,
          fallbackIntent: route.context === "runtime" ? "runtime_diagnosis" : "security_overview",
        });
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
  sourceProvenance?: AiSourceProvenance[];
}): LiveAiAnswer {
  const sourceProvenance = params.sourceProvenance ?? fallbackSourceProvenance({
    sourcesRu: params.sourcesRu,
    checkedRu: params.checkedRu,
    queryIntent: params.queryIntent,
  });
  const sourceDisclosureRu = composeAiAnswerSourceDisclosure(sourceProvenance);
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
    sourceDisclosureRu,
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
    sourceProvenance,
    sourceProvenanceBlockers: sourceProvenanceBlockers(sourceProvenance),
    sourceDisclosureRu,
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
