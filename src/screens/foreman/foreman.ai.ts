import {
  isAiBackendAvailable,
  requestAiGeneratedText,
} from "../../lib/ai/aiRepository";
import {
  resolveForemanAiCatalogViaServer,
} from "../../lib/api/foremanAiResolve.service";
import { safeJsonParse } from "../../lib/format";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

type ForemanAiAction = "create_request" | "clarify";
type ForemanAiKind = "material" | "work" | "service";

export const FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT = 40;

type RawForemanAiResponse = {
  action?: unknown;
  items?: unknown;
  message?: unknown;
};

export type ParsedForemanAiItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
};

export type ForemanAiQuickItem = ParsedForemanAiItem & {
  rik_code: string;
};

export type CandidateOption = {
  rik_code: string;
  name: string;
  unit: string;
  kind: ForemanAiKind;
  score: number;
};

export type CandidateOptionGroup = {
  sourceName: string;
  requestedQty: number;
  requestedUnit: string;
  kind: ForemanAiKind;
  specs?: string | null;
  options: CandidateOption[];
};

export type ClarifyQuestion = {
  id: string;
  prompt: string;
};

type AiPartialMeta = {
  resolvedItems?: ForemanAiQuickItem[];
  partialFailure?: boolean;
};

export type AiDraftOutcome =
  | { type: "resolved_items"; items: ForemanAiQuickItem[]; message: string }
  | ({
      type: "candidate_options";
      options: CandidateOptionGroup[];
      questions?: ClarifyQuestion[];
      message: string;
    } & AiPartialMeta)
  | ({
      type: "clarify_required";
      questions: ClarifyQuestion[];
      options?: CandidateOptionGroup[];
      message: string;
    } & AiPartialMeta)
  | ({
      type: "hard_fail_safe";
      reason: string;
      message: string;
      questions?: ClarifyQuestion[];
      options?: CandidateOptionGroup[];
    } & AiPartialMeta)
  | { type: "ai_unavailable"; reason: string; message: string };

export type ParsedForemanAiQuickResult = {
  action: ForemanAiAction;
  items: ParsedForemanAiItem[];
  message: string;
};

export type RikCatalogItem = {
  rik_code?: string | null;
  name_human?: string | null;
  name_human_ru?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const PACKAGING_UNITS = new Set([
  "коробка",
  "пачка",
  "мешок",
  "рулон",
  "упаковка",
  "комплект",
]);
PACKAGING_UNITS.add("\u043b\u0438\u0441\u0442");
PACKAGING_UNITS.add("\u0431\u0430\u043d\u043a\u0430");
PACKAGING_UNITS.add("\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430");
PACKAGING_UNITS.add("\u0431\u0443\u0445\u0442\u0430");

const FOREMAN_AGENT_SYSTEM_PROMPT = [
  "Ты специализированный AI-агент прораба.",
  "Из свободного текста сформируй только строительные позиции для заявки директору.",
  "",
  "Верни только JSON:",
  "{",
  '  "action": "create_request" | "clarify",',
  '  "items": [',
  "    {",
  '      "name": "Арматура A500C 12 мм",',
  '      "qty": 120,',
  '      "unit": "м",',
  '      "kind": "material" | "work" | "service",',
  '      "specs": "Доп. уточнение"',
  "    }",
  "  ],",
  '  "message": "Краткий итог"',
  "}",
  "",
  "Правила:",
  '1) Если нельзя уверенно определить хотя бы одну позицию или количество, верни action="clarify".',
  "2) Не придумывай новые позиции.",
  "3) Нормализуй единицы к: шт, м, м2, м3, кг, т, л, мешок, комплект.",
  "4) material = материалы, work = работы, service = доставка/аренда/услуги.",
  "5) Ответ без markdown и без текста вне JSON.",
].join("\n");

const getGeminiConfig = (): { model: string } => {
  const model = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return { model: model || DEFAULT_MODEL };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const logForemanAi = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[foreman.ai]", payload);
};

const foremanAiWarnedErrors = new Set<string>();
const MAX_AI_WARNED_ERRORS = 200;

const recordForemanAiDegradedOnce = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown_error");
  const key = `${event}:${message}`;
  if (foremanAiWarnedErrors.has(key)) return;
  foremanAiWarnedErrors.add(key);
  if (foremanAiWarnedErrors.size > MAX_AI_WARNED_ERRORS) {
    const first = foremanAiWarnedErrors.values().next().value;
    if (first !== undefined) foremanAiWarnedErrors.delete(first);
  }
  if (__DEV__) console.warn("[foreman.ai]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "ai",
    surface: "foreman_quick_request",
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: true,
    errorStage: event,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message || undefined,
    extra: {
      module: "foreman.ai",
      owner: "foreman_ai",
      mode: "degraded",
      ...extra,
    },
  });
};

