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
