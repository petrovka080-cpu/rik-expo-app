import { supabase } from "../supabaseClient";

export type ForemanCatalogKind = "material" | "work" | "service";

export type ForemanCatalogSynonymMatch = {
  term: string;
  rikCode: string;
  nameHuman: string;
  uomCode: string | null;
  kind: ForemanCatalogKind | null;
  confidence: number;
  matchedBy: string;
};

export type ForemanPackagingResolution = {
  rikCode: string;
  requestedQty: number;
  requestedUnit: string;
  resolvedQty: number | null;
  resolvedUnit: string | null;
  packageName: string | null;
  packageMultiplier: number | null;
  conversionApplied: boolean;
  packageKnown: boolean;
  clarifyRequired: boolean;
  matchedBy: string | null;
};

export type ForemanAiResolveKind = "material" | "work" | "service";

export type ForemanAiServerResolveInputItem = {
  name: string;
  qty: number;
  unit: string;
  kind: ForemanAiResolveKind;
  specs?: string | null;
};

export type ForemanAiServerResolvedItem = ForemanAiServerResolveInputItem & {
  rik_code: string;
};

export type ForemanAiServerCandidateOption = {
  rik_code: string;
  name: string;
  unit: string;
  kind: ForemanAiResolveKind;
  score: number;
};

export type ForemanAiServerCandidateGroup = {
  sourceName: string;
  requestedQty: number;
  requestedUnit: string;
  kind: ForemanAiResolveKind;
  specs?: string | null;
  options: ForemanAiServerCandidateOption[];
};

export type ForemanAiServerClarifyQuestion = {
  id: string;
  prompt: string;
};

export type ForemanAiServerResolveMeta = {
  source: string;
  cacheStatus: "hit" | "miss";
  sourceItemCount: number;
  resolveItemCount: number;
  duplicateItemCount: number;
  cappedItemCount: number;
};

