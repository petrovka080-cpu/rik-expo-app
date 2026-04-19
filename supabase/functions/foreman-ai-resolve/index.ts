/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildForemanAiPromptCacheKey,
  createForemanAiPromptCache,
} from "./cache.ts";

type ForemanAiKind = "material" | "work" | "service";

type ParsedForemanAiItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
};

type RikCatalogItem = {
  rik_code?: string | null;
  name_human?: string | null;
  name_human_ru?: string | null;
  uom?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};

type ForemanAiQuickItem = ParsedForemanAiItem & {
  rik_code: string;
};

type CandidateOption = {
  rik_code: string;
  name: string;
  unit: string;
  kind: ForemanAiKind;
  score: number;
};

type ClarifyQuestion = {
  id: string;
  prompt: string;
};

type CandidateOptionGroup = {
  sourceName: string;
  requestedQty: number;
  requestedUnit: string;
  kind: ForemanAiKind;
  specs?: string | null;
  options: CandidateOption[];
};

type CatalogResolvedBase = {
  rik_code: string;
  name: string;
  unit: string;
  kind: ForemanAiKind;
  specs?: string | null;
  matchedBy?: string | null;
};

type CatalogResolution = {
  resolved: ForemanAiQuickItem | null;
  options: CandidateOption[];
  clarifyQuestions: ClarifyQuestion[];
};

