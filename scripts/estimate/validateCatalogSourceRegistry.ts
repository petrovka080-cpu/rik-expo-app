import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  PRODUCTION_WORK_DEFINITIONS_10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "./validateEstimateWorkSpecificity";
import {
  P0_PROFESSIONAL_CATALOG_CASES,
  type P0ProfessionalCatalogCase,
} from "./p0ProfessionalCatalog";
import { resolveCatalogSourceEvidence } from "./catalogBackfillConveyor";

export const CATALOG_SOURCE_REGISTRY_PATH = "data/estimate-catalog/source-registry.json" as const;
export const GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED" as const;

type SourceRegistryEntry = {
  source_id: string;
  source_title: string;
  source_type: string;
  source_url_or_document_ref: string;
  source_date_or_version: string;
  provenance: string;
  license_status: string;
  quality_status: string;
  review_status: string;
  is_source_backed_professional_norm_pack: boolean;
  is_generated_family_default: boolean;
  is_historical_price_only: boolean;
  evidence_kind: string | null;
  sample_norm_ids: string[];
  sample_template_ids: string[];
  p0_case_ids: string[];
};

export type CatalogSourceRegistry = {
  schema: "catalog-source-registry-v1";
  generated_at: string;
  final_status:
    | typeof GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED;
  registry_source_count: number;
  row_source_count: number;
  p0_source_count: number;
  sources: SourceRegistryEntry[];
  p0_source_coverage: Array<{
    case_id: string;
    source_kind: string;
    source_ids: string[];
    source_backed: boolean;
    expected_source_token_found: boolean;
    row_count: number;
    blocking_reasons: string[];
  }>;
  blockers: string[];
  full_10000_real_norm_green_claimed: false;
  fake_green_claimed: false;
  marketplace_touched: false;
};

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function emptyEntry(sourceId: string): SourceRegistryEntry {
  const evidence = resolveCatalogSourceEvidence(sourceId);
  return {
    source_id: sourceId,
    source_title: evidence?.source_title ?? "unknown",
    source_type: evidence?.source_type ?? "unknown",
    source_url_or_document_ref: evidence?.source_url_or_document_ref ?? "unknown",
    source_date_or_version: evidence?.source_date_or_version ?? "unknown",
    provenance: evidence?.provenance ?? "unknown",
    license_status: evidence?.license_status ?? "unknown",
    quality_status: evidence?.quality_status ?? "unknown",
    review_status: evidence?.review_status ?? "unknown",
    is_source_backed_professional_norm_pack: isProfessionalNormPackSourceId(sourceId) && Boolean(evidence),
    is_generated_family_default: sourceId.includes("family_default") || sourceId.startsWith("src_generated_"),
    is_historical_price_only: false,
    evidence_kind: evidence?.evidence_kind ?? null,
    sample_norm_ids: [],
    sample_template_ids: [],
    p0_case_ids: [],
  };
}

function mergeSample(values: string[], value: string | null | undefined, limit = 8): void {
  const normalized = String(value ?? "").trim();
  if (normalized && values.length < limit && !values.includes(normalized)) values.push(normalized);
}

function addRowSource(
  entries: Map<string, SourceRegistryEntry>,
  row: ProductionCompiledExpandedRow,
  p0CaseId?: string,
): void {
  const sourceId = String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "").trim();
  if (!sourceId) return;
  const entry = entries.get(sourceId) ?? emptyEntry(sourceId);
  const evidence = resolveCatalogSourceEvidence(sourceId);
  entries.set(sourceId, entry);
  entry.source_title = evidence?.source_title ?? String(row.normSourceTitle ?? row.sourceParameters?.normSourceTitle ?? entry.source_title);
  entry.source_type = evidence?.source_type ?? String(row.sourceParameters?.normSourceType ?? entry.source_type);
  entry.source_url_or_document_ref = evidence?.source_url_or_document_ref ??
    String(row.sourceParameters?.normSourceUrl ?? row.sourceParameters?.sourceUrl ?? entry.source_url_or_document_ref);
  entry.source_date_or_version = evidence?.source_date_or_version ??
    String(row.normVersion ?? row.sourceParameters?.normSourceDocumentVersion ?? entry.source_date_or_version);
  entry.provenance = evidence?.provenance ?? String(row.sourceParameters?.normSourceProvenance ?? entry.provenance);
  entry.license_status = evidence?.license_status ?? String(row.sourceParameters?.normLicenseStatus ?? entry.license_status);
  entry.quality_status = evidence?.quality_status ?? String(row.sourceParameters?.normQualityStatus ?? entry.quality_status);
  entry.review_status = evidence?.review_status ?? String(row.normReviewStatus ?? row.sourceParameters?.normReviewStatus ?? entry.review_status);
  entry.is_source_backed_professional_norm_pack ||= isProfessionalNormPackSourceId(sourceId) && Boolean(evidence);
  entry.evidence_kind = evidence?.evidence_kind ?? entry.evidence_kind;
  mergeSample(entry.sample_norm_ids, row.normId);
  mergeSample(entry.sample_template_ids, row.templateId);
  if (p0CaseId) mergeSample(entry.p0_case_ids, p0CaseId, 20);
}