const cleanJsonText = (text: string): string => {
  const trimmed = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
};

const normalizeUnit = (rawUnit?: string | null): string => {
  const unit = String(rawUnit || "").trim().toLowerCase();
  if (!unit) return "шт";
  if (["шт", "штука", "штук", "pcs", "pc"].includes(unit)) return "шт";
  if (["м", "метр", "метров", "m"].includes(unit)) return "м";
  if (["м2", "м²", "кв.м", "квм", "sqm", "m2"].includes(unit)) return "м2";
  if (["м3", "м³", "куб", "куб.м", "кубометр", "m3"].includes(unit)) return "м3";
  if (["кг", "килограмм", "kg"].includes(unit)) return "кг";
  if (["т", "тонна", "тонн", "ton"].includes(unit)) return "т";
  if (["л", "литр", "литров", "l"].includes(unit)) return "л";
  if (["меш", "мешок", "мешков", "bag"].includes(unit)) return "мешок";
  if (["комплект", "компл", "set"].includes(unit)) return "комплект";
  return unit;
};

const normalizeResolveUnit = (rawUnit?: string | null): string => {
  const normalized = normalizeUnit(rawUnit);
  if (["коробка", "короб", "box"].includes(normalized)) return "коробка";
  if (["пачка", "пач", "pack"].includes(normalized)) return "пачка";
  if (["рулон", "roll"].includes(normalized)) return "рулон";
  if (["упаковка", "упак", "package", "pkg"].includes(normalized)) return "упаковка";
  if (["\u043b\u0438\u0441\u0442", "\u043b\u0438\u0441\u0442\u0430", "\u043b\u0438\u0441\u0442\u043e\u0432", "sheet"].includes(normalized)) {
    return "\u043b\u0438\u0441\u0442";
  }
  if (["\u0431\u0430\u043d\u043a\u0430", "\u0431\u0430\u043d\u043a\u0438", "\u0431\u0430\u043d\u043e\u043a", "can"].includes(normalized)) {
    return "\u0431\u0430\u043d\u043a\u0430";
  }
  if (["\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430", "\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u044b", "\u043a\u0430\u043d\u0438\u0441\u0442\u0440", "jerrycan"].includes(normalized)) {
    return "\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430";
  }
  if (["\u0431\u0443\u0445\u0442\u0430", "\u0431\u0443\u0445\u0442\u044b", "\u0431\u0443\u0445\u0442", "coil"].includes(normalized)) {
    return "\u0431\u0443\u0445\u0442\u0430";
  }
  return normalized;
};

const normalizeResolveUnitCanonical = (rawUnit?: string | null): string => {
  const normalized = normalizeResolveUnit(rawUnit);
  if (["коробка", "короб", "box"].includes(normalized)) return "коробка";
  if (["пачка", "пач", "pack"].includes(normalized)) return "пачка";
  if (["мешок", "bag"].includes(normalized)) return "мешок";
  if (["рулон", "roll"].includes(normalized)) return "рулон";
  if (["упаковка", "упак", "package", "pkg"].includes(normalized)) {
    return "упаковка";
  }
  if (["комплект", "set"].includes(normalized)) return "комплект";
  if (["\u043b\u0438\u0441\u0442", "\u043b\u0438\u0441\u0442\u0430", "\u043b\u0438\u0441\u0442\u043e\u0432", "sheet"].includes(normalized)) {
    return "\u043b\u0438\u0441\u0442";
  }
  if (["\u0431\u0430\u043d\u043a\u0430", "\u0431\u0430\u043d\u043a\u0438", "\u0431\u0430\u043d\u043e\u043a", "can"].includes(normalized)) {
    return "\u0431\u0430\u043d\u043a\u0430";
  }
  if (["\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430", "\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u044b", "\u043a\u0430\u043d\u0438\u0441\u0442\u0440", "jerrycan"].includes(normalized)) {
    return "\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430";
  }
  if (["\u0431\u0443\u0445\u0442\u0430", "\u0431\u0443\u0445\u0442\u044b", "\u0431\u0443\u0445\u0442", "coil"].includes(normalized)) {
    return "\u0431\u0443\u0445\u0442\u0430";
  }
  return normalized;
};

const isPackagingLikeUnit = (value?: string | null) =>
  PACKAGING_UNITS.has(normalizeResolveUnitCanonical(value));