type ResolvePayload = {
  items: ForemanAiQuickItem[];
  candidateGroups: CandidateOptionGroup[];
  clarifyQuestions: ClarifyQuestion[];
  unresolvedNames: string[];
  meta: {
    source: "foreman-ai-resolve";
    cacheStatus: "hit" | "miss";
    sourceItemCount: number;
    resolveItemCount: number;
    duplicateItemCount: number;
    cappedItemCount: number;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESOLVE_SCORE_THRESHOLD = 120;
const CANDIDATE_SCORE_THRESHOLD = 20;
const CATALOG_RESOLVE_CONCURRENCY_LIMIT = 5;
const DEFAULT_MAX_ITEMS = 40;
const CACHE_TTL_MS = 120_000;
const CACHE_MAX_ENTRIES = 200;

const PACKAGING_UNITS = new Set([
  "РєРѕСЂРѕР±РєР°",
  "РїР°С‡РєР°",
  "РјРµС€РѕРє",
  "СЂСѓР»РѕРЅ",
  "СѓРїР°РєРѕРІРєР°",
  "РєРѕРјРїР»РµРєС‚",
  "\u043b\u0438\u0441\u0442",
  "\u0431\u0430\u043d\u043a\u0430",
  "\u043a\u0430\u043d\u0438\u0441\u0442\u0440\u0430",
  "\u0431\u0443\u0445\u0442\u0430",
]);

const promptCache = createForemanAiPromptCache<ResolvePayload>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toText = (value: unknown): string => String(value ?? "").trim();

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const logEdge = (level: "info" | "warn" | "error", message: string, payload?: Record<string, unknown>) => {
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(`[foreman-ai-resolve] ${message}`, payload ?? {});
};

const withCacheStatus = (payload: ResolvePayload, cacheStatus: "hit" | "miss"): ResolvePayload => ({
  ...payload,
  meta: {
    ...payload.meta,
    cacheStatus,
  },
});

const readPersistentPromptCache = async (
  admin: ReturnType<typeof createClient> | null,
  cacheKey: string,
): Promise<ResolvePayload | null> => {
  if (!admin) return null;
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("foreman_ai_prompt_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .gt("expires_at", nowIso)
      .maybeSingle();
    if (error) throw error;
    const row = asRecord(data);
    const payload = asRecord(row?.payload);
    if (!payload) return null;
    return withCacheStatus(payload as ResolvePayload, "hit");
  } catch (error) {
    logEdge("warn", "prompt_cache_read_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const writePersistentPromptCache = async (
  admin: ReturnType<typeof createClient> | null,
  cacheKey: string,
  payload: ResolvePayload,
) => {
  if (!admin) return;
  try {
    const nowMs = Date.now();
    const expiresAt = new Date(nowMs + CACHE_TTL_MS).toISOString();
    await admin
      .from("foreman_ai_prompt_cache")
      .upsert(
        {
          cache_key: cacheKey,
          payload: withCacheStatus(payload, "miss"),
          expires_at: expiresAt,
          updated_at: new Date(nowMs).toISOString(),
        },
        { onConflict: "cache_key" },
      )
      .throwOnError();
  } catch (error) {
    logEdge("warn", "prompt_cache_write_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const normalizeUnit = (rawUnit?: string | null): string => {
  const unit = String(rawUnit || "").trim().toLowerCase();
  if (!unit) return "С€С‚";
  if (["С€С‚", "С€С‚СѓРєР°", "С€С‚СѓРє", "pcs", "pc"].includes(unit)) return "С€С‚";
  if (["Рј", "РјРµС‚СЂ", "РјРµС‚СЂРѕРІ", "m"].includes(unit)) return "Рј";
  if (["Рј2", "РјВІ", "РєРІ.Рј", "РєРІРј", "sqm", "m2"].includes(unit)) return "Рј2";
  if (["Рј3", "РјВі", "РєСѓР±", "РєСѓР±.Рј", "РєСѓР±РѕРјРµС‚СЂ", "m3"].includes(unit)) return "Рј3";
  if (["РєРі", "РєРёР»РѕРіСЂР°РјРј", "kg"].includes(unit)) return "РєРі";
  if (["С‚", "С‚РѕРЅРЅР°", "С‚РѕРЅРЅ", "ton"].includes(unit)) return "С‚";
  if (["Р»", "Р»РёС‚СЂ", "Р»РёС‚СЂРѕРІ", "l"].includes(unit)) return "Р»";
  if (["РјРµС€", "РјРµС€РѕРє", "РјРµС€РєРѕРІ", "bag"].includes(unit)) return "РјРµС€РѕРє";
  if (["РєРѕРјРїР»РµРєС‚", "РєРѕРјРїР»", "set"].includes(unit)) return "РєРѕРјРїР»РµРєС‚";
  return unit;
};

const normalizeResolveUnit = (rawUnit?: string | null): string => {
  const normalized = normalizeUnit(rawUnit);
  if (["РєРѕСЂРѕР±РєР°", "РєРѕСЂРѕР±", "box"].includes(normalized)) return "РєРѕСЂРѕР±РєР°";
  if (["РїР°С‡РєР°", "РїР°С‡", "pack"].includes(normalized)) return "РїР°С‡РєР°";
  if (["СЂСѓР»РѕРЅ", "roll"].includes(normalized)) return "СЂСѓР»РѕРЅ";
  if (["СѓРїР°РєРѕРІРєР°", "СѓРїР°Рє", "package", "pkg"].includes(normalized)) return "СѓРїР°РєРѕРІРєР°";
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
  if (["РєРѕСЂРѕР±РєР°", "РєРѕСЂРѕР±", "box"].includes(normalized)) return "РєРѕСЂРѕР±РєР°";
  if (["РїР°С‡РєР°", "РїР°С‡", "pack"].includes(normalized)) return "РїР°С‡РєР°";
  if (["РјРµС€РѕРє", "bag"].includes(normalized)) return "РјРµС€РѕРє";
  if (["СЂСѓР»РѕРЅ", "roll"].includes(normalized)) return "СЂСѓР»РѕРЅ";
  if (["СѓРїР°РєРѕРІРєР°", "СѓРїР°Рє", "package", "pkg"].includes(normalized)) return "СѓРїР°РєРѕРІРєР°";
  if (["РєРѕРјРїР»РµРєС‚", "set"].includes(normalized)) return "РєРѕРјРїР»РµРєС‚";
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
  if (/(РґРѕСЃС‚Р°РІРє|Р°СЂРµРЅРґ|РєСЂР°РЅ|СЌРєСЃРєР°РІР°С‚РѕСЂ|СѓСЃР»СѓРі|С‚РµС…РЅРёРє|Р»РѕРіРёСЃС‚|РїРµСЂРµРІРѕР·)/.test(text)) return "service";
  if (/(РјРѕРЅС‚Р°Р¶|РґРµРјРѕРЅС‚Р°Р¶|С€С‚СѓРєР°С‚СѓСЂ|РєР»Р°РґРє|Р±РµС‚РѕРЅРёСЂ|СЃРІР°СЂРє|СЂР°Р±РѕС‚)/.test(text)) return "work";
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
  "РјРј",
  "СЃРј",
  "РєРі",
  "С€С‚",
  "Рј2",
  "Рј3",
  "С‚РѕРЅРЅ",
  "С‚РѕРЅРЅР°",
  "С‚РЅ",
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
  if (normalized.length >= 2) collector.add(normalized);
};

const extractRebarMark = (value: string): string | null => {
  const match = String(value || "").match(/\bA\d{3,4}C?\b/i);
  return match ? match[0].toUpperCase() : null;
};

const extractDiameter = (value: string): string | null => {
  const match = String(value || "").match(/\b(\d{1,3})\s*(?:РјРј|mm)\b/i);
  return match?.[1] ?? null;
};

const resolveCatalogKind = (item: RikCatalogItem): ForemanAiKind | "unknown" => {
  const rawKind = String(item.kind ?? "").trim().toLowerCase();
  if (["material", "materials", "РјР°С‚РµСЂРёР°Р»", "РјР°С‚РµСЂРёР°Р»С‹"].includes(rawKind)) return "material";
  if (["work", "works", "СЂР°Р±РѕС‚Р°", "СЂР°Р±РѕС‚С‹"].includes(rawKind)) return "work";
  if (["service", "services", "СѓСЃР»СѓРіР°", "СѓСЃР»СѓРіРё"].includes(rawKind)) return "service";
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
  if (!isPackagingLikeUnit(input.unit) && !isUnitCompatible(input.unit, item.uom_code ?? item.uom ?? null)) return -100;

  const queryName = normalizeSearchText(input.name);
  const queryTokens = splitSearchTokens(input.name);
  const querySpecTokens = splitSearchTokens(input.specs ?? "");
  const candidateName = normalizeSearchText(item.name_human ?? item.name_human_ru ?? "");
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

  const fullDiameterVariant = fullQuery.replace(/\b(\d{1,3})\s*(?:РјРј|mm)\b/gi, "Г$1");
  const nameDiameterVariant = nameOnlyQuery.replace(/\b(\d{1,3})\s*(?:РјРј|mm)\b/gi, "Г$1");
  addCatalogQuery(queries, fullDiameterVariant);
  addCatalogQuery(queries, nameDiameterVariant);

  const rebarMark = extractRebarMark(nameOnlyQuery);
  const diameter = extractDiameter(nameOnlyQuery);
  if (/Р°СЂРјР°С‚СѓСЂ/i.test(nameOnlyQuery) && rebarMark) {
    addCatalogQuery(queries, `РђСЂРјР°С‚СѓСЂР° ${rebarMark}`);
    if (diameter) addCatalogQuery(queries, `РђСЂРјР°С‚СѓСЂР° ${rebarMark} Г${diameter}`);
  }

  return Array.from(queries);
};

const hasSpecificCatalogResolveSignal = (input: ParsedForemanAiItem): boolean => {
  const nameTokens = splitSearchTokens(input.name);
  const specTokens = splitSearchTokens(input.specs ?? "");
  const combinedText = `${input.name} ${input.specs ?? ""}`;
  return nameTokens.length >= 2 || specTokens.length > 0 || /\d/.test(combinedText);
};

const sanitizePostgrestOrTerm = (value: string): string =>
  String(value || "")
    .replace(/[,%()]/g, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseQuickSearchRows = (value: unknown): RikCatalogItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const rikCode = toText(row.rik_code ?? row.rikCode);
      const name = toText(row.name_human ?? row.name ?? row.name_human_ru);
      if (!rikCode || !name) return null;
      return {
        rik_code: rikCode,
        name_human: name,
        name_human_ru: toText(row.name_human_ru) || null,
        uom_code: toText(row.uom_code ?? row.uom) || null,
        kind: toText(row.kind) || null,
      };
    })
    .filter(Boolean);
};

const quickSearch = async (supabase: ReturnType<typeof createClient>, query: string, limit: number): Promise<RikCatalogItem[]> => {
  const pQuery = sanitizePostgrestOrTerm(query);
  if (!pQuery) return [];
  const pLimit = Math.max(1, Math.min(100, Math.floor(limit || 10)));

  const rpcCalls = [
    () => supabase.rpc("rik_quick_ru", { p_q: pQuery, p_limit: pLimit, p_apps: null }),
    () => supabase.rpc("rik_quick_search_typed", { p_q: pQuery, p_limit: pLimit, p_apps: null }),
    () => supabase.rpc("rik_quick_search", { p_q: pQuery, p_limit: pLimit, p_apps: null }),
  ];

  for (const run of rpcCalls) {
    try {
      const { data, error } = await run();
      if (!error) {
        const parsed = parseQuickSearchRows(data);
        if (parsed.length > 0) return parsed;
      }
    } catch (error) {
      logEdge("warn", "quick_search_rpc_failed", {
        queryLength: pQuery.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const tokens = pQuery.split(/\s+/).filter((token) => token.length >= 2);
  try {
    let builder = supabase
      .from("rik_items")
      .select("rik_code,name_human,uom_code,kind,name_human_ru")
      .limit(pLimit);
    if (tokens.length > 0) {
      tokens.forEach((token) => {
        builder = builder.or(`name_human.ilike.%${token}%,rik_code.ilike.%${token}%`);
      });
    } else {
      builder = builder.or(`name_human.ilike.%${pQuery}%,rik_code.ilike.%${pQuery}%`);
    }
    const { data, error } = await builder.order("rik_code", { ascending: true });
    if (error) throw error;
    return parseQuickSearchRows(data);
  } catch (error) {
    logEdge("warn", "quick_search_fallback_failed", {
      queryLength: pQuery.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
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

const buildPackagingClarifyQuestion = (
  input: ParsedForemanAiItem,
  base: CatalogResolvedBase,
): ClarifyQuestion => ({
  id: `packaging:${base.rik_code}`,
  prompt:
    `РЈС‚РѕС‡РЅРёС‚Рµ СѓРїР°РєРѕРІРєСѓ РґР»СЏ "${base.name}": ` +
    `РµРґРёРЅРёС†Р° "${input.unit}" РЅРµ РЅР°СЃС‚СЂРѕРµРЅР° РґР»СЏ РєР°С‚Р°Р»РѕР¶РЅРѕР№ РµРґРёРЅРёС†С‹ "${base.unit}".`,
});

const parseSynonymMatch = (value: unknown): CatalogResolvedBase | null => {
  const root = asRecord(value);
  const rows = Array.isArray(root?.rows) ? root.rows : [];
  const row = asRecord(rows[0]);
  if (!row) return null;
  const rikCode = toText(row.rik_code ?? row.rikCode);
  const name = normalizeName(toText(row.name_human ?? row.nameHuman));
  if (!rikCode || !name) return null;
  return {
    rik_code: rikCode,
    name,
    unit: normalizeResolveUnitCanonical(toText(row.uom_code ?? row.uomCode)),
    kind: normalizeKind(toText(row.kind), name),
    specs: null,
    matchedBy: toText(row.matched_by ?? row.matchedBy) || null,
  };
};

const resolveCatalogBySynonymPrimary = async (
  supabase: ReturnType<typeof createClient>,
  input: ParsedForemanAiItem,
): Promise<CatalogResolvedBase | null> => {
  try {
    const { data, error } = await supabase.rpc("resolve_catalog_synonym_v1", {
      p_terms: buildCatalogQueries(input),
      p_kind: input.kind,
    });
    if (error) throw error;
    const match = parseSynonymMatch(data);
    if (!match) return null;
    if (
      !hasSpecificCatalogResolveSignal(input) &&
      ["rik_alias_exact", "name_human_exact", "name_human_ru_exact"].includes(match.matchedBy ?? "")
    ) {
      return null;
    }
    if (!hasMeaningfulTokenOverlap([input.name, input.specs].filter(Boolean).join(" "), match.name)) {
      return null;
    }
    return {
      ...match,
      unit: match.unit || input.unit,
      kind: match.kind ?? input.kind,
      specs: input.specs ?? null,
    };
  } catch (error) {
    logEdge("warn", "synonym_resolve_failed", {
      kind: input.kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const parsePackagingResult = (value: unknown) => {
  const root = asRecord(value);
  const row = asRecord(root?.result);
  if (!row) return null;
  return {
    resolvedQty: row.resolvedQty ?? row.resolved_qty,
    resolvedUnit: toText(row.resolvedUnit ?? row.resolved_unit),
    clarifyRequired: row.clarifyRequired === true || row.clarify_required === true,
  };
};

const applyPackagingResolution = async (
  supabase: ReturnType<typeof createClient>,
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
    const { data, error } = await supabase.rpc("resolve_packaging_v1", {
      p_rik_code: base.rik_code,
      p_package_name: requestedUnit,
      p_qty: input.qty,
    });
    if (error) throw error;
    const packaging = parsePackagingResult(data);
    const resolvedQty = toNumber(packaging?.resolvedQty, 0);
    if (!packaging || packaging.clarifyRequired || resolvedQty <= 0 || !packaging.resolvedUnit) {
      return {
        resolved: null,
        clarifyQuestions: [buildPackagingClarifyQuestion(input, base)],
      };
    }
    return {
      resolved: buildResolvedQuickItem(input, base, resolvedQty, packaging.resolvedUnit),
      clarifyQuestions: [],
    };
  } catch (error) {
    logEdge("warn", "packaging_resolve_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      resolved: null,
      clarifyQuestions: [buildPackagingClarifyQuestion(input, base)],
    };
  }
};

const resolveForemanCatalogItem = async (
  supabase: ReturnType<typeof createClient>,
  input: ParsedForemanAiItem,
): Promise<CatalogResolution> => {
  const synonymPrimary = await resolveCatalogBySynonymPrimary(supabase, input);
  if (synonymPrimary) {
    const packagingResult = await applyPackagingResolution(supabase, input, synonymPrimary);
    return {
      resolved: packagingResult.resolved,
      options: [],
      clarifyQuestions: packagingResult.clarifyQuestions,
    };
  }

  const queries = buildCatalogQueries(input);
  let candidates: RikCatalogItem[] = [];
  for (const query of queries) {
    const found = await quickSearch(supabase, query, 10);
    if (found.length > 0) candidates = [...candidates, ...found];
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
        name: normalizeName(candidate.name_human || candidate.name_human_ru || input.name),
        unit: normalizeResolveUnitCanonical(candidate.uom_code ?? candidate.uom ?? input.unit),
        kind: input.kind,
        score,
      });
    }
    if (!best || score > best.score) best = { item: candidate, score };
  }

  ranked.sort((left, right) => right.score - left.score);
  const options = ranked.slice(0, 5);
  if (!best || best.score < RESOLVE_SCORE_THRESHOLD || !hasSpecificCatalogResolveSignal(input)) {
    return {
      resolved: null,
      options,
      clarifyQuestions: [],
    };
  }

  const packagingResult = await applyPackagingResolution(supabase, input, {
    rik_code: String(best.item.rik_code ?? "").trim(),
    name: normalizeName(best.item.name_human || best.item.name_human_ru || input.name),
    unit: normalizeResolveUnitCanonical(best.item.uom_code ?? best.item.uom ?? input.unit),
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

const buildResolveKey = (item: ParsedForemanAiItem): string =>
  JSON.stringify([
    normalizeSearchText(item.name),
    Number.isFinite(item.qty) ? item.qty : 0,
    normalizeResolveUnitCanonical(item.unit),
    item.kind,
    normalizeSearchText(item.specs ?? ""),
  ]);

const planResolveBatch = (items: ParsedForemanAiItem[], maxItems: number) => {
  const resolveItems: ParsedForemanAiItem[] = [];
  const sourceToResolveIndex: Array<number | null> = [];
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  let cappedCount = 0;

  items.forEach((item) => {
    const key = buildResolveKey(item);
    const existingIndex = seen.get(key);
    if (existingIndex != null) {
      duplicateCount += 1;
      sourceToResolveIndex.push(existingIndex);
      return;
    }
    if (resolveItems.length >= maxItems) {
      cappedCount += 1;
      sourceToResolveIndex.push(null);
      return;
    }
    const nextIndex = resolveItems.length;
    seen.set(key, nextIndex);
    resolveItems.push(item);
    sourceToResolveIndex.push(nextIndex);
  });

  return {
    sourceCount: items.length,
    resolveItems,
    sourceToResolveIndex,
    duplicateCount,
    cappedCount,
  };
};

const mapWithConcurrencyLimit = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};

const normalizeInputItems = (value: unknown): ParsedForemanAiItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      const qty = toNumber(row.qty, 0);
      const name = normalizeName(toText(row.name));
      const unit = normalizeResolveUnitCanonical(toText(row.unit));
      if (!name || qty <= 0 || !unit) return null;
      return {
        name,
        qty,
        unit,
        kind: normalizeKind(toText(row.kind), name),
        specs: toText(row.specs) || null,
      };
    })
    .filter(Boolean);
};

const resolveCatalogItems = async (
  supabase: ReturnType<typeof createClient>,
  cacheClient: ReturnType<typeof createClient> | null,
  items: ParsedForemanAiItem[],
  prompt: string,
  maxItems: number,
): Promise<ResolvePayload> => {
  const batchPlan = planResolveBatch(items, maxItems);
  const cacheKey = buildForemanAiPromptCacheKey({
    prompt,
    items: batchPlan.resolveItems,
    context: { maxItems },
  });
  const cached = promptCache.get(cacheKey);
  if (cached.status === "hit") {
    return withCacheStatus(cached.value, "hit");
  }
  const persistentCached = await readPersistentPromptCache(cacheClient, cacheKey);
  if (persistentCached) {
    promptCache.set(cacheKey, withCacheStatus(persistentCached, "miss"));
    return persistentCached;
  }

  const resolutions = await mapWithConcurrencyLimit(
    batchPlan.resolveItems,
    CATALOG_RESOLVE_CONCURRENCY_LIMIT,
    async (item) => await resolveForemanCatalogItem(supabase, item),
  );
  const accepted: ForemanAiQuickItem[] = [];
  const candidateGroups: CandidateOptionGroup[] = [];
  const clarifyQuestions: ClarifyQuestion[] = [];
  const unresolvedNames: string[] = [];

  items.forEach((item, index) => {
    const resolveIndex = batchPlan.sourceToResolveIndex[index];
    if (resolveIndex == null) {
      unresolvedNames.push(item.name);
      return;
    }
    const resolution = resolutions[resolveIndex];
    if (!resolution) {
      unresolvedNames.push(item.name);
      return;
    }
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

  const payload: ResolvePayload = {
    items: accepted,
    candidateGroups,
    clarifyQuestions,
    unresolvedNames,
    meta: {
      source: "foreman-ai-resolve",
      cacheStatus: "miss",
      sourceItemCount: batchPlan.sourceCount,
      resolveItemCount: batchPlan.resolveItems.length,
      duplicateItemCount: batchPlan.duplicateCount,
      cappedItemCount: batchPlan.cappedCount,
    },
  };
  promptCache.set(cacheKey, payload);
  await writePersistentPromptCache(cacheClient, cacheKey, payload);
  return payload;
};

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { requestId, error: "Method not allowed." });

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").trim();
  const anonKey = String(Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
  const serviceRoleKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  const authHeader = request.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey) {
    logEdge("error", "missing_supabase_env", { requestId });
    return json(500, { requestId, error: "Supabase Edge Function is not configured." });
  }
  if (!authHeader) {
    return json(401, { requestId, error: "Authorization is required." });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { requestId, error: "Invalid JSON body." });
  }

  const prompt = toText(body.prompt);
  const items = normalizeInputItems(body.items);
  const maxItems = Math.max(1, Math.min(100, Math.floor(toNumber(body.maxItems, DEFAULT_MAX_ITEMS))));
  if (!prompt || items.length === 0) {
    return json(200, {
      items: [],
      candidateGroups: [],
      clarifyQuestions: [],
      unresolvedNames: items.map((item) => item.name),
      meta: {
        source: "foreman-ai-resolve",
        cacheStatus: "miss",
        sourceItemCount: items.length,
        resolveItemCount: 0,
        duplicateItemCount: 0,
        cappedItemCount: 0,
      },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const cacheClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "x-client-info": "foreman-ai-resolve-cache" } },
      })
    : null;

  try {
    const result = await resolveCatalogItems(supabase, cacheClient, items, prompt, maxItems);
    logEdge("info", "success", {
      requestId,
      sourceItemCount: result.meta.sourceItemCount,
      resolveItemCount: result.meta.resolveItemCount,
      duplicateItemCount: result.meta.duplicateItemCount,
      cappedItemCount: result.meta.cappedItemCount,
      resolvedItemCount: result.items.length,
      candidateGroupCount: result.candidateGroups.length,
      cacheStatus: result.meta.cacheStatus,
    });
    return json(200, result);
  } catch (error) {
    logEdge("error", "resolve_failed", {
      requestId,
      sourceItemCount: items.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return json(500, { requestId, error: "Foreman AI catalog resolve failed." });
  }
});
