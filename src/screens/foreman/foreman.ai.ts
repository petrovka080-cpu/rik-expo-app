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

type LocalForemanItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
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

export type ForemanAiQuickResult = {
  action: ForemanAiAction;
  items: ForemanAiQuickItem[];
  message: string;
};

type ParsedForemanAiQuickResult = {
  action: ForemanAiAction;
  items: ParsedForemanAiItem[];
  message: string;
};

type RikCatalogItem = Awaited<ReturnType<typeof rikQuickSearch>>[number];

const DEFAULT_MODEL = "gemini-2.5-flash";

const FOREMAN_AGENT_SYSTEM_PROMPT = `
Ты специализированный AI-агент ПРОРАБ.
Твоя задача: из свободного текста или диктовки сформировать только строительные позиции для заявки директору.
Работай как опытный прораб: нормализуй наименования, единицы, количество и тип позиции.

Возвращай только JSON:
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
  "message": "Краткий итог для прораба"
}

Правила:
1) Если нет количества хотя бы по одной позиции, ставь action="clarify".
2) Не выдумывай лишние позиции.
3) Нормализуй единицы к: шт, м, м2, м3, кг, т, л, мешок, комплект.
4) kind:
   - material: материалы
   - work: строительные работы
   - service: доставка, аренда техники, услуги
5) name пиши кратко и технически корректно.
6) Ответ без markdown и без пояснений вне JSON.
`;

const LOCAL_UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s*(шт|штук|штука|мешок|мешка|мешков|м2|м²|м3|м³|м|метр(?:а|ов)?|кг|килограмм(?:а|ов)?|т|тонн(?:а|ы)?|л|литр(?:а|ов)?|комплект(?:а|ов)?)/i;
const LOCAL_FILLER_RE =
  /\b(мне|нужен|нужна|нужны|нужно|пожалуйста|срочно|надо|для|сделай|создай|оформи|добавь|в|заявку|черновик|заказ|предложение|закупку|на|рынке|маркет|найди|ищи|цена|стоит|сравни|поставщиков?)\b/gi;
const LOCAL_SPLIT_RE = /\r?\n|[;,]+|\s+\+\s+|\s+и\s+/gi;

function getGeminiConfig(): { apiKey: string; model: string } {
  const model = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return { apiKey: "", model: model || DEFAULT_MODEL };
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const logForemanAi = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[foreman.ai]", payload);
};

function cleanJsonText(text: string): string {
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
}

function normalizeUnit(rawUnit?: string | null): string {
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
}

function normalizeKind(kind?: string | null, name?: string | null): ForemanAiKind {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  if (normalizedKind === "work") return "work";
  if (normalizedKind === "service") return "service";
  if (normalizedKind === "material") return "material";

  const text = String(name || "").trim().toLowerCase();
  if (/(доставк|аренд|кран|экскаватор|услуг|техник|логист|перевоз)/.test(text)) return "service";
  if (/(монтаж|демонтаж|штукатур|кладк|бетонир|сварк|работ)/.test(text)) return "work";
  return "material";
}