const normalizeKind = (kind?: string | null, name?: string | null): ForemanAiKind => {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  if (normalizedKind === "work") return "work";
  if (normalizedKind === "service") return "service";
  if (normalizedKind === "material") return "material";

  const text = String(name || "").trim().toLowerCase();
  if (/(доставк|аренд|кран|экскаватор|услуг|техник|логист|перевоз)/.test(text)) return "service";
  if (/(монтаж|демонтаж|штукатур|кладк|бетонир|сварк|работ)/.test(text)) return "work";
  return "material";
};

const normalizeName = (rawName?: string | null): string => {
  const name = String(rawName || "").trim();
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const normalizeSearchText = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[.,:;()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitSearchTokens = (value: unknown): string[] =>
  normalizeSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const resolveCatalogKind = (item: RikCatalogItem): ForemanAiKind | "unknown" => {
  const rawKind = String(item.kind ?? "").trim().toLowerCase();
  if (["material", "materials", "материал", "материалы"].includes(rawKind)) return "material";
  if (["work", "works", "работа", "работы"].includes(rawKind)) return "work";
  if (["service", "services", "услуга", "услуги"].includes(rawKind)) return "service";

  const code = String(item.rik_code ?? "").trim().toUpperCase();
  if (code.startsWith("MAT-") || code.startsWith("TOOL-") || code.startsWith("KIT-")) return "material";
  if (code.startsWith("WT-") || code.startsWith("WORK-")) return "work";
  if (code.startsWith("SRV-") || code.startsWith("SERV-")) return "service";
  return "unknown";
};

const isCatalogKindCompatible = (expected: ForemanAiKind, item: RikCatalogItem): boolean => {
  const catalogKind = resolveCatalogKind(item);
  return catalogKind === "unknown" || catalogKind === expected;
};

const isUnitCompatible = (expectedUnit: string, catalogUnit?: string | null): boolean => {
  const left = normalizeResolveUnitCanonical(expectedUnit);
  const right = normalizeResolveUnitCanonical(catalogUnit ?? "");
  return !left || !right || left === right;
};

export const scoreCatalogCandidate = (input: ParsedForemanAiItem, item: RikCatalogItem): number => {
  if (!isCatalogKindCompatible(input.kind, item)) return -1000;
  if (!isPackagingLikeUnit(input.unit) && !isUnitCompatible(input.unit, item.uom_code ?? null)) return -100;

  const queryName = normalizeSearchText(input.name);
  const queryTokens = splitSearchTokens(input.name);
  const querySpecTokens = splitSearchTokens(input.specs ?? "");
  const candidateName = normalizeSearchText(item.name_human ?? "");
  const candidateCode = String(item.rik_code ?? "").trim().toUpperCase();

  let score = 0;
  if (!candidateName) score -= 50;
  if (candidateName === queryName) score += 200;
  else if (candidateName.startsWith(queryName) || queryName.startsWith(candidateName)) score += 120;
  else if (candidateName.includes(queryName)) score += 80;

  if (queryTokens.length > 0) {
    const matched = queryTokens.filter((token) => candidateName.includes(token)).length;
    const coverage = matched / queryTokens.length;
    if (coverage >= 1) score += 90;
    else if (coverage >= 0.75) score += 55;
    else if (coverage >= 0.5) score += 20;
  }

  if (querySpecTokens.length > 0) {
    const matchedSpecs = querySpecTokens.filter((token) => candidateName.includes(token)).length;
    if (matchedSpecs === querySpecTokens.length) score += 25;
    else if (matchedSpecs > 0) score += 10;
  }

  if (candidateCode === queryName.toUpperCase()) score += 180;
  else if (candidateCode.startsWith(queryName.toUpperCase())) score += 40;

  return score + 15;
};

const normalizeForemanAiItem = (rawItem: unknown): ParsedForemanAiItem | null => {
  const row = asRecord(rawItem);
  if (!row) return null;

  const qty = Number(row.qty);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const name = normalizeName(typeof row.name === "string" ? row.name : null);
  if (!name) return null;

  const kind = normalizeKind(typeof row.kind === "string" ? row.kind : null, name);
  const unit = normalizeResolveUnitCanonical(typeof row.unit === "string" ? row.unit : null);
  const specs = String(row.specs || "").trim() || null;

  return {
    name,
    qty,
    unit,
    kind,
    specs,
  };
};

const parseForemanAiRawResponse = (text: string): RawForemanAiResponse => {
  const parsed = safeJsonParse<RawForemanAiResponse>(text, {});
  if (parsed.ok === false) throw parsed.error;
  return parsed.value;
};

export const parseForemanAiResponse = (text: string): ParsedForemanAiQuickResult => {
  let parsed: RawForemanAiResponse;
  try {
    parsed = parseForemanAiRawResponse(cleanJsonText(text));
  } catch (error) {
    recordForemanAiDegradedOnce("ai_response_json_parse_failed", error, {
      responseLength: String(text ?? "").length,
    });
    throw new Error("AI вернул ответ не в JSON формате.");
  }

  const normalizedItems = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => normalizeForemanAiItem(item))
        .filter((item): item is ParsedForemanAiItem => Boolean(item))
    : [];

  const requestedAction = String(parsed.action || "").trim().toLowerCase();
  const action: ForemanAiAction =
    requestedAction === "clarify" || normalizedItems.length === 0 ? "clarify" : "create_request";
  const message = String(parsed.message || "").trim()
    || (action === "clarify"
      ? "Нужно уточнить позиции или количество."
      : `Распознано позиций: ${normalizedItems.length}.`);

  return {
    action,
    items: normalizedItems,
    message,
  };
};

const buildClarifyQuestions = (message: string, fallbackId = "clarify"): ClarifyQuestion[] => {
  const prompt = String(message || "").trim() || "Уточните позиции или количество.";
  return [{ id: fallbackId, prompt }];
};

export type ForemanAiResolvedInputItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
};