function addRegistrySources(entries: Map<string, SourceRegistryEntry>): void {
  for (const item of PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS) {
    const entry = entries.get(item.sourceId) ?? emptyEntry(item.sourceId);
    entries.set(item.sourceId, entry);
    entry.source_title = item.sourceTitle;
    entry.source_type = item.sourceType;
    entry.source_url_or_document_ref = item.sourceUrl || item.sourcePage;
    entry.source_date_or_version = item.sourceDocumentVersion;
    entry.provenance = item.sourceProvenance;
    entry.license_status = item.licenseStatus;
    entry.quality_status = item.qualityStatus;
    entry.review_status = item.reviewStatus;
    entry.is_source_backed_professional_norm_pack = true;
    entry.evidence_kind = "registry_norm_pack";
    mergeSample(entry.sample_norm_ids, item.normId);
  }
}

function evaluateP0Rows(testCase: P0ProfessionalCatalogCase): ProductionCompiledExpandedRow[] {
  if (testCase.source_kind === "critical_prompt_calculator") {
    const promptCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === testCase.sample_prompt_case_id);
    if (!promptCase) return [];
    return evaluateWorkSpecificityCase(promptCase).compiled?.rows ?? [];
  }
  if (!testCase.sample_work_key) return [];
  return compileProductionExpandedEstimate10000({
    workKey: testCase.sample_work_key,
    quantity: testCase.sample_quantity,
    countryCode: "KG",
  }).rows;
}

export function buildCatalogSourceRegistry(options: { writeFiles?: boolean } = {}): CatalogSourceRegistry {
  const entries = new Map<string, SourceRegistryEntry>();
  addRegistrySources(entries);
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    for (const row of compiled.rows) addRowSource(entries, row);
  }

  const p0Coverage = P0_PROFESSIONAL_CATALOG_CASES.map((testCase) => {
    const rows = evaluateP0Rows(testCase);
    for (const row of rows) addRowSource(entries, row, testCase.case_id);
    const sourceIds = [...new Set(rows.map((row) => row.normSourceId).filter(Boolean))].sort();
    const sourceBacked = rows.length > 0 && sourceIds.every((sourceId) =>
      isProfessionalNormPackSourceId(sourceId) && Boolean(resolveCatalogSourceEvidence(sourceId))
    );
    const expectedSourceTokenFound = sourceIds.some((sourceId) => sourceId.includes(testCase.expected_source_token));
    const blockingReasons = [
      rows.length === 0 ? "p0_rows_missing" : "",
      !sourceBacked ? "p0_source_not_professional_norm_pack" : "",
      !expectedSourceTokenFound ? `expected_source_token_missing:${testCase.expected_source_token}` : "",
    ].filter(Boolean);
    return {
      case_id: testCase.case_id,
      source_kind: testCase.source_kind,
      source_ids: sourceIds,
      source_backed: sourceBacked,
      expected_source_token_found: expectedSourceTokenFound,
      row_count: rows.length,
      blocking_reasons: blockingReasons,
    };
  });

  const sources = [...entries.values()].sort((left, right) => left.source_id.localeCompare(right.source_id));
  const rowSourceCount = sources.filter((item) => item.sample_template_ids.length > 0).length;
  const p0SourceCount = sources.filter((item) => item.p0_case_ids.length > 0).length;
  const blockers = [
    sources.length === 0 ? "source_registry_empty" : "",
    rowSourceCount === 0 ? "row_source_registry_empty" : "",
    p0SourceCount === 0 ? "p0_source_registry_empty" : "",
    ...p0Coverage.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)),
    sources.some((item) => item.is_generated_family_default) ? "generated_family_default_source_present" : "",
    sources.some((item) => item.is_historical_price_only) ? "historical_price_only_source_present" : "",
    sources.some((item) => item.is_source_backed_professional_norm_pack && item.source_url_or_document_ref === "unknown")
      ? "source_backed_registry_has_unknown_document_ref"
      : "",
    sources.some((item) => isProfessionalNormPackSourceId(item.source_id) && !item.evidence_kind)
      ? "professional_norm_pack_source_without_evidence"
      : "",
  ].filter(Boolean);

  const registry: CatalogSourceRegistry = {
    schema: "catalog-source-registry-v1",
    generated_at: new Date().toISOString(),
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_FAILED,
    registry_source_count: PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.length,
    row_source_count: rowSourceCount,
    p0_source_count: p0SourceCount,
    sources,
    p0_source_coverage: p0Coverage,
    blockers,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
  };
  if (options.writeFiles) writeJson(CATALOG_SOURCE_REGISTRY_PATH, registry);
  return registry;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateCatalogSourceRegistry.ts")) {
  const registry = buildCatalogSourceRegistry({ writeFiles: true });
  console.log(JSON.stringify({
    final_status: registry.final_status,
    registry_source_count: registry.registry_source_count,
    row_source_count: registry.row_source_count,
    p0_source_count: registry.p0_source_count,
    blockers: registry.blockers,
  }, null, 2));
  process.exitCode = registry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? 0 : 1;
}