function normalizeName(rawName?: string | null): string {
  const name = String(rawName || "").trim();
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[.,:;()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSearchTokens(value: unknown): string[] {
  return normalizeSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function resolveCatalogKind(item: RikCatalogItem): ForemanAiKind | "unknown" {
  const rawKind = String(item.kind ?? "").trim().toLowerCase();
  if (rawKind === "material" || rawKind === "materials" || rawKind === "материал" || rawKind === "материалы") {
    return "material";
  }
  if (rawKind === "work" || rawKind === "works" || rawKind === "работа" || rawKind === "работы") {
    return "work";
  }
  if (rawKind === "service" || rawKind === "services" || rawKind === "услуга" || rawKind === "услуги") {
    return "service";
  }

  const code = String(item.rik_code ?? "").trim().toUpperCase();
  if (code.startsWith("MAT-") || code.startsWith("TOOL-") || code.startsWith("KIT-")) return "material";
  if (code.startsWith("WT-") || code.startsWith("WORK-")) return "work";
  if (code.startsWith("SRV-") || code.startsWith("SERV-")) return "service";
  return "unknown";
}

function isCatalogKindCompatible(expected: ForemanAiKind, item: RikCatalogItem): boolean {
  const catalogKind = resolveCatalogKind(item);
  return catalogKind === "unknown" || catalogKind === expected;
}

function isUnitCompatible(expectedUnit: string, catalogUnit?: string | null): boolean {
  const left = normalizeUnit(expectedUnit);
  const right = normalizeUnit(catalogUnit ?? "");
  return !left || !right || left === right;
}

function scoreCatalogCandidate(input: ParsedForemanAiItem, item: RikCatalogItem): number {
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

  score += 15;
  return score;
}

function buildCatalogQueries(input: ParsedForemanAiItem): string[] {
  const queries = [
    [input.name, input.specs].filter(Boolean).join(" ").trim(),
    input.name.trim(),
  ];
  return Array.from(new Set(queries.filter((value) => value.length >= 2)));
}

async function resolveForemanCatalogItem(input: ParsedForemanAiItem): Promise<ForemanAiQuickItem | null> {
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
  for (const candidate of uniqueCandidates) {
    const score = scoreCatalogCandidate(input, candidate);
    if (!best || score > best.score) {
      best = { item: candidate, score };
    }
  }

  if (!best || best.score < 120) {
    logForemanAi({
      phase: "catalog_unresolved",
      sourceName: input.name,
      kind: input.kind,
      bestScore: best?.score ?? null,
      candidateCount: uniqueCandidates.length,
    });
    return null;
  }

  return {
    rik_code: String(best.item.rik_code ?? "").trim(),
    name: normalizeName(best.item.name_human || input.name),
    qty: input.qty,
    unit: normalizeUnit(best.item.uom_code ?? input.unit),
    kind: input.kind,
    specs: input.specs ?? null,
  };
}

async function resolveCatalogItems(items: ParsedForemanAiItem[]): Promise<{
  items: ForemanAiQuickItem[];
  unresolvedNames: string[];
}> {
  const resolved = await Promise.all(items.map((item) => resolveForemanCatalogItem(item)));
  const accepted: ForemanAiQuickItem[] = [];
  const unresolvedNames: string[] = [];

  items.forEach((item, index) => {
    const resolvedItem = resolved[index];
    if (resolvedItem) accepted.push(resolvedItem);
    else unresolvedNames.push(item.name);
  });

  return {
    items: accepted,
    unresolvedNames,
  };
}

function normalizeForemanAiItem(rawItem: unknown): ParsedForemanAiItem | null {
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
}

function parseForemanAiResponse(text: string): ParsedForemanAiQuickResult {
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
}

function cleanupLocalName(value: string): string {
  const cleaned = String(value || "")
    .replace(LOCAL_UNIT_RE, "")
    .replace(LOCAL_FILLER_RE, " ")
    .replace(/[.,:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeName(cleaned);
}

function parseLocalForemanItems(message: string): LocalForemanItem[] {
  const base = String(message || "")
    .replace(/\r/g, "\n")
    .replace(LOCAL_SPLIT_RE, "\n");

  const parsed: (LocalForemanItem | null)[] = base
    .split("\n")
    .map((chunk) => {
      const raw = String(chunk || "").trim();
      if (!raw) return null;

      const unitMatch = raw.match(LOCAL_UNIT_RE);
      const qty = unitMatch ? Number(String(unitMatch[1]).replace(",", ".")) : 0;
      const unit = normalizeUnit(unitMatch?.[2] ?? "шт");
      const name = cleanupLocalName(raw);
      if (!name) return null;

      return {
        name,
        qty: Number.isFinite(qty) ? qty : 0,
        unit,
        kind: normalizeKind(null, name),
        specs: null,
      } satisfies LocalForemanItem;
    });

  return parsed.filter((item): item is LocalForemanItem => Boolean(item));
}

function buildClarifyMessage(items: LocalForemanItem[]): string {
  const missing = items.filter((item) => !Number.isFinite(item.qty) || item.qty <= 0);
  if (!missing.length) {
    return "Нужно уточнить позиции или количество.";
  }
  const names = missing.map((item) => item.name).filter(Boolean);
  if (!names.length) {
    return 'Не понял позиции. Напишите, например: "цемент М400 50 мешков, кирпич 2000 шт".';
  }
  return `Нужно уточнить количество для: ${names.join(", ")}. Напишите, например: "цемент М400 50 мешков, ${names[0].toLowerCase()} 200 шт".`;
}

function mapLocalItems(items: LocalForemanItem[]): ParsedForemanAiItem[] {
  return items
    .filter((item) => Number.isFinite(item.qty) && item.qty > 0)
    .map((item) => ({
      name: item.name,
      qty: item.qty,
      unit: normalizeUnit(item.unit),
      kind: item.kind,
      specs: item.specs ?? null,
    }));
}

function resolveLocalForemanQuickRequest(prompt: string): ParsedForemanAiQuickResult {
  const parsedItems = parseLocalForemanItems(prompt);
  if (!parsedItems.length) {
    return {
      action: "clarify",
      items: [],
      message: 'Не понял позиции. Напишите, например: "цемент М400 50 мешков, кирпич 2000 шт".',
    };
  }

  if (parsedItems.some((item) => !Number.isFinite(item.qty) || item.qty <= 0)) {
    return {
      action: "clarify",
      items: [],
      message: buildClarifyMessage(parsedItems),
    };
  }

  const normalizedItems = mapLocalItems(parsedItems);
  return {
    action: normalizedItems.length ? "create_request" : "clarify",
    items: normalizedItems,
    message: normalizedItems.length
      ? `Локально распознано позиций: ${normalizedItems.length}.`
      : "Не удалось распознать позиции для черновика.",
  };
}

async function finalizeResolvedQuickResult(
  parsed: ParsedForemanAiQuickResult,
  sourcePath: "backend" | "local",
): Promise<ForemanAiQuickResult> {
  if (parsed.action === "clarify" || parsed.items.length === 0) {
    return {
      action: "clarify",
      items: [],
      message: parsed.message,
    };
  }

  const resolved = await resolveCatalogItems(parsed.items);
  logForemanAi({
    phase: "catalog_resolved",
    sourcePath,
    parsedItemCount: parsed.items.length,
    resolvedItemCount: resolved.items.length,
    unresolvedItemCount: resolved.unresolvedNames.length,
  });

  if (resolved.unresolvedNames.length > 0) {
    const unresolvedLabel = resolved.unresolvedNames.join(", ");
    const resolvedLabel = resolved.items.length > 0
      ? ` Найдено в каталоге: ${resolved.items.length} из ${parsed.items.length}.`
      : "";
    return {
      action: "clarify",
      items: [],
      message: `Не удалось сопоставить с каталогом: ${unresolvedLabel}.${resolvedLabel} В черновик попадают только найденные позиции каталога. Уточните названия или добавьте позиции через каталог вручную.`,
    };
  }

  if (!resolved.items.length) {
    return {
      action: "clarify",
      items: [],
      message: "Не удалось найти позиции в каталоге. В черновик попадают только найденные позиции каталога. Уточните формулировки или добавьте их через каталог вручную.",
    };
  }

  return {
    action: "create_request",
    items: resolved.items,
    message: `Найдено в каталоге позиций: ${resolved.items.length}.`,
  };
}

export function isForemanQuickRequestConfigured(): boolean {
  return isAiBackendAvailable();
}

export async function sendForemanQuickRequestPrompt(prompt: string): Promise<ForemanAiQuickResult> {
  const message = String(prompt || "").trim();
  if (!message) throw new Error("Опишите, что нужно добавить в заявку.");

  const { model } = getGeminiConfig();
  if (!isAiBackendAvailable()) {
    throw new Error("AI service is not configured.");
  }

  try {
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
  } catch (error) {
    const messageText =
      error instanceof Error && error.message
        ? error.message
        : "Не удалось сформировать AI-заявку.";
    throw new Error(messageText);
  }
}

export async function resolveForemanQuickRequest(prompt: string): Promise<ForemanAiQuickResult> {
  if (isForemanQuickRequestConfigured()) {
    try {
      return await sendForemanQuickRequestPrompt(prompt);
    } catch (error) {
      const fallback = resolveLocalForemanQuickRequest(prompt);
      const resolvedFallback = await finalizeResolvedQuickResult(fallback, "local");
      logForemanAi({
        phase: "fallback_used",
        fallbackUsed: true,
        errorCategory: "backend_failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        parsedItemCount: fallback.items.length,
        fallbackAction: fallback.action,
        resolvedItemCount: resolvedFallback.items.length,
      });
      return {
        ...resolvedFallback,
        message:
          resolvedFallback.action === "clarify"
            ? resolvedFallback.message
            : `${resolvedFallback.message} AI сервис временно недоступен, использован локальный разбор с проверкой по каталогу.`,
      };
    }
  }

  return await finalizeResolvedQuickResult(resolveLocalForemanQuickRequest(prompt), "local");
}