export type ForemanQuickLocalAssistParams = {
  prompt: string;
  lastResolvedItems?: ForemanAiQuickItem[] | null;
  networkOnline?: boolean | null;
};

const REFERENCE_REPEAT_PATTERNS = [
  /^(?:\u0435\u0449\u0435\s+)?\u0441\u0442\u043e\u043b\u044c\u043a\u043e\s+\u0436\u0435$/,
  /^(?:\u0435\u0449\u0435\s+)?\u0442\u043e\u0433\u043e\s+\u0436\u0435$/,
  /^(?:\u0435\u0449\u0435\s+)?\u0442\u0430\u043a\u043e\u0433\u043e\s+\u0436\u0435$/,
  /^(?:\u0435\u0449\u0435\s+)?\u0442\u0430\u043a\u0438\u0445\s+\u0436\u0435$/,
  /^(?:\u043f\u043e\u0432\u0442\u043e\u0440\u0438|\u043f\u043e\u0432\u0442\u043e\u0440\u0438\s+\u043f\u043e\u0441\u043b\u0435\u0434\u043d(?:\u0435\u0435|\u044e\u044e)\s+\u043f\u043e\u0437\u0438\u0446\u0438\u044e|\u043f\u043e\u0432\u0442\u043e\u0440\u0438\s+\u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435)$/,
];
const REFERENCE_REPEAT_WITH_QTY_PATTERN =
  /^(?:\u0435\u0449\u0435\s+)?(.+?)\s+(?:\u0442\u0430\u043a\u0438\u0445\s+\u0436\u0435|\u0442\u0430\u043a\u043e\u0433\u043e\s+\u0436\u0435|\u0442\u0430\u043a\u043e\u0439\s+\u0436\u0435)$/;
const REFERENCE_REMOVE_PATTERNS = [
  /^\u0443\u0431\u0435\u0440\u0438\s+\u043f\u043e\u0441\u043b\u0435\u0434\u043d(?:\u0438\u0439|\u044e\u044e)$/,
  /^\u0443\u0434\u0430\u043b\u0438\s+\u043f\u043e\u0441\u043b\u0435\u0434\u043d(?:\u0438\u0439|\u044e\u044e)$/,
];
const SPOKEN_REFERENCE_NUMBERS: Record<string, number> = {
  "\u043e\u0434\u0438\u043d": 1,
  "\u043e\u0434\u043d\u0443": 1,
  "\u0434\u0432\u0430": 2,
  "\u0434\u0432\u0435": 2,
  "\u0442\u0440\u0438": 3,
  "\u0447\u0435\u0442\u044b\u0440\u0435": 4,
  "\u043f\u044f\u0442\u044c": 5,
  "\u0448\u0435\u0441\u0442\u044c": 6,
  "\u0441\u0435\u043c\u044c": 7,
  "\u0432\u043e\u0441\u0435\u043c\u044c": 8,
  "\u0434\u0435\u0432\u044f\u0442\u044c": 9,
  "\u0434\u0435\u0441\u044f\u0442\u044c": 10,
};

