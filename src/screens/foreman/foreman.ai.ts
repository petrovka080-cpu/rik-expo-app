import {
  isAiBackendAvailable,
  requestAiGeneratedText,
} from "../../lib/ai/aiRepository";
import {
  resolveCatalogPackagingViaRpc,
  resolveCatalogSynonymMatchViaRpc,
} from "../../lib/api/foremanAiResolve.service";
import { rikQuickSearch } from "../../lib/catalog_api";

type ForemanAiAction = "create_request" | "clarify";
type ForemanAiKind = "material" | "work" | "service";

type RawForemanAiResponse = {
  action?: unknown;
  items?: unknown;
  message?: unknown;
};

type ParsedForemanAiItem = {
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

type ParsedForemanAiQuickResult = {
  action: ForemanAiAction;
  items: ParsedForemanAiItem[];
  message: string;
};

type RikCatalogItem = Awaited<ReturnType<typeof rikQuickSearch>>[number];

const DEFAULT_MODEL = "gemini-2.5-flash";
const RESOLVE_SCORE_THRESHOLD = 120;
const CANDIDATE_SCORE_THRESHOLD = 20;
const PACKAGING_UNITS = new Set([
  "коробка",
  "пачка",
  "мешок",
  "рулон",
  "упаковка",
  "комплект",
  "РєРѕСЂРѕР±РєР°",
  "РїР°С‡РєР°",
  "РјРµС€РѕРє",
  "СЂСѓР»РѕРЅ",
  "СѓРїР°РєРѕРІРєР°",
  "РєРѕРјРїР»РµРєС‚",
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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
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
  if (["коробка", "короб", "РєРѕСЂРѕР±РєР°", "РєРѕСЂРѕР±", "box"].includes(normalized)) return "коробка";
  if (["пачка", "пач", "РїР°С‡РєР°", "РїР°С‡", "pack"].includes(normalized)) return "пачка";
  if (["мешок", "РјРµС€РѕРє", "bag"].includes(normalized)) return "мешок";
  if (["рулон", "СЂСѓР»РѕРЅ", "roll"].includes(normalized)) return "рулон";
  if (["упаковка", "упак", "СѓРїР°РєРѕРІРєР°", "СѓРїР°Рє", "package", "pkg"].includes(normalized)) {
    return "упаковка";
  }
  if (["комплект", "РєРѕРјРїР»РµРєС‚", "set"].includes(normalized)) return "комплект";
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

const SEARCH_MEANINGLESS_TOKENS = new Set([
  "мм",
  "см",
  "кг",
  "шт",
  "м2",
  "м3",
  "тонн",
  "тонна",
  "тн",
]);

const splitMeaningfulSearchTokens = (value: unknown): string[] =>
  splitSearchTokens(value).filter((token) => {
    if (SEARCH_MEANINGLESS_TOKENS.has(token)) return false;
    return !/^\d+(?:[.,]\d+)?$/.test(token);
  });

const hasMeaningfulTokenOverlap = (source: unknown, candidate: unknown): boolean => {
  const sourceTokens = splitMeaningfulSearchTokens(source);
  if (sourceTokens.length === 0) return true;
  const candidateText = normalizeSearchText(candidate);
  return sourceTokens.some((token) => candidateText.includes(token));
};

const addCatalogQuery = (collector: Set<string>, value: string) => {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (normalized.length >= 2) {
    collector.add(normalized);
  }
};

const extractRebarMark = (value: string): string | null => {
  const match = String(value || "").match(/\bA\d{3,4}C?\b/i);
  return match ? match[0].toUpperCase() : null;
};

const extractDiameter = (value: string): string | null => {
  const match = String(value || "").match(/\b(\d{1,3})\s*(?:мм|mm)\b/i);
  return match?.[1] ?? null;
};

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

const scoreCatalogCandidate = (input: ParsedForemanAiItem, item: RikCatalogItem): number => {
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

const buildCatalogQueries = (input: ParsedForemanAiItem): string[] => {
  const queries = new Set<string>();
  const fullQuery = [input.name, input.specs].filter(Boolean).join(" ").trim();
  const nameOnlyQuery = input.name.trim();

  addCatalogQuery(queries, fullQuery);
  addCatalogQuery(queries, nameOnlyQuery);

  const fullDiameterVariant = fullQuery.replace(/\b(\d{1,3})\s*(?:мм|mm)\b/gi, "Ø$1");
  const nameDiameterVariant = nameOnlyQuery.replace(/\b(\d{1,3})\s*(?:мм|mm)\b/gi, "Ø$1");
  addCatalogQuery(queries, fullDiameterVariant);
  addCatalogQuery(queries, nameDiameterVariant);

  const rebarMark = extractRebarMark(nameOnlyQuery);
  const diameter = extractDiameter(nameOnlyQuery);
  if (/арматур/i.test(nameOnlyQuery) && rebarMark) {
    addCatalogQuery(queries, `Арматура ${rebarMark}`);
    if (diameter) {
      addCatalogQuery(queries, `Арматура ${rebarMark} Ø${diameter}`);
    }
  }

  return Array.from(queries);
};

const hasSpecificCatalogResolveSignal = (input: ParsedForemanAiItem): boolean => {
  const nameTokens = splitSearchTokens(input.name);
  const specTokens = splitSearchTokens(input.specs ?? "");
  const combinedText = `${input.name} ${input.specs ?? ""}`;
  return (
    nameTokens.length >= 2
    || specTokens.length > 0
    || /\d/.test(combinedText)
  );
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

const parseForemanAiResponse = (text: string): ParsedForemanAiQuickResult => {
  let parsed: RawForemanAiResponse;
  try {
    parsed = JSON.parse(cleanJsonText(text)) as RawForemanAiResponse;
  } catch {
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

type CatalogResolution = {
  resolved: ForemanAiQuickItem | null;
  options: CandidateOption[];
  clarifyQuestions: ClarifyQuestion[];
};

type CatalogResolvedBase = {
  rik_code: string;
  name: string;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
  matchedBy?: string | null;
};

export type ForemanAiResolvedInputItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
};

type ForemanQuickLocalAssistParams = {
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

const buildResolvedQuickItem = (
  input: ParsedForemanAiItem,
  base: CatalogResolvedBase,
  resolvedQty: number,
  resolvedUnit: string,
): ForemanAiQuickItem => ({
  rik_code: base.rik_code,
  name: base.name,
  qty: resolvedQty,
  unit: normalizeResolveUnitCanonical(resolvedUnit),
  kind: base.kind,
  specs: input.specs ?? base.specs ?? null,
});

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

const buildPackagingClarifyQuestion = (
  input: ParsedForemanAiItem,
  base: CatalogResolvedBase,
): ClarifyQuestion => ({
  id: `packaging:${base.rik_code}`,
  prompt:
    `Уточните упаковку для "${base.name}": ` +
    `единица "${input.unit}" не настроена для каталожной единицы "${base.unit}".`,
});

const resolveCatalogBySynonymPrimary = async (
  input: ParsedForemanAiItem,
): Promise<CatalogResolvedBase | null> => {
  try {
    const match = await resolveCatalogSynonymMatchViaRpc({
      terms: buildCatalogQueries(input),
      kind: input.kind,
    });
    if (!match) return null;
    if (
      !hasSpecificCatalogResolveSignal(input) &&
      ["rik_alias_exact", "name_human_exact", "name_human_ru_exact"].includes(match.matchedBy ?? "")
    ) {
      logForemanAi({
        phase: "synonym_generic_blocked",
        sourceName: input.name,
        kind: input.kind,
        rikCode: match.rikCode,
        matchedBy: match.matchedBy,
      });
      return null;
    }
    if (!hasMeaningfulTokenOverlap([input.name, input.specs].filter(Boolean).join(" "), match.nameHuman)) {
      logForemanAi({
        phase: "synonym_overlap_blocked",
        sourceName: input.name,
        kind: input.kind,
        rikCode: match.rikCode,
        matchedBy: match.matchedBy,
        matchedName: match.nameHuman,
      });
      return null;
    }
    logForemanAi({
      phase: "synonym_primary_hit",
      sourceName: input.name,
      rikCode: match.rikCode,
      matchedBy: match.matchedBy,
      confidence: match.confidence,
    });
    return {
      rik_code: match.rikCode,
      name: normalizeName(match.nameHuman || input.name),
      unit: normalizeResolveUnitCanonical(match.uomCode ?? input.unit),
      kind: match.kind ?? input.kind,
      specs: input.specs ?? null,
      matchedBy: match.matchedBy,
    };
  } catch (error) {
    logForemanAi({
      phase: "synonym_resolve_failed",
      sourceName: input.name,
      kind: input.kind,
      errorMessage: toErrorMessage(error),
      fallbackUsed: true,
    });
    return null;
  }
};

const applyPackagingResolution = async (
  input: ParsedForemanAiItem,
  base: CatalogResolvedBase,
): Promise<{ resolved: ForemanAiQuickItem | null; clarifyQuestions: ClarifyQuestion[] }> => {
  const requestedUnit = normalizeResolveUnitCanonical(input.unit);
  const catalogUnit = normalizeResolveUnitCanonical(base.unit);
  if (!requestedUnit || !catalogUnit || requestedUnit === catalogUnit) {
    return {
      resolved: buildResolvedQuickItem(input, base, input.qty, catalogUnit || base.unit),
      clarifyQuestions: [],
    };
  }

  try {
    const packaging = await resolveCatalogPackagingViaRpc({
      rikCode: base.rik_code,
      packageName: requestedUnit,
      qty: input.qty,
    });
    if (
      !packaging ||
      packaging.clarifyRequired ||
      packaging.resolvedQty == null ||
      !String(packaging.resolvedUnit || "").trim()
    ) {
      logForemanAi({
        phase: "packaging_clarify_required",
        rikCode: base.rik_code,
        requestedUnit,
        catalogUnit,
        matchedBy: packaging?.matchedBy ?? null,
      });
      return {
        resolved: null,
        clarifyQuestions: [buildPackagingClarifyQuestion(input, base)],
      };
    }

    logForemanAi({
      phase: "packaging_resolved",
      rikCode: base.rik_code,
      requestedUnit,
      resolvedUnit: packaging.resolvedUnit,
      packageMultiplier: packaging.packageMultiplier ?? null,
      conversionApplied: packaging.conversionApplied,
      matchedBy: packaging.matchedBy ?? null,
    });
    return {
      resolved: buildResolvedQuickItem(input, base, packaging.resolvedQty, packaging.resolvedUnit),
      clarifyQuestions: [],
    };
  } catch (error) {
    logForemanAi({
      phase: "packaging_resolve_failed",
      rikCode: base.rik_code,
      requestedUnit,
      catalogUnit,
      errorMessage: toErrorMessage(error),
      fallbackUsed: true,
    });
    return {
      resolved: null,
      clarifyQuestions: [buildPackagingClarifyQuestion(input, base)],
    };
  }
};

const resolveForemanCatalogItem = async (input: ParsedForemanAiItem): Promise<CatalogResolution> => {
  const synonymPrimary = await resolveCatalogBySynonymPrimary(input);
  if (synonymPrimary) {
    const packagingResult = await applyPackagingResolution(input, synonymPrimary);
    return {
      resolved: packagingResult.resolved,
      options: [],
      clarifyQuestions: packagingResult.clarifyQuestions,
    };
  }

  const queries = buildCatalogQueries(input);
  let candidates: RikCatalogItem[] = [];

  for (const query of queries) {
    try {
      const found = await rikQuickSearch(query, 10);
      if (Array.isArray(found) && found.length > 0) {
        candidates = [...candidates, ...found];
      }
    } catch (error) {
      logForemanAi({
        phase: "catalog_search_failed",
        query,
        errorMessage: toErrorMessage(error),
      });
    }
  }

  const uniqueCandidates = Array.from(
    new Map(
      candidates
        .filter((item) => String(item.rik_code ?? "").trim())
        .map((item) => [String(item.rik_code ?? "").trim(), item]),
    ).values(),
  );

  let best: { item: RikCatalogItem; score: number } | null = null;
  const ranked: CandidateOption[] = [];
  for (const candidate of uniqueCandidates) {
    const score = scoreCatalogCandidate(input, candidate);
    if (score >= CANDIDATE_SCORE_THRESHOLD) {
      ranked.push({
        rik_code: String(candidate.rik_code ?? "").trim(),
        name: normalizeName(candidate.name_human || input.name),
        unit: normalizeResolveUnitCanonical(candidate.uom_code ?? input.unit),
        kind: input.kind,
        score,
      });
    }
    if (!best || score > best.score) {
      best = { item: candidate, score };
    }
  }

  ranked.sort((left, right) => right.score - left.score);
  const options = ranked.slice(0, 5);

  if (!best || best.score < RESOLVE_SCORE_THRESHOLD) {
    logForemanAi({
      phase: "catalog_unresolved",
      sourceName: input.name,
      kind: input.kind,
      bestScore: best?.score ?? null,
      candidateCount: uniqueCandidates.length,
    });
    return {
      resolved: null,
      options,
      clarifyQuestions: [],
    };
  }

  if (!hasSpecificCatalogResolveSignal(input)) {
    logForemanAi({
      phase: "catalog_fallback_generic_blocked",
      sourceName: input.name,
      kind: input.kind,
      bestScore: best.score,
      candidateCount: options.length,
    });
    return {
      resolved: null,
      options,
      clarifyQuestions: [],
    };
  }

  const packagingResult = await applyPackagingResolution(input, {
    rik_code: String(best.item.rik_code ?? "").trim(),
    name: normalizeName(best.item.name_human || input.name),
    unit: normalizeResolveUnitCanonical(best.item.uom_code ?? input.unit),
    kind: input.kind,
    specs: input.specs ?? null,
    matchedBy: "catalog_search_fallback",
  });
  return {
    resolved: packagingResult.resolved,
    options,
    clarifyQuestions: packagingResult.clarifyQuestions,
  };
};

const resolveCatalogItems = async (items: ParsedForemanAiItem[]) => {
  const resolutions = await Promise.all(items.map((item) => resolveForemanCatalogItem(item)));
  const accepted: ForemanAiQuickItem[] = [];
  const candidateGroups: CandidateOptionGroup[] = [];
  const clarifyQuestions: ClarifyQuestion[] = [];
  const unresolvedNames: string[] = [];

  items.forEach((item, index) => {
    const resolution = resolutions[index];
    if (resolution.resolved) {
      accepted.push(resolution.resolved);
      return;
    }

    if (resolution.options.length > 0) {
      candidateGroups.push({
        sourceName: item.name,
        requestedQty: item.qty,
        requestedUnit: item.unit,
        kind: item.kind,
        specs: item.specs ?? null,
        options: resolution.options,
      });
      return;
    }

    if (resolution.clarifyQuestions.length > 0) {
      clarifyQuestions.push(...resolution.clarifyQuestions);
      return;
    }

    unresolvedNames.push(item.name);
  });

  return {
    items: accepted,
    candidateGroups,
    clarifyQuestions,
    unresolvedNames,
  };
};

const finalizeResolvedQuickResult = async (
  parsed: ParsedForemanAiQuickResult,
  sourcePath: "backend",
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

  const resolved = await resolveCatalogItems(parsed.items);
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
      message: "РЈС‚РѕС‡РЅРёС‚Рµ СѓРїР°РєРѕРІРєСѓ РёР»Рё РµРґРёРЅРёС†Сѓ РёР·РјРµСЂРµРЅРёСЏ РґР»СЏ РЅРµРѕРґРЅРѕР·РЅР°С‡РЅС‹С… РїРѕР·РёС†РёР№.",
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
      message: "РЈС‚РѕС‡РЅРёС‚Рµ СѓРїР°РєРѕРІРєСѓ РёР»Рё РµРґРёРЅРёС†Сѓ РёР·РјРµСЂРµРЅРёСЏ РґР»СЏ РЅРµРѕРґРЅРѕР·РЅР°С‡РЅС‹С… РїРѕР·РёС†РёР№.",
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

  const resolved = await resolveCatalogItems(parsed.items);
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
  return await finalizeResolvedQuickResultV2(parsed, "backend");
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