export type ForemanAiServerResolveResult = {
  items: ForemanAiServerResolvedItem[];
  candidateGroups: ForemanAiServerCandidateGroup[];
  clarifyQuestions: ForemanAiServerClarifyQuestion[];
  unresolvedNames: string[];
  meta: ForemanAiServerResolveMeta;
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toText = (value: unknown): string => String(value ?? "").trim();

const toOptionalText = (value: unknown): string | null => {
  const text = toText(value);
  return text || null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toKind = (value: unknown): ForemanCatalogKind | null => {
  const normalized = toText(value).toLowerCase();
  if (normalized === "material") return "material";
  if (normalized === "work") return "work";
  if (normalized === "service") return "service";
  return null;
};

const parseSynonymMatch = (value: unknown): ForemanCatalogSynonymMatch | null => {
  const row = asRecord(value);
  const term = toText(row.term);
  const rikCode = toText(row.rik_code ?? row.rikCode);
  const nameHuman = toText(row.name_human ?? row.nameHuman);
  const matchedBy = toText(row.matched_by ?? row.matchedBy);
  if (!term || !rikCode || !nameHuman || !matchedBy) return null;
  return {
    term,
    rikCode,
    nameHuman,
    uomCode: toOptionalText(row.uom_code ?? row.uomCode),
    kind: toKind(row.kind),
    confidence: Math.max(0, toNumber(row.confidence, 0)),
    matchedBy,
  };
};

const parsePackagingResolution = (value: unknown): ForemanPackagingResolution | null => {
  const row = asRecord(value);
  const rikCode = toText(row.rikCode ?? row.rik_code);
  const requestedUnit = toText(row.requestedUnit ?? row.requested_unit);
  if (!rikCode || !requestedUnit) return null;
  return {
    rikCode,
    requestedQty: Math.max(0, toNumber(row.requestedQty ?? row.requested_qty, 0)),
    requestedUnit,
    resolvedQty: row.resolvedQty == null && row.resolved_qty == null
      ? null
      : Math.max(0, toNumber(row.resolvedQty ?? row.resolved_qty, 0)),
    resolvedUnit: toOptionalText(row.resolvedUnit ?? row.resolved_unit),
    packageName: toOptionalText(row.packageName ?? row.package_name),
    packageMultiplier: row.packageMultiplier == null && row.package_multiplier == null
      ? null
      : Math.max(0, toNumber(row.packageMultiplier ?? row.package_multiplier, 0)),
    conversionApplied: row.conversionApplied === true || row.conversion_applied === true,
    packageKnown: row.packageKnown === true || row.package_known === true,
    clarifyRequired: row.clarifyRequired === true || row.clarify_required === true,
    matchedBy: toOptionalText(row.matchedBy ?? row.matched_by),
  };
};

const parseResolveKind = (value: unknown): ForemanAiResolveKind => {
  const kind = toText(value).toLowerCase();
  if (kind === "work" || kind === "service") return kind;
  return "material";
};

const parseServerResolvedItem = (value: unknown): ForemanAiServerResolvedItem | null => {
  const row = asRecord(value);
  const rikCode = toText(row.rik_code ?? row.rikCode);
  const name = toText(row.name);
  const qty = toNumber(row.qty, 0);
  const unit = toText(row.unit);
  if (!rikCode || !name || qty <= 0 || !unit) return null;
  return {
    rik_code: rikCode,
    name,
    qty,
    unit,
    kind: parseResolveKind(row.kind),
    specs: toOptionalText(row.specs),
  };
};

const parseServerCandidateOption = (value: unknown): ForemanAiServerCandidateOption | null => {
  const row = asRecord(value);
  const rikCode = toText(row.rik_code ?? row.rikCode);
  const name = toText(row.name);
  const unit = toText(row.unit);
  if (!rikCode || !name || !unit) return null;
  return {
    rik_code: rikCode,
    name,
    unit,
    kind: parseResolveKind(row.kind),
    score: toNumber(row.score, 0),
  };
};

const parseServerCandidateGroup = (value: unknown): ForemanAiServerCandidateGroup | null => {
  const row = asRecord(value);
  const sourceName = toText(row.sourceName ?? row.source_name);
  const requestedQty = toNumber(row.requestedQty ?? row.requested_qty, 0);
  const requestedUnit = toText(row.requestedUnit ?? row.requested_unit);
  const options = asArray(row.options)
    .map(parseServerCandidateOption)
    .filter((item): item is ForemanAiServerCandidateOption => !!item);
  if (!sourceName || requestedQty <= 0 || !requestedUnit || options.length === 0) return null;
  return {
    sourceName,
    requestedQty,
    requestedUnit,
    kind: parseResolveKind(row.kind),
    specs: toOptionalText(row.specs),
    options,
  };
};

const parseServerClarifyQuestion = (value: unknown): ForemanAiServerClarifyQuestion | null => {
  const row = asRecord(value);
  const id = toText(row.id);
  const prompt = toText(row.prompt);
  if (!id || !prompt) return null;
  return { id, prompt };
};

const parseServerResolveMeta = (value: unknown): ForemanAiServerResolveMeta => {
  const row = asRecord(value);
  const cacheStatus = toText(row.cacheStatus ?? row.cache_status).toLowerCase() === "hit" ? "hit" : "miss";
  return {
    source: toText(row.source) || "foreman-ai-resolve",
    cacheStatus,
    sourceItemCount: Math.max(0, Math.floor(toNumber(row.sourceItemCount ?? row.source_item_count, 0))),
    resolveItemCount: Math.max(0, Math.floor(toNumber(row.resolveItemCount ?? row.resolve_item_count, 0))),
    duplicateItemCount: Math.max(0, Math.floor(toNumber(row.duplicateItemCount ?? row.duplicate_item_count, 0))),
    cappedItemCount: Math.max(0, Math.floor(toNumber(row.cappedItemCount ?? row.capped_item_count, 0))),
  };
};

const parseServerResolveResult = (value: unknown): ForemanAiServerResolveResult => {
  const root = asRecord(value);
  return {
    items: asArray(root.items)
      .map(parseServerResolvedItem)
      .filter((item): item is ForemanAiServerResolvedItem => !!item),
    candidateGroups: asArray(root.candidateGroups ?? root.candidate_groups)
      .map(parseServerCandidateGroup)
      .filter((item): item is ForemanAiServerCandidateGroup => !!item),
    clarifyQuestions: asArray(root.clarifyQuestions ?? root.clarify_questions)
      .map(parseServerClarifyQuestion)
      .filter((item): item is ForemanAiServerClarifyQuestion => !!item),
    unresolvedNames: asArray(root.unresolvedNames ?? root.unresolved_names)
      .map((item) => toText(item))
      .filter(Boolean),
    meta: parseServerResolveMeta(root.meta),
  };
};

export async function resolveCatalogSynonymMatchViaRpc(params: {
  terms: string[];
  kind?: ForemanCatalogKind | null;
}): Promise<ForemanCatalogSynonymMatch | null> {
  const terms = Array.from(
    new Set(
      (Array.isArray(params.terms) ? params.terms : [])
        .map((value) => toText(value))
        .filter((value) => value.length >= 2),
    ),
  );
  if (terms.length === 0) return null;

  const { data, error } = await supabase.rpc("resolve_catalog_synonym_v1" as never, {
    p_terms: terms,
    p_kind: params.kind ?? null,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const rows = asArray(root.rows).map(parseSynonymMatch).filter((row): row is ForemanCatalogSynonymMatch => !!row);
  return rows[0] ?? null;
}

export async function resolveCatalogPackagingViaRpc(params: {
  rikCode: string;
  packageName: string;
  qty: number;
}): Promise<ForemanPackagingResolution | null> {
  const rikCode = toText(params.rikCode);
  const packageName = toText(params.packageName);
  const qty = Math.max(0, toNumber(params.qty, 0));
  if (!rikCode || !packageName || qty <= 0) return null;

  const { data, error } = await supabase.rpc("resolve_packaging_v1" as never, {
    p_rik_code: rikCode,
    p_package_name: packageName,
    p_qty: qty,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const result = parsePackagingResolution(root.result);
  return result;
}

export async function resolveForemanAiCatalogViaServer(params: {
  prompt: string;
  items: ForemanAiServerResolveInputItem[];
  maxItems?: number;
}): Promise<ForemanAiServerResolveResult> {
  const prompt = toText(params.prompt);
  const items = (Array.isArray(params.items) ? params.items : [])
    .map((item) => ({
      name: toText(item.name),
      qty: Math.max(0, toNumber(item.qty, 0)),
      unit: toText(item.unit),
      kind: parseResolveKind(item.kind),
      specs: toOptionalText(item.specs),
    }))
    .filter((item) => item.name && item.qty > 0 && item.unit);

  if (!prompt || items.length === 0) {
    return {
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
    };
  }

  const { data, error } = await supabase.functions.invoke("foreman-ai-resolve", {
    body: {
      prompt,
      items,
      maxItems: Math.max(1, Math.floor(toNumber(params.maxItems, 40))),
    },
    headers: {
      Accept: "application/json",
    },
  });
  if (error) throw error;

  return parseServerResolveResult(data);
}