const normalizeResolvedInputItem = (
  rawItem: ForemanAiResolvedInputItem,
): ParsedForemanAiItem | null => {
  const qty = Number(rawItem.qty);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const name = normalizeName(rawItem.name);
  if (!name) return null;

  return {
    name,
    qty,
    unit: normalizeResolveUnitCanonical(rawItem.unit),
    kind: normalizeKind(rawItem.kind, name),
    specs: String(rawItem.specs || "").trim() || null,
  };
};

const normalizeReferencePrompt = (value: string): string =>
  normalizeSearchText(String(value || ""))
    .replace(/\u0451/g, "\u0435")
    .trim();

const extractReferenceQty = (value: string): number | null => {
  const digitMatch = value.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (digitMatch) {
    const parsed = Number(digitMatch[1].replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  for (const token of value.split(" ")) {
    const parsed = SPOKEN_REFERENCE_NUMBERS[token];
    if (typeof parsed === "number" && parsed > 0) return parsed;
  }
  return null;
};

const isReferenceRepeatPrompt = (value: string): boolean =>
  REFERENCE_REPEAT_PATTERNS.some((pattern) => pattern.test(value))
  || REFERENCE_REPEAT_WITH_QTY_PATTERN.test(value);

const isReferenceRemovePrompt = (value: string): boolean =>
  REFERENCE_REMOVE_PATTERNS.some((pattern) => pattern.test(value));

const buildSessionClarifyOutcome = (
  message: string,
  questionId: string,
  resolvedItems: ForemanAiQuickItem[] = [],
): AiDraftOutcome => ({
  type: "clarify_required",
  questions: buildClarifyQuestions(message, questionId),
  options: [],
  resolvedItems,
  partialFailure: false,
  message,
});

export function resolveForemanQuickLocalAssist(params: ForemanQuickLocalAssistParams): AiDraftOutcome | null {
  const prompt = normalizeReferencePrompt(params.prompt);
  if (!prompt) return null;

  const lastResolvedItems = Array.isArray(params.lastResolvedItems)
    ? params.lastResolvedItems.filter((item) => Number(item?.qty) > 0 && String(item?.rik_code || "").trim())
    : [];

  if (isReferenceRemovePrompt(prompt)) {
    return buildSessionClarifyOutcome(
      "\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 AI-\u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f. \u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0438 \u0443\u0434\u0430\u043b\u0438\u0442\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0432\u0440\u0443\u0447\u043d\u0443\u044e.",
      "session_remove_not_supported",
    );
  }

  if (isReferenceRepeatPrompt(prompt)) {
    if (lastResolvedItems.length === 0) {
      return buildSessionClarifyOutcome(
        "\u041d\u0435\u0442 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0439 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438. \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u043e\u043b\u043d\u043e\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0438\u043b\u0438 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433.",
        "session_no_context",
      );
    }
    if (lastResolvedItems.length !== 1) {
      return buildSessionClarifyOutcome(
        "\u0412 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u043c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u043e\u043c \u043d\u0430\u0431\u043e\u0440\u0435 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u0439. \u0423\u0442\u043e\u0447\u043d\u0438\u0442\u0435, \u043a\u0430\u043a\u0443\u044e \u0438\u043c\u0435\u043d\u043d\u043e \u043d\u0443\u0436\u043d\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c.",
        "session_multiple_context",
        lastResolvedItems,
      );
    }

    const baseItem = lastResolvedItems[0];
    const resolvedQty = extractReferenceQty(prompt) ?? baseItem.qty;
    if (!Number.isFinite(resolvedQty) || resolvedQty <= 0) {
      return buildSessionClarifyOutcome(
        "\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043b\u044f \u043f\u043e\u0432\u0442\u043e\u0440\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438.",
        "session_invalid_qty",
      );
    }

    logForemanAi({
      phase: "session_reference_resolved",
      networkOnline: params.networkOnline ?? null,
      sourcePrompt: params.prompt,
      rikCode: baseItem.rik_code,
      resolvedQty,
    });
    return {
      type: "resolved_items",
      items: [{ ...baseItem, qty: resolvedQty }],
      message:
        resolvedQty === baseItem.qty
          ? "\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u043b \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u043f\u043e\u0437\u0438\u0446\u0438\u044e."
          : `\u0412\u0437\u044f\u043b \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0438 \u043e\u0431\u043d\u043e\u0432\u0438\u043b \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043e ${resolvedQty} ${baseItem.unit}.`,
    };
  }

  if (params.networkOnline === false) {
    const offlineMessage = lastResolvedItems.length > 0
      ? "\u041d\u0435\u0442 \u0441\u0435\u0442\u0438. AI resolve \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0432 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u043e\u043c \u0440\u0435\u0436\u0438\u043c\u0435: \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u044e\u044e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0444\u0440\u0430\u0437\u043e\u0439 \"\u0435\u0449\u0451 \u0441\u0442\u043e\u043b\u044c\u043a\u043e \u0436\u0435\" \u0438\u043b\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433."
      : "\u041d\u0435\u0442 \u0441\u0435\u0442\u0438. AI resolve \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433, \u0441\u043c\u0435\u0442\u0443 \u0438\u043b\u0438 \u0440\u0443\u0447\u043d\u043e\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u0439.";
    logForemanAi({
      phase: "offline_degraded_mode",
      hasSessionContext: lastResolvedItems.length > 0,
      sourcePrompt: params.prompt,
    });
    return {
      type: "ai_unavailable",
      reason: "offline_degraded_mode",
      message: offlineMessage,
    };
  }

  return null;
}

type ServerCatalogResolveResult = {
  items: ForemanAiQuickItem[];
  candidateGroups: CandidateOptionGroup[];
  clarifyQuestions: ClarifyQuestion[];
  unresolvedNames: string[];
};

const mapServerResolvedItem = (item: {
  rik_code: string;
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
}): ForemanAiQuickItem | null => {
  const rikCode = String(item.rik_code || "").trim();
  const name = normalizeName(item.name);
  const qty = Number(item.qty);
  const unit = normalizeResolveUnitCanonical(item.unit);
  if (!rikCode || !name || !Number.isFinite(qty) || qty <= 0 || !unit) return null;
  return {
    rik_code: rikCode,
    name,
    qty,
    unit,
    kind: normalizeKind(item.kind, name),
    specs: String(item.specs || "").trim() || null,
  };
};

const mapServerCandidateGroup = (group: CandidateOptionGroup): CandidateOptionGroup | null => {
  const sourceName = normalizeName(group.sourceName);
  const requestedQty = Number(group.requestedQty);
  const requestedUnit = normalizeResolveUnitCanonical(group.requestedUnit);
  const options = Array.isArray(group.options)
    ? group.options
        .map((option) => ({
          rik_code: String(option.rik_code || "").trim(),
          name: normalizeName(option.name),
          unit: normalizeResolveUnitCanonical(option.unit),
          kind: normalizeKind(option.kind, option.name),
          score: Number(option.score),
        }))
        .filter((option) => option.rik_code && option.name && option.unit && Number.isFinite(option.score))
    : [];
  if (!sourceName || !Number.isFinite(requestedQty) || requestedQty <= 0 || !requestedUnit || options.length === 0) {
    return null;
  }
  return {
    sourceName,
    requestedQty,
    requestedUnit,
    kind: normalizeKind(group.kind, sourceName),
    specs: String(group.specs || "").trim() || null,
    options,
  };
};

const mapServerClarifyQuestion = (question: ClarifyQuestion): ClarifyQuestion | null => {
  const id = String(question.id || "").trim();
  const prompt = String(question.prompt || "").trim();
  return id && prompt ? { id, prompt } : null;
};

const resolveCatalogItems = async (
  items: ParsedForemanAiItem[],
  prompt: string,
): Promise<ServerCatalogResolveResult> => {
  try {
    const resolved = await resolveForemanAiCatalogViaServer({
      prompt,
      items: items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        kind: item.kind,
        specs: item.specs ?? null,
      })),
      maxItems: FOREMAN_AI_CATALOG_RESOLVE_ITEM_LIMIT,
    });

    const accepted = resolved.items
      .map(mapServerResolvedItem)
      .filter((item): item is ForemanAiQuickItem => Boolean(item));
    const candidateGroups = resolved.candidateGroups
      .map(mapServerCandidateGroup)
      .filter((group): group is CandidateOptionGroup => Boolean(group));
    const clarifyQuestions = resolved.clarifyQuestions
      .map(mapServerClarifyQuestion)
      .filter((question): question is ClarifyQuestion => Boolean(question));
    const unresolvedNames = resolved.unresolvedNames
      .map((name) => normalizeName(name))
      .filter(Boolean);

    logForemanAi({
      phase: "server_catalog_resolved",
      sourceItemCount: resolved.meta.sourceItemCount,
      resolveItemCount: resolved.meta.resolveItemCount,
      duplicateItemCount: resolved.meta.duplicateItemCount,
      cappedItemCount: resolved.meta.cappedItemCount,
      cacheStatus: resolved.meta.cacheStatus,
    });

    return {
      items: accepted,
      candidateGroups,
      clarifyQuestions,
      unresolvedNames,
    };
  } catch (error) {
    recordForemanAiDegradedOnce("server_catalog_resolve_failed", error, {
      sourceItemCount: items.length,
    });
    return {
      items: [],
      candidateGroups: [],
      clarifyQuestions: [],
      unresolvedNames: items.map((item) => item.name),
    };
  }
};

