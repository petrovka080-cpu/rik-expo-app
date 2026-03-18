import Constants from "expo-constants";

type ExpoExtraConfig = {
  geminiApiKey?: string;
  geminiModel?: string;
};

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

export type ForemanAiQuickItem = {
  rik_code: string;
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
};

export type ForemanAiQuickResult = {
  action: ForemanAiAction;
  items: ForemanAiQuickItem[];
  message: string;
};

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
  const extra = (Constants.expoConfig?.extra || {}) as ExpoExtraConfig;
  const apiKey = String(extra.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || "").trim();
  const model = String(extra.geminiModel || process.env.EXPO_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL).trim();
  return { apiKey, model: model || DEFAULT_MODEL };
}

function extractGeminiText(payload: any): string {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

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

function nextRikCategory(kind: ForemanAiKind): "MAT" | "WRK" | "SVC" {
  if (kind === "work") return "WRK";
  if (kind === "service") return "SVC";
  return "MAT";
}

let generatedCodeCounter = 0;

function generateRikCode(kind: ForemanAiKind): string {
  generatedCodeCounter += 1;
  const seq = String(generatedCodeCounter).padStart(4, "0");
  const timePart = String(Date.now() % 10000).padStart(4, "0");
  return `RIK-${nextRikCategory(kind)}-${timePart}${seq}`;
}

function normalizeName(rawName?: string | null): string {
  const name = String(rawName || "").trim();
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function normalizeForemanAiItem(rawItem: any): ForemanAiQuickItem | null {
  const qty = Number(rawItem?.qty);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const name = normalizeName(rawItem?.name);
  if (!name) return null;

  const kind = normalizeKind(rawItem?.kind, name);
  const unit = normalizeUnit(rawItem?.unit);
  const specs = String(rawItem?.specs || "").trim() || null;
  const rikCode = String(rawItem?.rik_code || "").trim() || generateRikCode(kind);

  return {
    rik_code: rikCode,
    name,
    qty,
    unit,
    kind,
    specs,
  };
}

function parseForemanAiResponse(text: string): ForemanAiQuickResult {
  let parsed: RawForemanAiResponse;
  try {
    parsed = JSON.parse(cleanJsonText(text)) as RawForemanAiResponse;
  } catch {
    throw new Error("AI вернул ответ не в JSON формате.");
  }

  const normalizedItems = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => normalizeForemanAiItem(item))
        .filter((item): item is ForemanAiQuickItem => Boolean(item))
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

  const parsed: Array<LocalForemanItem | null> = base
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

function mapLocalItems(items: LocalForemanItem[]): ForemanAiQuickItem[] {
  return items
    .filter((item) => Number.isFinite(item.qty) && item.qty > 0)
    .map((item) => ({
      rik_code: generateRikCode(item.kind),
      name: item.name,
      qty: item.qty,
      unit: normalizeUnit(item.unit),
      kind: item.kind,
      specs: item.specs ?? null,
    }));
}

function resolveLocalForemanQuickRequest(prompt: string): ForemanAiQuickResult {
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

export function isForemanQuickRequestConfigured(): boolean {
  return getGeminiConfig().apiKey.length > 0;
}

export async function sendForemanQuickRequestPrompt(prompt: string): Promise<ForemanAiQuickResult> {
  const message = String(prompt || "").trim();
  if (!message) throw new Error("Опишите, что нужно добавить в заявку.");

  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw new Error("Для AI-заявки не настроен Gemini API key.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: FOREMAN_AGENT_SYSTEM_PROMPT }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage = String(payload?.error?.message || "").trim();
      throw new Error(errorMessage || `Gemini request failed (${response.status}).`);
    }

    const text = extractGeminiText(payload);
    if (!text) {
      throw new Error("AI не вернул содержательный ответ.");
    }

    return parseForemanAiResponse(text);
  } catch (error) {
    const messageText =
      error instanceof Error && error.message
        ? error.message
        : "Не удалось сформировать AI-заявку.";
    throw new Error(messageText);
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveForemanQuickRequest(prompt: string): Promise<ForemanAiQuickResult> {
  if (isForemanQuickRequestConfigured()) {
    return sendForemanQuickRequestPrompt(prompt);
  }
  return resolveLocalForemanQuickRequest(prompt);
}
