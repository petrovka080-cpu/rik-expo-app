import {
  isAiBackendAvailable,
  requestAiGeneratedText,
} from "../../lib/ai/aiRepository";
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

export type AiDraftOutcome =
  | { type: "resolved_items"; items: ForemanAiQuickItem[]; message: string }
  | { type: "candidate_options"; options: CandidateOptionGroup[]; message: string }
  | { type: "clarify_required"; questions: ClarifyQuestion[]; message: string }
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

const FOREMAN_AGENT_SYSTEM_PROMPT = `
Ты специализированный AI-агент прораба.
Из свободного текста сформируй только строительные позиции для заявки директору.

Верни только JSON:
{
  "action": "create_request" | "clarify",
  "items": [
    {
      "name": "Арматура A500C 12 мм",
      "qty": 120,
      "unit": "м",
      "kind": "material" | "work" | "service",
      "specs": "Доп. уточнение"
    }
  ],
  "message": "Краткий итог"
}

Правила:
1) Если нельзя уверенно определить хотя бы одну позицию или количество, верни action="clarify".
2) Не придумывай новые позиции.
3) Нормализуй единицы к: шт, м, м2, м3, кг, т, л, мешок, комплект.
4) material = материалы, work = работы, service = доставка/аренда/услуги.
5) Ответ без markdown и без текста вне JSON.
`;

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
  const left = normalizeUnit(expectedUnit);
  const right = normalizeUnit(catalogUnit ?? "");
  return !left || !right || left === right;
};

const scoreCatalogCandidate = (input: ParsedForemanAiItem, item: RikCatalogItem): number => {
  if (!isCatalogKindCompatible(input.kind, item)) return -1000;
  if (!isUnitCompatible(input.unit, item.uom_code ?? null)) return -100;

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
  const queries = [
    [input.name, input.specs].filter(Boolean).join(" ").trim(),
    input.name.trim(),
  ];
  return Array.from(new Set(queries.filter((value) => value.length >= 2)));
};

const normalizeForemanAiItem = (rawItem: unknown): ParsedForemanAiItem | null => {
  const row = asRecord(rawItem);
  if (!row) return null;

  const qty = Number(row.qty);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const name = normalizeName(typeof row.name === "string" ? row.name : null);
  if (!name) return null;

  const kind = normalizeKind(typeof row.kind === "string" ? row.kind : null, name);
  const unit = normalizeUnit(typeof row.unit === "string" ? row.unit : null);
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
};

const resolveForemanCatalogItem = async (input: ParsedForemanAiItem): Promise<CatalogResolution> => {
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
        errorMessage: error instanceof Error ? error.message : String(error),
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
        unit: normalizeUnit(candidate.uom_code ?? input.unit),
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
    };
  }

  return {
    resolved: {
      rik_code: String(best.item.rik_code ?? "").trim(),
      name: normalizeName(best.item.name_human || input.name),
      qty: input.qty,
      unit: normalizeUnit(best.item.uom_code ?? input.unit),
      kind: input.kind,
      specs: input.specs ?? null,
    },
    options,
  };
};

const resolveCatalogItems = async (items: ParsedForemanAiItem[]) => {
  const resolutions = await Promise.all(items.map((item) => resolveForemanCatalogItem(item)));
  const accepted: ForemanAiQuickItem[] = [];
  const candidateGroups: CandidateOptionGroup[] = [];
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

    unresolvedNames.push(item.name);
  });

  return {
    items: accepted,
    candidateGroups,
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
    unresolvedItemCount: resolved.unresolvedNames.length,
  });

  if (resolved.items.length === parsed.items.length) {
    return {
      type: "resolved_items",
      items: resolved.items,
      message: `Найдено в каталоге позиций: ${resolved.items.length}.`,
    };
  }

  if (resolved.candidateGroups.length > 0) {
    const suffix = resolved.items.length > 0 ? ` Точно сопоставлено: ${resolved.items.length}.` : "";
    return {
      type: "candidate_options",
      options: resolved.candidateGroups,
      message: `Нужно выбрать позиции из каталога для ${resolved.candidateGroups.length} пунктов.${suffix}`,
    };
  }

  if (resolved.unresolvedNames.length > 0) {
    const unresolvedLabel = resolved.unresolvedNames.join(", ");
    const message = `Не удалось сопоставить с каталогом: ${unresolvedLabel}. Уточните названия или добавьте позиции вручную через каталог.`;
    return {
      type: "clarify_required",
      questions: buildClarifyQuestions(message, "catalog_clarify"),
      message,
    };
  }

  return {
    type: "clarify_required",
    questions: buildClarifyQuestions("Уточните позиции или добавьте их вручную через каталог.", "manual_add"),
    message: "Уточните позиции или добавьте их вручную через каталог.",
  };
};

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
  return await finalizeResolvedQuickResult(parsed, "backend");
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