const finalizeResolvedQuickResult = async (
  parsed: ParsedForemanAiQuickResult,
  sourcePath: "backend",
  prompt: string,
): Promise<AiDraftOutcome> => {
  if (parsed.action === "clarify" || parsed.items.length === 0) {
    return {
      type: "clarify_required",
      questions: buildClarifyQuestions(parsed.message),
      options: [],
      resolvedItems: [],
      partialFailure: false,
      message: parsed.message,
    };
  }

  const resolved = await resolveCatalogItems(parsed.items, prompt);
  logForemanAi({
    phase: "catalog_resolved",
    sourcePath,
    parsedItemCount: parsed.items.length,
    resolvedItemCount: resolved.items.length,
    candidateGroupCount: resolved.candidateGroups.length,
    clarifyCount: resolved.clarifyQuestions.length,
    unresolvedItemCount: resolved.unresolvedNames.length,
  });

  if (resolved.items.length === parsed.items.length) {
    return {
      type: "resolved_items",
      items: resolved.items,
      message: `Найдено в каталоге позиций: ${resolved.items.length}.`,
    };
  }

  if (resolved.clarifyQuestions.length > 0) {
    return {
      type: "clarify_required",
      questions: resolved.clarifyQuestions,
      options: resolved.candidateGroups,
      resolvedItems: resolved.items,
      partialFailure: resolved.items.length > 0,
      message: "Уточните упаковку или единицу измерения для неоднозначных позиций.",
    };
  }

  if (resolved.candidateGroups.length > 0) {
    const suffix = resolved.items.length > 0 ? ` Точно сопоставлено: ${resolved.items.length}.` : "";
    return {
      type: "candidate_options",
      options: resolved.candidateGroups,
      questions: [],
      resolvedItems: resolved.items,
      partialFailure: resolved.items.length > 0,
      message: `Нужно выбрать позиции из каталога для ${resolved.candidateGroups.length} пунктов.${suffix}`,
    };
  }

  if (resolved.clarifyQuestions.length > 0) {
    return {
      type: "clarify_required",
      questions: resolved.clarifyQuestions,
      message: "Уточните упаковку или единицу измерения для неоднозначных позиций.",
    };
  }

  if (resolved.unresolvedNames.length > 0) {
    const unresolvedLabel = resolved.unresolvedNames.join(", ");
    const message = `Не удалось сопоставить с каталогом: ${unresolvedLabel}. Уточните названия или добавьте позиции вручную через каталог.`;
    return {
      type: "clarify_required",
      questions: buildClarifyQuestions(message, "catalog_clarify"),
      options: [],
      resolvedItems: resolved.items,
      partialFailure: resolved.items.length > 0,
      message,
    };
  }

  return {
    type: "hard_fail_safe",
    reason: "no_safe_resolution_path",
    questions: buildClarifyQuestions("Уточните позиции или добавьте их вручную через каталог.", "manual_add"),
    message: "Уточните позиции или добавьте их вручную через каталог.",
  };
};

void finalizeResolvedQuickResult;

const finalizeResolvedQuickResultV2 = async (
  parsed: ParsedForemanAiQuickResult,
  sourcePath: "backend",
  prompt: string,
): Promise<AiDraftOutcome> => {
  if (parsed.action === "clarify" || parsed.items.length === 0) {
    return {
      type: "clarify_required",
      questions: buildClarifyQuestions(parsed.message),
      options: [],
      resolvedItems: [],
      partialFailure: false,
      message: parsed.message,
    };
  }

  const resolved = await resolveCatalogItems(parsed.items, prompt);
  logForemanAi({
    phase: "catalog_resolved",
    sourcePath,
    parsedItemCount: parsed.items.length,
    resolvedItemCount: resolved.items.length,
    candidateGroupCount: resolved.candidateGroups.length,
    clarifyCount: resolved.clarifyQuestions.length,
    unresolvedItemCount: resolved.unresolvedNames.length,
  });

  if (resolved.items.length === parsed.items.length) {
    return {
      type: "resolved_items",
      items: resolved.items,
      message: `Найдено в каталоге позиций: ${resolved.items.length}.`,
    };
  }

  const unresolvedMessage = resolved.unresolvedNames.length > 0
    ? `Не удалось сопоставить с каталогом: ${resolved.unresolvedNames.join(", ")}. Уточните названия или добавьте позиции вручную через каталог.`
    : null;
  const combinedClarifyQuestions = unresolvedMessage
    ? [...resolved.clarifyQuestions, ...buildClarifyQuestions(unresolvedMessage, "catalog_clarify")]
    : resolved.clarifyQuestions;

  if (combinedClarifyQuestions.length > 0) {
    return {
      type: "clarify_required",
      questions: combinedClarifyQuestions,
      options: resolved.candidateGroups,
      resolvedItems: resolved.items,
      partialFailure: resolved.items.length > 0,
      message: unresolvedMessage
        || "Уточните упаковку или единицу измерения для неоднозначных позиций.",
    };
  }

  if (resolved.candidateGroups.length > 0) {
    const suffix = resolved.items.length > 0 ? ` Точно сопоставлено: ${resolved.items.length}.` : "";
    return {
      type: "candidate_options",
      options: resolved.candidateGroups,
      questions: [],
      resolvedItems: resolved.items,
      partialFailure: resolved.items.length > 0,
      message: `Нужно выбрать позиции из каталога для ${resolved.candidateGroups.length} пунктов.${suffix}`,
    };
  }

  return {
    type: "hard_fail_safe",
    reason: "no_safe_resolution_path",
    questions: buildClarifyQuestions("Уточните позиции или добавьте их вручную через каталог.", "manual_add"),
    options: resolved.candidateGroups,
    resolvedItems: resolved.items,
    partialFailure: resolved.items.length > 0,
    message: "Уточните позиции или добавьте их вручную через каталог.",
  };
};

export async function resolveForemanParsedItemsForTesting(params: {
  items: ForemanAiResolvedInputItem[];
  message?: string;
  prompt?: string;
  action?: ForemanAiAction;
}): Promise<AiDraftOutcome> {
  const normalizedItems = Array.isArray(params.items)
    ? params.items
        .map((item) => normalizeResolvedInputItem(item))
        .filter((item): item is ParsedForemanAiItem => Boolean(item))
    : [];

  return await finalizeResolvedQuickResultV2(
    {
      action: params.action === "clarify" || normalizedItems.length === 0 ? "clarify" : "create_request",
      items: normalizedItems,
      message: String(params.message || "").trim() || "Battle dataset resolve",
    },
    "backend",
    String(params.prompt || params.message || "").trim() || "Battle dataset resolve",
  );
}

export function isForemanQuickRequestConfigured(): boolean {
  return isAiBackendAvailable();
}

export async function sendForemanQuickRequestPrompt(prompt: string): Promise<AiDraftOutcome> {
  const message = String(prompt || "").trim();
  if (!message) {
    throw new Error("Опишите, что нужно добавить в заявку.");
  }

  if (!isAiBackendAvailable()) {
    throw new Error("AI service is not configured.");
  }

  const { model } = getGeminiConfig();
  const text = await requestAiGeneratedText({
    sourcePath: "foreman_quick_request",
    request: {
      model,
      systemInstruction: FOREMAN_AGENT_SYSTEM_PROMPT,
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 900,
        responseMimeType: "application/json",
      },
    },
  });

  if (!text) {
    throw new Error("AI не вернул содержательный ответ.");
  }

  const parsed = parseForemanAiResponse(text);
  logForemanAi({
    phase: "backend_parsed",
    action: parsed.action,
    parsedItemCount: parsed.items.length,
  });
  return await finalizeResolvedQuickResultV2(parsed, "backend", message);
}

export async function resolveForemanQuickRequest(prompt: string): Promise<AiDraftOutcome> {
  const message = String(prompt || "").trim();
  if (!message) {
    return {
      type: "clarify_required",
      questions: buildClarifyQuestions("Опишите, что нужно добавить в заявку.", "empty_prompt"),
      message: "Опишите, что нужно добавить в заявку.",
    };
  }

  if (!isForemanQuickRequestConfigured()) {
    return {
      type: "ai_unavailable",
      reason: "not_configured",
      message: "AI временно недоступен. Используйте каталог, смету или ручное добавление позиций.",
    };
  }

  try {
    return await sendForemanQuickRequestPrompt(message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error ?? "ai_unavailable");
    logForemanAi({
      phase: "ai_unavailable",
      errorMessage: reason,
    });
    return {
      type: "ai_unavailable",
      reason,
      message: "AI временно недоступен. Используйте каталог, смету или ручное добавление позиций.",
    };
  }
}
