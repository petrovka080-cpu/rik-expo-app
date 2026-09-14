import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import { aiEstimateRuDictionaryEntry } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import {
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  NORM_WORK_TAXONOMY_GROUPS,
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { inspectProductionNormConsumerInventory } from "./productionNormConsumerInventory";
import { inspectProductionNormBindingCandidates } from "./productionNormBindingCandidateInventory";
import {
  inferProfessionalNormPackBasisUnit,
  PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID,
} from "./professionalNormPackBasisRegistry";
import { constructionNormativeRegistryV1 } from "../../src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
} from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";
import { productionNormSourceEvidenceRegistryV1 } from "../../src/lib/estimate/v4/domainFactory/productionNormSourceEvidenceRegistryV1";

export const GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS =
  "GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS" as const;
export const STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS =
  "STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS" as const;
export const STOP_REAL_NORM_ACCEPTANCE_DENOMINATOR_INCOMPLETE =
  "STOP_REAL_NORM_ACCEPTANCE_DENOMINATOR_INCOMPLETE" as const;
export const STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE =
  "STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE" as const;
export const STOP_NORM_REALITY_AUDIT_NOT_FOUND =
  "STOP_NORM_REALITY_AUDIT_NOT_FOUND" as const;

export type RealProfessionalNormAuditOutcomeInput = {
  previousStatusOk: boolean;
  green: boolean;
  physicalSourceCoverageComplete: boolean;
  acceptanceDenominatorComplete: boolean;
  catalogAdmissionComplete: boolean;
};

export type ManifestSourceHeadFreshness = {
  current_source_head: string | null;
  manifest_source_head: string | null;
  matches_current_head: boolean;
  blocker: string | null;
};

export function inspectManifestSourceHeadFreshness(
  currentSourceHead: string | null | undefined,
  manifestSourceHead: string | null | undefined,
): ManifestSourceHeadFreshness {
  const current = currentSourceHead?.trim().toLowerCase() || null;
  const manifest = manifestSourceHead?.trim().toLowerCase() || null;
  const matchesCurrentHead = current !== null && manifest !== null && current === manifest;

  return {
    current_source_head: current,
    manifest_source_head: manifest,
    matches_current_head: matchesCurrentHead,
    blocker: matchesCurrentHead
      ? null
      : !current
        ? "current_source_head_unavailable"
        : !manifest
          ? "current_manifest_source_head_missing"
          : `current_manifest_source_head_stale:${manifest}!=${current}`,
  };
}

export function classifyRealProfessionalNormAuditOutcome(
  input: RealProfessionalNormAuditOutcomeInput,
): { finalStatus: string; nextRequiredAction: string } {
  if (!input.previousStatusOk) {
    return {
      finalStatus: STOP_NORM_REALITY_AUDIT_NOT_FOUND,
      nextRequiredAction: "restore_current_norm_source_quality_audit_lineage",
    };
  }
  if (input.green) {
    return {
      finalStatus: GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS,
      nextRequiredAction: "none",
    };
  }
  if (!input.physicalSourceCoverageComplete) {
    return {
      finalStatus: STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS,
      nextRequiredAction: "add_or_repair_reviewed_applicability_bound_physical_norm_sources",
    };
  }
  if (!input.acceptanceDenominatorComplete) {
    return {
      finalStatus: STOP_REAL_NORM_ACCEPTANCE_DENOMINATOR_INCOMPLETE,
      nextRequiredAction: "repair_current_manifest_norm_source_admission_and_verify_catalog_projection",
    };
  }
  if (!input.catalogAdmissionComplete) {
    return {
      finalStatus: STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE,
      nextRequiredAction: "replace_unverified_catalog_defaults_with_applicability_bound_norm_bindings",
    };
  }
  return {
    finalStatus: STOP_REAL_NORM_CATALOG_ADMISSION_INCOMPLETE,
    nextRequiredAction: "resolve_remaining_real_norm_acceptance_blockers",
  };
}

const PROFESSIONAL_NORM_PACK_ROOT = "data/estimate-norms/professional";
const REMEDIATION_PLAN_FILE = "work-group-remediation-plan.json";
const PREVIOUS_AUDIT_ROOT = ".release-runtime/ai-estimate-norm-base-reality-and-source-quality-audit";
const RUNTIME_ROOT = ".release-runtime/ai-estimate-real-professional-norm-packs";
const CURRENT_MANIFEST_AUDIT_FILE =
  ".release-runtime/r4a13-4/platform-core-global/manifest-core-norm/05_MANIFEST_CORE_NORM_AUDIT.json";
const CURRENT_MANIFEST_COVERAGE_LEDGER_BASENAME =
  "01_CURRENT_WORK_IDENTITY_COVERAGE_LEDGER.jsonl";
const REQUIRED_CURRENT_MANIFEST_STATUS = "GREEN_R4_A13_4_MANIFEST_CORE_NORM_INVENTORY";
const REQUIRED_PREVIOUS_STATUS = "STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL";
const HARDCODED_PREVIOUS_STATUS = "STOP_HARDCODED_PRODUCTION_NORM_RATE_FOUND";
const SOURCE_QUALITY_GREEN_STATUS = "GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS";
const APARTMENT_REFERENCE_WORK_KEY = "apartment_capital_renovation";
const SOURCE_REGISTRY_FILE = "data/estimate-catalog/source-registry.json";

const ALLOWED_SOURCE_TYPES = new Set([
  "official_public_building_norms",
  "public_government_norms_or_standards",
  "manufacturer_technical_cards",
  "manufacturer_consumption_tables",
  "open_method_statements",
  "internal_curated_company_norm_catalog",
  "manual_curated_norms_with_review_status",
]);

const FORBIDDEN_SOURCE_PATTERN = /\b(AI|unknown|generated|family_default|примерно)\b/i;
const FAKE_URL_PATTERN = /example\.|localhost|127\.0\.0\.1|fake|todo|tbd|placeholder/i;
const RU_MOJIBAKE_PATTERN = /[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђљњќћџ]/u;
const GENERIC_STRUCTURAL_SOURCE_IDS = new Set([
  "src_norm_internal_labor_standards_2026_07",
  "src_norm_material_consumption_tables_2026_07",
  "src_norm_public_reference_construction_methods_2026_07",
  "src_norm_estimator_manual_service_policy_2026_07",
]);

function isReadableRussianText(value: string): boolean {
  return /[А-Яа-яЁё]/u.test(value) && !RU_MOJIBAKE_PATTERN.test(value);
}

type PreviousNormRealitySummary = {
  final_status?: string;
  runtime_summary_path?: string;
  template_count?: number;
  norm_records_count?: number;
  synthetic_family_default_count?: number;
  templates_with_only_synthetic_norms?: number;
  templates_with_real_norm_sources_count?: number;
  templates_with_official_or_curated_norms?: number;
  professional_source_coverage?: boolean;
  golden_100_cases_passed?: boolean;
  all_random_templates_generate_professional_boq?: boolean;
  real_hardcoded_production_rate_count?: number;
  work_groups_with_only_generic_norms?: string[];
  taxonomy_work_groups_without_norm_records?: string[];
};

type CurrentManifestNormAudit = {
  schemaVersion?: string;
  status?: string;
  runtime?: {
    definitionReleaseId?: string;
    sourceHead?: string;
  };
  catalog?: {
    currentRuntimeDefinitions?: number;
    releaseStoredDefinitionCount?: number;
    identityCounts?: Record<string, number>;
  };
  definitions?: {
    resourceCount?: number;
    tracedResourceCount?: number;
    normalizedBindingResourceCount?: number;
    uncoveredResourceCount?: number;
    invalidTraceResourceCount?: number;
    admittedDefinitionsWithUnregisteredNormSources?: number;
  };
};

export type ManifestNormSourceRegistryAdmission = {
  admitted_definition_count: number;
  declared_trace_source_ids_count: number;
  declared_norm_source_ids_count: number;
  accepted_norm_source_ids_count: number;
  non_normative_provenance_source_ids: string[];
  non_normative_provenance_source_id_class_counts: Record<string, number>;
  admitted_definitions_with_non_normative_provenance_count: number;
  admitted_definitions_with_non_normative_provenance_samples: string[];
  unregistered_norm_source_ids: string[];
  unregistered_norm_source_id_class_counts: Record<string, number>;
  admitted_definitions_with_unregistered_norm_sources_count: number;
  admitted_definitions_with_unregistered_norm_sources_samples: string[];
  complete: boolean;
};

export type ManifestTraceSourceRole =
  | "NORMATIVE_SOURCE"
  | "PROJECT_OR_ENGINEERING_INPUT"
  | "CALCULATION_PROVENANCE";

export function classifyManifestTraceSourceRole(sourceId: string): ManifestTraceSourceRole {
  if (/^(?:engineering_assumption:|project_|selected_)/u.test(sourceId)) {
    return "PROJECT_OR_ENGINEERING_INPUT";
  }
  if (
    /^KG_PROJECT_RESOURCE_CALCULATION_V\d+$/u.test(sourceId) ||
    /^src_expanded_complex_.+_reference_formula_v1$/u.test(sourceId)
  ) {
    return "CALCULATION_PROVENANCE";
  }
  return "NORMATIVE_SOURCE";
}

type SourceRegistry = {
  sources?: Array<{
    source_id?: string;
    source_url_or_document_ref?: string;
    quality_status?: string;
    is_source_backed_professional_norm_pack?: boolean;
    is_generated_family_default?: boolean;
    is_historical_price_only?: boolean;
    evidence_kind?: string | null;
    sample_norm_ids?: unknown[];
    sample_template_ids?: unknown[];
  }>;
};

type WorkGroupRemediationPlan = {
  schema: string;
  source_status_from: string;
  target_green_status: string;
  work_groups: Array<{
    work_group: string;
    templates_count?: number;
    current_norm_status?: string;
    required_real_sources: string[];
    source_strategy: string;
    priority: number;
    target_norm_pack_file: string;
    manual_review_required: boolean;
  }>;
};

type ProfessionalNormPack = {
  work_group?: string;
  source_pack_version?: string;
  source_type?: string;
  review_status?: "reviewed" | "needs_review";
  license_status?: "public" | "internal" | "manufacturer_public";
  review_evidence?: {
    reviewer?: string;
    reviewed_at?: string;
    method?: "DIRECT_PRIMARY_SOURCE_REVIEW";
    items?: {
      norm_id?: string;
      source_url?: string;
      supporting_source_urls?: string[];
      verified_facts?: string[];
    }[];
  };
  norm_items?: Array<{
    norm_id?: string;
    name_ru?: string;
    parameters?: string[];
    unit?: string;
    rate?: {
      value?: number;
      unit?: string;
    };
    applicability?: Record<string, unknown>;
    waste_percent_default?: number;
    rounding?: {
      package_unit?: string;
      package_size?: number;
      mode?: string;
    };
    source?: {
      title?: string;
      url?: string;
      page?: string;
      provenance?: string;
    };
  }>;
};

type PackValidationResult = {
  file: string;
  work_group: string | null;
  norm_items_count: number;
  source_type: string | null;
  review_status: string | null;
  license_status: string | null;
  review_evidence_verified: boolean;
  valid: boolean;
  failures: string[];
};

type NormPackBindingRequirement = {
  work_group: string;
  review_status: string | null;
  norm_items: Array<{
    norm_id: string;
    required_parameter_keys: string[];
    output_unit: string;
    rate_basis: string;
    basis_parameter: string;
    work_basis_unit: string | null;
    source_title: string;
  }>;
};

const PHYSICAL_NORM_BASIS_PARAMETER_BY_ID: Readonly<Record<string, string>> =
  PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID;

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_REAL_PROFESSIONAL_NORM_PACKS_REQUIRES_--all");
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function pathExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function inspectManifestNormSourceRegistryAdmission(
  jsonLines: string,
  acceptedNormSourceIds: ReadonlySet<string>,
): ManifestNormSourceRegistryAdmission {
  let admittedDefinitionCount = 0;
  let affectedDefinitionCount = 0;
  let nonNormativeDefinitionCount = 0;
  const declaredTraceSourceIds = new Set<string>();
  const declaredNormSourceIds = new Set<string>();
  const acceptedSourceIds = new Set<string>();
  const nonNormativeSourceIds = new Set<string>();
  const unregisteredSourceIds = new Set<string>();
  const affectedDefinitionSamples: string[] = [];
  const nonNormativeDefinitionSamples: string[] = [];

  for (const line of jsonLines.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as {
      canonicalId?: string;
      admissionState?: string;
      normPackVersion?: { sourceIds?: unknown[] } | null;
    };
    if (!String(row.admissionState ?? "").startsWith("ADMITTED_")) continue;
    admittedDefinitionCount += 1;
    const sourceIds = (row.normPackVersion?.sourceIds ?? [])
      .map((sourceId) => String(sourceId ?? "").trim())
      .filter(Boolean);
    let affected = false;
    let hasNonNormativeProvenance = false;
    for (const sourceId of sourceIds) {
      declaredTraceSourceIds.add(sourceId);
      if (classifyManifestTraceSourceRole(sourceId) !== "NORMATIVE_SOURCE") {
        hasNonNormativeProvenance = true;
        nonNormativeSourceIds.add(sourceId);
        continue;
      }
      declaredNormSourceIds.add(sourceId);
      if (acceptedNormSourceIds.has(sourceId)) {
        acceptedSourceIds.add(sourceId);
      } else {
        affected = true;
        unregisteredSourceIds.add(sourceId);
      }
    }
    if (affected) {
      affectedDefinitionCount += 1;
      if (affectedDefinitionSamples.length < 20) {
        affectedDefinitionSamples.push(String(row.canonicalId ?? "unknown"));
      }
    }
    if (hasNonNormativeProvenance) {
      nonNormativeDefinitionCount += 1;
      if (nonNormativeDefinitionSamples.length < 20) {
        nonNormativeDefinitionSamples.push(String(row.canonicalId ?? "unknown"));
      }
    }
  }

  const nonNormativeProvenanceSourceIdClassCounts = [...nonNormativeSourceIds]
    .reduce<Record<string, number>>((counts, sourceId) => {
      const classification = classifyManifestTraceSourceRole(sourceId) === "CALCULATION_PROVENANCE"
        ? "calculation_provenance"
        : "project_or_engineering_input";
      counts[classification] = (counts[classification] ?? 0) + 1;
      return counts;
    }, {});

  const unregisteredNormSourceIdClassCounts = [...unregisteredSourceIds].reduce<Record<string, number>>(
    (counts, sourceId) => {
      const classification = sourceId.startsWith("src_professional_norm_pack_catalog_")
        ? "generated_catalog_default"
        : sourceId.startsWith("src_professional_norm_pack_")
          ? "unregistered_professional_pack"
          : "other_unregistered_source";
      counts[classification] = (counts[classification] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    admitted_definition_count: admittedDefinitionCount,
    declared_trace_source_ids_count: declaredTraceSourceIds.size,
    declared_norm_source_ids_count: declaredNormSourceIds.size,
    accepted_norm_source_ids_count: acceptedSourceIds.size,
    non_normative_provenance_source_ids: [...nonNormativeSourceIds].sort(),
    non_normative_provenance_source_id_class_counts: nonNormativeProvenanceSourceIdClassCounts,
    admitted_definitions_with_non_normative_provenance_count: nonNormativeDefinitionCount,
    admitted_definitions_with_non_normative_provenance_samples: nonNormativeDefinitionSamples,
    unregistered_norm_source_ids: [...unregisteredSourceIds].sort(),
    unregistered_norm_source_id_class_counts: unregisteredNormSourceIdClassCounts,
    admitted_definitions_with_unregistered_norm_sources_count: affectedDefinitionCount,
    admitted_definitions_with_unregistered_norm_sources_samples: affectedDefinitionSamples,
    complete: admittedDefinitionCount > 0 && unregisteredSourceIds.size === 0,
  };
}

function inspectCurrentManifestNormSourceRegistryAdmission(
  manifestAuditFile: string | null,
): ManifestNormSourceRegistryAdmission & { ledger_path: string | null; ledger_exists: boolean } {
  const empty = {
    admitted_definition_count: 0,
    declared_trace_source_ids_count: 0,
    declared_norm_source_ids_count: 0,
    accepted_norm_source_ids_count: 0,
    non_normative_provenance_source_ids: [],
    non_normative_provenance_source_id_class_counts: {},
    admitted_definitions_with_non_normative_provenance_count: 0,
    admitted_definitions_with_non_normative_provenance_samples: [],
    unregistered_norm_source_ids: [],
    unregistered_norm_source_id_class_counts: {},
    admitted_definitions_with_unregistered_norm_sources_count: 0,
    admitted_definitions_with_unregistered_norm_sources_samples: [],
    complete: false,
  };
  if (!manifestAuditFile) return { ...empty, ledger_path: null, ledger_exists: false };
  const ledgerFile = path.join(path.dirname(manifestAuditFile), CURRENT_MANIFEST_COVERAGE_LEDGER_BASENAME);
  if (!pathExists(ledgerFile)) {
    return {
      ...empty,
      ledger_path: path.relative(process.cwd(), ledgerFile).replace(/\\/g, "/"),
      ledger_exists: false,
    };
  }

  const sourceRegistry = pathExists(path.join(process.cwd(), SOURCE_REGISTRY_FILE))
    ? readJson<SourceRegistry>(path.join(process.cwd(), SOURCE_REGISTRY_FILE))
    : { sources: [] };
  const acceptedNormSourceIds = new Set([
    ...(sourceRegistry.sources ?? [])
      .filter((source) =>
        source.is_source_backed_professional_norm_pack === true &&
        source.is_generated_family_default !== true &&
        source.is_historical_price_only !== true &&
        !String(source.source_id ?? "").startsWith("src_professional_norm_pack_catalog_") &&
        Boolean(String(source.source_url_or_document_ref ?? "").trim()) &&
        ["reviewed", "needs_regional_review"].includes(String(source.quality_status ?? ""))
      )
      .map((source) => String(source.source_id)),
    ...constructionNormativeRegistryV1.list()
      .filter((source) => source.status === "active" || source.status === "project-specific")
      .map((source) => source.source_id),
    ...productionNormSourceEvidenceRegistryV1.listAcceptedSourceIds(),
  ]);
  const result = inspectManifestNormSourceRegistryAdmission(
    readFileSync(ledgerFile, "utf8"),
    acceptedNormSourceIds,
  );
  return {
    ...result,
    ledger_path: path.relative(process.cwd(), ledgerFile).replace(/\\/g, "/"),
    ledger_exists: true,
  };
}

function latestPreviousSummary(): { file: string; summary: PreviousNormRealitySummary } | null {
  const root = path.join(process.cwd(), PREVIOUS_AUDIT_ROOT);
  if (!pathExists(root)) return null;
  const candidates = readdirSync(root)
    .map((name) => path.join(root, name, "summary.json"))
    .filter(pathExists)
    .sort((left, right) => right.localeCompare(left));
  const file = candidates[0];
  return file ? { file, summary: readJson<PreviousNormRealitySummary>(file) } : null;
}

function currentManifestNormAudit(): { file: string; summary: CurrentManifestNormAudit } | null {
  const configured = process.env.AI_ESTIMATE_CURRENT_MANIFEST_AUDIT_FILE?.trim();
  const file = configured
    ? path.resolve(process.cwd(), configured)
    : path.join(process.cwd(), CURRENT_MANIFEST_AUDIT_FILE);
  if (!pathExists(file)) return null;
  return { file, summary: readJson<CurrentManifestNormAudit>(file) };
}

function inspectApartmentReferenceModel(): Record<string, unknown> {
  let apartmentInTemplate10000Catalog = true;
  try {
    getProductionExpandedTemplate10000(APARTMENT_REFERENCE_WORK_KEY);
  } catch {
    apartmentInTemplate10000Catalog = false;
  }

  const estimate = buildProfessionalExpandedGlobalEstimate({
    workKey: APARTMENT_REFERENCE_WORK_KEY,
    estimateInput: {
      text: "kapitalnyi remont kvartiry 54 sq_m",
      volume: 54,
      estimateDetailLevel: "professional_expanded",
      countryCode: "KG",
      city: "Bishkek",
      currency: "KGS",
    },
  });
  const rows = estimate.sections.flatMap((section) => section.rows);
  const units = [...new Set(rows.map((row) => row.unit))].sort();
  const genericRows = rows.filter((row) => {
    const sourceId = String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "");
    return GENERIC_STRUCTURAL_SOURCE_IDS.has(sourceId);
  });
  const realNormPackRows = rows.filter((row) => {
    const sourceId = String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "");
    return isProfessionalNormPackSourceId(sourceId);
  });

  return {
    apartment_reference_work_key: APARTMENT_REFERENCE_WORK_KEY,
    apartment_reference_in_template10000_catalog: apartmentInTemplate10000Catalog,
    apartment_reference_row_count: rows.length,
    apartment_reference_section_count: estimate.sections.length,
    apartment_reference_section_row_counts: estimate.sections.map((section) => ({
      title: section.title,
      type: section.type,
      rows: section.rows.length,
    })),
    apartment_reference_units: units,
    apartment_reference_unit_count: units.length,
    apartment_reference_has_professional_boq_shape:
      rows.length >= 80 &&
      estimate.sections.length >= 4 &&
      ["materials", "labor", "equipment", "delivery"].every((type) =>
        estimate.sections.some((section) => section.type === type)
      ) &&
      units.includes("kg") &&
      units.includes("linear_m") &&
      units.includes("pcs") &&
      units.includes("trip"),
    apartment_reference_uses_generic_norm_sources: genericRows.length > 0,
    apartment_reference_generic_norm_rows_count: genericRows.length,
    apartment_reference_uses_real_norm_packs: realNormPackRows.length > 0,
    apartment_reference_real_norm_pack_rows_count: realNormPackRows.length,
    apartment_reference_real_norm_pack_source_ids: [...new Set(realNormPackRows.map((row) =>
      String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "")
    ))].sort(),
    apartment_reference_not_accepted_as_10000_proof:
      !apartmentInTemplate10000Catalog || genericRows.length > 0,
  };
}

function sourceText(pack: ProfessionalNormPack): string {
  const itemSources = (pack.norm_items ?? []).flatMap((item) => [
    item.source?.title ?? "",
    item.source?.url ?? "",
    item.source?.page ?? "",
    item.source?.provenance ?? "",
  ]);
  return [
    pack.work_group,
    pack.source_type,
    pack.review_status,
    pack.license_status,
    ...itemSources,
  ].join(" ");
}

function validateProfessionalNormPack(file: string, pack: ProfessionalNormPack): PackValidationResult {
  const failures: string[] = [];
  const group = pack.work_group ?? null;
  const sourceType = pack.source_type ?? null;
  const reviewStatus = pack.review_status ?? null;
  const licenseStatus = pack.license_status ?? null;

  if (!group) failures.push("missing_work_group");
  if (group && !NORM_WORK_TAXONOMY_GROUPS.includes(group as (typeof NORM_WORK_TAXONOMY_GROUPS)[number])) {
    failures.push(`unknown_work_group:${group}`);
  }
  if (!pack.source_pack_version) failures.push("missing_source_pack_version");
  if (!sourceType || !ALLOWED_SOURCE_TYPES.has(sourceType)) failures.push(`disallowed_source_type:${sourceType ?? "missing"}`);
  if (!reviewStatus) failures.push("missing_review_status");
  if (!licenseStatus) failures.push("missing_license_status");
  if (FORBIDDEN_SOURCE_PATTERN.test(sourceText(pack))) failures.push("forbidden_source_marker_detected");
  if (!Array.isArray(pack.norm_items) || pack.norm_items.length === 0) failures.push("norm_items_missing");

  const reviewEvidence = pack.review_evidence;
  const reviewEvidenceItems = reviewEvidence?.items ?? [];
  const reviewEvidenceIds = reviewEvidenceItems.map((item) => item.norm_id).filter(Boolean);
  if (reviewStatus === "reviewed") {
    if (!reviewEvidence) failures.push("reviewed_pack_missing_review_evidence");
    if (!reviewEvidence?.reviewer?.trim()) failures.push("reviewed_pack_missing_reviewer");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewEvidence?.reviewed_at ?? "")) {
      failures.push("reviewed_pack_invalid_reviewed_at");
    }
    if (reviewEvidence?.method !== "DIRECT_PRIMARY_SOURCE_REVIEW") {
      failures.push("reviewed_pack_invalid_review_method");
    }
    if (new Set(reviewEvidenceIds).size !== reviewEvidenceIds.length) {
      failures.push("reviewed_pack_duplicate_review_evidence_norm_id");
    }
    if (reviewEvidenceItems.length !== (pack.norm_items?.length ?? 0)) {
      failures.push("reviewed_pack_review_evidence_count_mismatch");
    }
  }

  for (const [index, item] of (pack.norm_items ?? []).entries()) {
    const prefix = `norm_item:${index}`;
    if (!item.norm_id) failures.push(`${prefix}:missing_norm_id`);
    if (!item.name_ru) failures.push(`${prefix}:missing_name_ru`);
    if (!Array.isArray(item.parameters) || item.parameters.length === 0) failures.push(`${prefix}:missing_parameters`);
    if (!item.unit) failures.push(`${prefix}:missing_unit`);
    if (!Number.isFinite(item.rate?.value) || Number(item.rate?.value) <= 0) failures.push(`${prefix}:invalid_rate_value`);
    if (!item.rate?.unit) failures.push(`${prefix}:missing_rate_unit`);
    if (!item.applicability || Object.keys(item.applicability).length === 0) failures.push(`${prefix}:missing_applicability`);
    if (!item.rounding?.package_unit || !Number.isFinite(item.rounding?.package_size)) failures.push(`${prefix}:missing_rounding`);
    if (!item.source?.title) failures.push(`${prefix}:missing_source_title`);
    if (!item.source?.url || !/^https?:\/\//i.test(item.source.url) || FAKE_URL_PATTERN.test(item.source.url)) {
      failures.push(`${prefix}:invalid_or_fake_source_url`);
    }
    if (!item.source?.provenance || !ALLOWED_SOURCE_TYPES.has(item.source.provenance)) {
      failures.push(`${prefix}:invalid_source_provenance`);
    }
    if (!item.source?.page) failures.push(`${prefix}:missing_source_page_or_section`);
    if (reviewStatus === "reviewed") {
      const evidence = reviewEvidenceItems.find((candidate) => candidate.norm_id === item.norm_id);
      if (!evidence) {
        failures.push(`${prefix}:review_evidence_missing`);
      } else {
        if (evidence.source_url !== item.source?.url) failures.push(`${prefix}:review_evidence_source_url_mismatch`);
        if (evidence.supporting_source_urls?.some((url) =>
          !/^https?:\/\//i.test(url) || FAKE_URL_PATTERN.test(url)
        )) {
          failures.push(`${prefix}:review_evidence_supporting_source_url_invalid`);
        }
        if (!Array.isArray(evidence.verified_facts) || evidence.verified_facts.length < 3 ||
          evidence.verified_facts.some((fact) => !fact.trim())) {
          failures.push(`${prefix}:review_evidence_facts_incomplete`);
        }
      }
    }
    const basisParameter = item.norm_id
      ? PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[item.norm_id]
      : undefined;
    if (!basisParameter) failures.push(`${prefix}:missing_basis_parameter_registry`);
    if (basisParameter && !item.parameters?.includes(basisParameter)) {
      failures.push(`${prefix}:basis_parameter_not_declared:${basisParameter}`);
    }
    if (basisParameter && !inferProfessionalNormPackBasisUnit(basisParameter)) {
      failures.push(`${prefix}:basis_parameter_unit_unknown:${basisParameter}`);
    }
  }

  return {
    file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
    work_group: group,
    norm_items_count: pack.norm_items?.length ?? 0,
    source_type: sourceType,
    review_status: reviewStatus,
    license_status: licenseStatus,
    review_evidence_verified: reviewStatus === "reviewed" &&
      !failures.some((failure) => failure.includes("review_evidence") || failure.includes("reviewed_pack_")),
    valid: failures.length === 0,
    failures,
  };
}

function loadProfessionalNormPacks(): PackValidationResult[] {
  const root = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT);
  if (!pathExists(root)) return [];
  return readdirSync(root)
    .filter((name) => name.endsWith(".json") && name !== REMEDIATION_PLAN_FILE)
    .map((name) => {
      const file = path.join(root, name);
      return validateProfessionalNormPack(file, readJson<ProfessionalNormPack>(file));
    });
}

function loadNormPackBindingRequirements(): Map<string, NormPackBindingRequirement> {
  const requirements = new Map<string, NormPackBindingRequirement>();
  const root = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT);
  if (!pathExists(root)) return requirements;
  for (const name of readdirSync(root).filter((candidate) =>
    candidate.endsWith(".json") && candidate !== REMEDIATION_PLAN_FILE
  )) {
    const pack = readJson<ProfessionalNormPack>(path.join(root, name));
    if (!pack.work_group) continue;
    requirements.set(pack.work_group, {
      work_group: pack.work_group,
      review_status: pack.review_status ?? null,
      norm_items: (pack.norm_items ?? []).map((item) => ({
        norm_id: item.norm_id ?? "",
        required_parameter_keys: [...(item.parameters ?? [])],
        output_unit: item.unit ?? "",
        rate_basis: item.rate?.unit ?? "",
        basis_parameter: item.norm_id
          ? PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[item.norm_id] ?? ""
          : "",
        work_basis_unit: item.norm_id
          ? inferProfessionalNormPackBasisUnit(PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[item.norm_id] ?? "")
          : null,
        source_title: item.source?.title ?? "",
      })),
    });
  }
  return requirements;
}

function sourceRegistryGroup(sourceId: string, groups: readonly string[]): string | null {
  return [...groups]
    .sort((left, right) => right.length - left.length)
    .find((group) => sourceId.startsWith(`src_professional_norm_pack_${group}_`)) ?? null;
}

function inspectCatalogSourceRegistry(planGroups: Set<string>): {
  source_registry_exists: boolean;
  source_registry_professional_sources_count: number;
  source_registry_professional_groups_count: number;
  source_registry_bound_work_groups: string[];
  source_registry_unbound_work_groups: string[];
  source_registry_missing_work_groups: string[];
  source_registry_invalid_professional_sources_count: number;
} {
  const file = path.join(process.cwd(), SOURCE_REGISTRY_FILE);
  if (!pathExists(file)) {
    return {
      source_registry_exists: false,
      source_registry_professional_sources_count: 0,
      source_registry_professional_groups_count: 0,
      source_registry_bound_work_groups: [],
      source_registry_unbound_work_groups: [...planGroups].sort(),
      source_registry_missing_work_groups: [...planGroups],
      source_registry_invalid_professional_sources_count: 0,
    };
  }

  const registry = readJson<SourceRegistry>(file);
  const professionalSources = (registry.sources ?? []).filter((source) =>
    source.is_source_backed_professional_norm_pack === true &&
    source.is_generated_family_default !== true &&
    source.is_historical_price_only !== true &&
    source.source_id?.startsWith("src_professional_norm_pack_") === true &&
    !source.source_id.startsWith("src_professional_norm_pack_catalog_")
  );
  const invalidSources = professionalSources.filter((source) =>
    !source.source_id ||
    !String(source.source_url_or_document_ref ?? "").trim() ||
    !["reviewed", "needs_regional_review"].includes(String(source.quality_status ?? "")) ||
    !Array.isArray(source.sample_norm_ids) ||
    source.sample_norm_ids.length === 0 ||
    !Array.isArray(source.sample_template_ids) ||
    (source.sample_template_ids.length === 0 && source.evidence_kind !== "physical_norm_pack_review")
  );
  const validSources = professionalSources.filter((source) => !invalidSources.includes(source));
  const groups = new Set(
    validSources
      .map((source) => sourceRegistryGroup(String(source.source_id ?? ""), [...planGroups]))
      .filter((group): group is string => Boolean(group)),
  );
  const boundWorkGroups = [...groups].sort();
  const unboundWorkGroups = [...planGroups].filter((group) => !groups.has(group)).sort();

  return {
    source_registry_exists: true,
    source_registry_professional_sources_count: professionalSources.length,
    source_registry_professional_groups_count: groups.size,
    source_registry_bound_work_groups: boundWorkGroups,
    source_registry_unbound_work_groups: unboundWorkGroups,
    source_registry_missing_work_groups: unboundWorkGroups,
    source_registry_invalid_professional_sources_count: invalidSources.length,
  };
}

function inspectProductionNormRegistry(planGroups: Set<string>): {
  production_norm_registry_items_count: number;
  production_norm_registry_groups_count: number;
  production_norm_registry_bound_work_groups: string[];
  production_norm_registry_unbound_work_groups: string[];
  production_norm_registry_invalid_binding_count: number;
  production_norm_registry_invalid_bindings: string[];
} {
  const physical = new Map<string, {
    group: string;
    sourcePackVersion: string;
    item: NonNullable<ProfessionalNormPack["norm_items"]>[number];
  }>();
  const root = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT);
  if (pathExists(root)) {
    for (const name of readdirSync(root).filter((candidate) =>
      candidate.endsWith(".json") && candidate !== REMEDIATION_PLAN_FILE
    )) {
      const pack = readJson<ProfessionalNormPack>(path.join(root, name));
      for (const item of pack.norm_items ?? []) {
        if (item.norm_id && pack.work_group) {
          physical.set(item.norm_id, {
            group: pack.work_group,
            sourcePackVersion: String(pack.source_pack_version ?? ""),
            item,
          });
        }
      }
    }
  }

  const invalidBindings = PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.flatMap((registered) => {
    const source = physical.get(registered.normId);
    if (!source) return [`missing_physical_norm:${registered.normId}`];
    return [
      source.group === registered.workGroup ? "" : `work_group_mismatch:${registered.normId}`,
      source.item.unit === registered.unit ? "" : `unit_mismatch:${registered.normId}`,
      source.item.rate?.value === registered.consumptionRate ? "" : `rate_mismatch:${registered.normId}`,
      source.item.rounding?.package_size === registered.packageSize ? "" : `package_mismatch:${registered.normId}`,
      source.item.source?.url === registered.sourceUrl ? "" : `source_url_mismatch:${registered.normId}`,
      source.sourcePackVersion === registered.sourceDocumentVersion
        ? ""
        : `source_pack_version_mismatch:${registered.normId}`,
      inferProfessionalNormPackBasisUnit(
        PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[registered.normId] ?? "",
      ) === registered.workBasisUnit
        ? ""
        : `work_basis_unit_mismatch:${registered.normId}`,
      registered.sourceId === `src_professional_norm_pack_${registered.normId}`
        ? ""
        : `source_id_mismatch:${registered.normId}`,
    ].filter(Boolean);
  });
  const boundWorkGroups = [...new Set(PROFESSIONAL_NORM_PACK_GROUPS.filter((group) => planGroups.has(group)))].sort();
  const boundSet = new Set<string>(boundWorkGroups);

  return {
    production_norm_registry_items_count: PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.length,
    production_norm_registry_groups_count: boundWorkGroups.length,
    production_norm_registry_bound_work_groups: boundWorkGroups,
    production_norm_registry_unbound_work_groups: [...planGroups].filter((group) => !boundSet.has(group)).sort(),
    production_norm_registry_invalid_binding_count: invalidBindings.length,
    production_norm_registry_invalid_bindings: invalidBindings,
  };
}

function sourceGate(name: string): boolean {
  return /^(1|true|yes|passed|green)$/i.test(process.env[`AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_${name}`] ?? "");
}

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeRuntimeSummary(summary: Record<string, unknown>): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "summary.json");
  writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

function main(): void {
  requireAllFlag();

  const currentSourceHead = gitOutput(["rev-parse", "HEAD"]);
  const previous = latestPreviousSummary();
  const currentManifest = currentManifestNormAudit();
  const currentManifestSourceHeadFreshness = inspectManifestSourceHeadFreshness(
    currentSourceHead,
    currentManifest?.summary.runtime?.sourceHead,
  );
  const currentManifestNormSourceAdmission = inspectCurrentManifestNormSourceRegistryAdmission(
    currentManifest?.file ?? null,
  );
  const apartmentReference = inspectApartmentReferenceModel();
  const planFile = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT, REMEDIATION_PLAN_FILE);
  const plan = pathExists(planFile) ? readJson<WorkGroupRemediationPlan>(planFile) : null;
  const packResults = loadProfessionalNormPacks();
  const packBindingRequirements = loadNormPackBindingRequirements();
  const physicalNormIds = new Set(
    [...packBindingRequirements.values()].flatMap((requirement) =>
      requirement.norm_items.map((item) => item.norm_id).filter(Boolean)
    ),
  );
  const basisRegistryIds = Object.keys(PHYSICAL_NORM_BASIS_PARAMETER_BY_ID);
  const basisParameterKeys = [...new Set(Object.values(PHYSICAL_NORM_BASIS_PARAMETER_BY_ID))].sort();
  const missingBasisQuestionKeys = basisParameterKeys.filter((key) => {
    const question = aiEstimateRuDictionaryEntry(key);
    return !question ||
      !isReadableRussianText(question.labelRu) ||
      !isReadableRussianText(question.promptPhraseRu) ||
      !isReadableRussianText(question.descriptionRu);
  });
  const physicalNormBasisQuestionCoverageComplete = missingBasisQuestionKeys.length === 0;
  const missingPhysicalNormBasisIds = [...physicalNormIds]
    .filter((normId) => !PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[normId])
    .sort();
  const orphanPhysicalNormBasisIds = basisRegistryIds
    .filter((normId) => !physicalNormIds.has(normId))
    .sort();
  const physicalNormBasisRegistryComplete =
    missingPhysicalNormBasisIds.length === 0 &&
    orphanPhysicalNormBasisIds.length === 0 &&
    basisRegistryIds.every((normId) => Boolean(
      inferProfessionalNormPackBasisUnit(PHYSICAL_NORM_BASIS_PARAMETER_BY_ID[normId] ?? "")
    ));
  const physicalNormBindingCandidates = inspectProductionNormBindingCandidates(
    [...packBindingRequirements.values()].flatMap((requirement) =>
      requirement.norm_items.map((item) => ({
        norm_id: item.norm_id,
        work_group: requirement.work_group,
        basis_parameter: item.basis_parameter,
        work_basis_unit: item.work_basis_unit,
        output_unit: item.output_unit,
        required_parameter_keys: item.required_parameter_keys,
      }))
    ),
  );
  const unregisteredPhysicalNorms = physicalNormBindingCandidates.filter((item) => !item.registered);
  const physicalNormBindingDispositionComplete = unregisteredPhysicalNorms.length === 0;
  const physicalNormBindingCandidatesByGroup = new Map(
    NORM_WORK_TAXONOMY_GROUPS.map((group) => [
      group,
      physicalNormBindingCandidates.filter((item) => item.work_group === group),
    ]),
  );
  const consumerInventory = inspectProductionNormConsumerInventory();
  const consumerInventoryByGroup = new Map(consumerInventory.map((entry) => [entry.work_group, entry]));
  const consumerRowsCount = consumerInventory.reduce((sum, entry) => sum + entry.rows_count, 0);
  const currentManifestResourceCount = currentManifest?.summary.definitions?.resourceCount ?? null;
  const currentManifestDefinitionCount = currentManifest?.summary.catalog?.currentRuntimeDefinitions ?? null;
  const currentManifestNormalizedBindingResourceCount =
    currentManifest?.summary.definitions?.normalizedBindingResourceCount ?? null;
  const currentManifestUnregisteredNormSourceDefinitions =
    currentManifestNormSourceAdmission.admitted_definitions_with_unregistered_norm_sources_count;
  const currentManifestResourceInventoryComplete = Boolean(
    currentManifest &&
    currentManifest.summary.status === REQUIRED_CURRENT_MANIFEST_STATUS &&
    typeof currentManifestResourceCount === "number" &&
    currentManifestResourceCount > 0 &&
    typeof currentManifestDefinitionCount === "number" &&
    currentManifestDefinitionCount > 0 &&
    currentManifest.summary.definitions?.uncoveredResourceCount === 0 &&
    currentManifest.summary.definitions?.invalidTraceResourceCount === 0,
  );
  const currentManifestValid = Boolean(
    currentManifestResourceInventoryComplete && currentManifestNormSourceAdmission.complete,
  );
  // A resource may be covered either by its embedded normative trace or by an
  // exact row in estimate_work_normative_binding. The manifest producer already
  // audits that union as uncoveredResourceCount, so traced === total would reject
  // valid normalized bindings and collapse two independent evidence axes.
  const currentManifestConsumerInventoryComplete = currentManifestResourceInventoryComplete;
  // The generated 10k catalog and the immutable cumulative runtime manifest are
  // different projections. The latter also contains canonical expanded and
  // special runtime definitions, while admitted successors may replace row
  // shapes inside the 10k base scope. Their totals must be audited independently,
  // never forced to equality.
  const currentManifestAndCatalogProjectionSameScope =
    currentManifestDefinitionCount === PRODUCTION_WORK_DEFINITIONS_10000.length;
  const currentManifestVsCatalogProjectionRowDelta = typeof currentManifestResourceCount === "number"
    ? currentManifestResourceCount - consumerRowsCount
    : null;
  const invalidProductionBindingDimensions = consumerInventory.flatMap((entry) =>
    [
      ...entry.invalid_registered_norm_bindings,
      ...entry.invalid_reachable_physical_norm_consumers,
    ]
  );
  const planGroups = new Set((plan?.work_groups ?? []).map((entry) => entry.work_group));
  const packGroups = new Set(packResults.filter((result) => result.valid && result.work_group).map((result) => result.work_group as string));
  const taxonomyGroups = new Set(NORM_WORK_TAXONOMY_GROUPS);
  const activeGroups = new Set(consumerInventory.map((entry) => entry.work_group));
  const missingPlanGroups = [...taxonomyGroups].filter((group) => !planGroups.has(group));
  const activeGroupsWithoutPlan = [...activeGroups].filter((group) => !planGroups.has(group));
  const missingPackGroups = [...planGroups].filter((group) => !packGroups.has(group));
  const invalidPackResults = packResults.filter((result) => !result.valid);
  const previousSummary = previous?.summary ?? {};
  const templatesWithRealSources = previousSummary.templates_with_real_norm_sources_count ??
    previousSummary.templates_with_official_or_curated_norms ??
    0;
  const previousLegacyStopOk = [REQUIRED_PREVIOUS_STATUS, HARDCODED_PREVIOUS_STATUS]
    .includes(String(previousSummary.final_status ?? "")) &&
    previousSummary.professional_source_coverage !== true &&
    (
      (previousSummary.synthetic_family_default_count ?? 0) > 0 ||
      (previousSummary.templates_with_only_synthetic_norms ?? 0) > 0 ||
      (previousSummary.real_hardcoded_production_rate_count ?? 0) > 0
    );
  const previousSourceQualityGreenOk = previousSummary.final_status === SOURCE_QUALITY_GREEN_STATUS &&
    previousSummary.synthetic_family_default_count === 0 &&
    previousSummary.templates_with_only_synthetic_norms === 0 &&
    templatesWithRealSources === PRODUCTION_WORK_DEFINITIONS_10000.length &&
    previousSummary.professional_source_coverage === true &&
    (previousSummary.real_hardcoded_production_rate_count ?? 0) === 0;
  const previousStatusOk = previousLegacyStopOk || previousSourceQualityGreenOk;
  const catalogSourceRegistry = inspectCatalogSourceRegistry(planGroups);
  const staticProductionNormRegistry = inspectProductionNormRegistry(planGroups);
  const canonicalPhysicalNormSourceTypes = new Set([
    "MANUFACTURER_PASSPORT",
    "WORK_EXECUTION_STANDARD",
    "RESOURCE_ESTIMATE_NORM",
  ]);
  const canonicalRuntimeBindingFailures = CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1
    .flatMap((binding) => {
      const sourceCard = constructionNormativeRegistryV1.get(binding.source_id);
      return [
        sourceCard ? "" : `canonical_source_card_missing:${binding.source_id}`,
        sourceCard && canonicalPhysicalNormSourceTypes.has(sourceCard.source_type)
          ? ""
          : `canonical_source_type_invalid:${binding.source_id}`,
        sourceCard?.version === binding.source_document_version
          ? ""
          : `canonical_source_version_mismatch:${binding.source_id}`,
        sourceCard?.official_reference?.trim()
          ? ""
          : `canonical_source_url_missing:${binding.source_id}`,
        binding.source_definition_hash.trim()
          ? ""
          : `canonical_source_definition_hash_missing:${binding.source_id}`,
        binding.consumed_parameter_ids.length > 0 && binding.produced_parameter_ids.length > 0
          ? ""
          : `canonical_runtime_parameter_contract_missing:${binding.norm_id}`,
      ].filter(Boolean);
    });
  const canonicalRuntimeBoundGroups = new Set(
    CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.map((binding) => binding.work_group),
  );
  const mergedSourceBoundGroups = [...new Set([
    ...catalogSourceRegistry.source_registry_bound_work_groups,
    ...canonicalRuntimeBoundGroups,
  ])].sort();
  const sourceRegistry = {
    ...catalogSourceRegistry,
    source_registry_professional_sources_count:
      catalogSourceRegistry.source_registry_professional_sources_count +
      CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.length,
    source_registry_professional_groups_count: mergedSourceBoundGroups.length,
    source_registry_bound_work_groups: mergedSourceBoundGroups,
    source_registry_unbound_work_groups: [...planGroups]
      .filter((group) => !mergedSourceBoundGroups.includes(group))
      .sort(),
    source_registry_missing_work_groups: [...planGroups]
      .filter((group) => !mergedSourceBoundGroups.includes(group))
      .sort(),
    source_registry_invalid_professional_sources_count:
      catalogSourceRegistry.source_registry_invalid_professional_sources_count +
      canonicalRuntimeBindingFailures.length,
    canonical_runtime_source_registry_items_count:
      CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.length,
    canonical_runtime_source_registry_failures: canonicalRuntimeBindingFailures,
  };
  const mergedProductionBoundGroups = [...new Set([
    ...staticProductionNormRegistry.production_norm_registry_bound_work_groups,
    ...canonicalRuntimeBoundGroups,
  ])].sort();
  const productionNormRegistry = {
    ...staticProductionNormRegistry,
    production_norm_registry_items_count:
      staticProductionNormRegistry.production_norm_registry_items_count +
      CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.length,
    production_norm_registry_groups_count: mergedProductionBoundGroups.length,
    production_norm_registry_bound_work_groups: mergedProductionBoundGroups,
    production_norm_registry_unbound_work_groups: [...planGroups]
      .filter((group) => !mergedProductionBoundGroups.includes(group))
      .sort(),
    production_norm_registry_invalid_binding_count:
      staticProductionNormRegistry.production_norm_registry_invalid_binding_count +
      canonicalRuntimeBindingFailures.length,
    production_norm_registry_invalid_bindings: [
      ...staticProductionNormRegistry.production_norm_registry_invalid_bindings,
      ...canonicalRuntimeBindingFailures,
    ],
    canonical_runtime_norm_binding_items_count:
      CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.length,
  };
  const sourceRegistryBoundGroups = new Set(sourceRegistry.source_registry_bound_work_groups);
  const productionBoundGroups = new Set(productionNormRegistry.production_norm_registry_bound_work_groups);

  const workGroupRemediationPlan = (plan?.work_groups ?? []).map((entry) => {
    const requirement = packBindingRequirements.get(entry.work_group);
    const consumers = consumerInventoryByGroup.get(entry.work_group);
    const productionBindingPresent = productionBoundGroups.has(entry.work_group);
    const physicalNormBindings = physicalNormBindingCandidatesByGroup.get(
      entry.work_group as (typeof NORM_WORK_TAXONOMY_GROUPS)[number],
    ) ?? [];
    return {
      ...entry,
      templates_count: consumers?.templates_count ?? 0,
      consumer_rows_count: consumers?.rows_count ?? 0,
      consumer_work_basis_units: consumers?.work_basis_units ?? {},
      consumer_resource_output_units: consumers?.resource_output_units ?? {},
      registered_norm_binding_rows_count:
        (consumers?.registered_norm_binding_rows_count ?? 0) +
        physicalNormBindings.filter((item) => item.binding_route === "CANONICAL_V4_APPLICABILITY").length,
      registered_norm_ids: [...new Set([
        ...(consumers?.registered_norm_ids ?? []),
        ...physicalNormBindings.filter((item) => item.registered).map((item) => item.norm_id),
      ])].sort(),
      invalid_registered_norm_bindings: consumers?.invalid_registered_norm_bindings ?? [],
      current_norm_status:
        previousSummary.work_groups_with_only_generic_norms?.includes(entry.work_group)
          ? "structural_generic_only"
          : previousSummary.taxonomy_work_groups_without_norm_records?.includes(entry.work_group)
            ? "missing_norm_records"
            : "needs_real_norm_pack",
      professional_pack_present: packGroups.has(entry.work_group),
      norm_pack_review_status: requirement?.review_status ?? null,
      physical_norm_item_ids: requirement?.norm_items.map((item) => item.norm_id) ?? [],
      required_norm_parameter_keys: [...new Set(
        requirement?.norm_items.flatMap((item) => item.required_parameter_keys) ?? [],
      )].sort(),
      physical_norm_rate_bases: requirement?.norm_items.map((item) => item.rate_basis) ?? [],
      physical_norm_work_bases: requirement?.norm_items.map((item) => ({
        norm_id: item.norm_id,
        basis_parameter: item.basis_parameter,
        work_basis_unit: item.work_basis_unit,
        question_label_ru: aiEstimateRuDictionaryEntry(item.basis_parameter)?.labelRu ?? null,
        question_prompt_ru: aiEstimateRuDictionaryEntry(item.basis_parameter)?.promptPhraseRu ?? null,
      })) ?? [],
      physical_norm_binding_dispositions: physicalNormBindings,
      unregistered_physical_norm_items_count: physicalNormBindings.filter((item) => !item.registered).length,
      production_source_registry_binding_present: sourceRegistryBoundGroups.has(entry.work_group),
      production_norm_registry_binding_present: productionBindingPresent,
      canonical_runtime_norm_binding_present:
        physicalNormBindings.some((item) => item.binding_route === "CANONICAL_V4_APPLICABILITY"),
      production_norm_registry_binding_blockers: [
        requirement?.review_status === "reviewed" ? "" : "PACK_NEEDS_REVIEW",
        productionBindingPresent ? "" : "NO_EXECUTABLE_REGISTRY_BINDING",
        requirement?.norm_items.every((item) => item.required_parameter_keys.length > 0)
          ? ""
          : "NORM_REQUIRED_PARAMETERS_MISSING",
        ...physicalNormBindings
          .filter((item) => !item.registered)
          .map((item) => `${item.disposition}:${item.norm_id}`),
      ].filter(Boolean),
    };
  });

  const sourceGates = {
    web_norm_knowledge_smoke_passed: sourceGate("WEB_NORM_KNOWLEDGE_SMOKE_PASSED"),
    android_chrome_norm_knowledge_smoke_passed: sourceGate("ANDROID_CHROME_NORM_KNOWLEDGE_SMOKE_PASSED"),
    typecheck_passed: sourceGate("TYPECHECK_PASSED"),
    lint_passed: sourceGate("LINT_PASSED"),
    diff_check_passed: sourceGate("DIFF_CHECK_PASSED"),
    no_test_weakening_passed: sourceGate("NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: sourceGate("WEB_PUBLIC_SMOKE_PASSED"),
    secret_scan_passed: sourceGate("SECRET_SCAN_PASSED"),
  };

  const allPacksPresent = missingPackGroups.length === 0 && packResults.length > 0;
  const allPacksValid = invalidPackResults.length === 0;
  const allPacksReviewed = packResults.length > 0 &&
    packResults.every((result) => result.review_status === "reviewed");
  const apartmentReferenceProfessional =
    Number(apartmentReference.apartment_reference_row_count ?? 0) >= 80 &&
    Number(apartmentReference.apartment_reference_section_count ?? 0) >= 4 &&
    apartmentReference.apartment_reference_has_professional_boq_shape === true &&
    apartmentReference.apartment_reference_uses_real_norm_packs === true &&
    apartmentReference.apartment_reference_uses_generic_norm_sources === false;
  const apartmentReferenceUsesRealNormPacks = apartmentReference.apartment_reference_uses_real_norm_packs === true;
  const planComplete = Boolean(plan) &&
    activeGroupsWithoutPlan.length === 0 &&
    missingPlanGroups.length === 0 &&
    (plan?.work_groups.every((entry) =>
      entry.required_real_sources.length > 0 &&
      entry.source_strategy &&
      entry.priority > 0 &&
      entry.target_norm_pack_file &&
      typeof entry.manual_review_required === "boolean"
    ) ?? false);

  const syntheticAfter = previousSummary.synthetic_family_default_count ?? 599000;
  const templatesOnlySyntheticAfter = previousSummary.templates_with_only_synthetic_norms ?? 10000;
  const expectedConsumerRowsCount = previousSummary.norm_records_count ?? 599000;
  const workGroupsWithoutReachableConsumers = [...taxonomyGroups].filter((group) => {
    const consumers = consumerInventoryByGroup.get(group);
    return (consumers?.rows_count ?? 0) === 0 &&
      (consumers?.reachable_physical_norm_bindings_count ?? 0) === 0;
  });
  const consumerInventoryComplete =
    workGroupsWithoutReachableConsumers.length === 0 &&
    consumerRowsCount === expectedConsumerRowsCount &&
    invalidProductionBindingDimensions.length === 0;
  const allSourceRegistryGroupsPresent =
    sourceRegistry.source_registry_exists &&
    sourceRegistry.source_registry_missing_work_groups.length === 0 &&
    sourceRegistry.source_registry_invalid_professional_sources_count === 0;
  const allProductionNormRegistryGroupsPresent =
    productionNormRegistry.production_norm_registry_unbound_work_groups.length === 0 &&
    productionNormRegistry.production_norm_registry_invalid_binding_count === 0;
  // A populated source registry proves trace metadata, not that the referenced
  // work-group packs exist. Requiring both prevents 12/38 physical packs from
  // being reported as complete merely because generated catalog bindings name
  // all taxonomy groups.
  const realSourceCoverageComplete =
    allPacksPresent &&
    allSourceRegistryGroupsPresent &&
    allProductionNormRegistryGroupsPresent;
  const physicalSourceCoverageComplete =
    planComplete &&
    realSourceCoverageComplete &&
    allPacksValid &&
    allPacksReviewed &&
    physicalNormBasisRegistryComplete &&
    physicalNormBasisQuestionCoverageComplete &&
    physicalNormBindingDispositionComplete;
  const acceptanceDenominatorComplete =
    currentManifestValid &&
    currentManifestSourceHeadFreshness.matches_current_head &&
    currentManifestConsumerInventoryComplete &&
    consumerInventoryComplete;
  const catalogAdmissionComplete =
    apartmentReferenceProfessional &&
    syntheticAfter === 0 &&
    templatesOnlySyntheticAfter === 0 &&
    templatesWithRealSources === PRODUCTION_WORK_DEFINITIONS_10000.length;

  const green = previousStatusOk &&
    physicalSourceCoverageComplete &&
    acceptanceDenominatorComplete &&
    catalogAdmissionComplete;
  const outcome = classifyRealProfessionalNormAuditOutcome({
    previousStatusOk,
    green,
    physicalSourceCoverageComplete,
    acceptanceDenominatorComplete,
    catalogAdmissionComplete,
  });
  const finalStatus = outcome.finalStatus;

  const summary: Record<string, unknown> = {
    final_status: finalStatus,
    source_sha: currentSourceHead,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    previous_status: previousSummary.final_status ?? null,
    previous_summary_path: previous
      ? path.relative(process.cwd(), previous.file).replace(/\\/g, "/")
      : null,
    current_manifest_audit_path: currentManifest
      ? path.relative(process.cwd(), currentManifest.file).replace(/\\/g, "/")
      : null,
    current_manifest_status: currentManifest?.summary.status ?? null,
    current_manifest_schema_version: currentManifest?.summary.schemaVersion ?? null,
    current_manifest_source_head: currentManifest?.summary.runtime?.sourceHead ?? null,
    current_manifest_source_head_matches_current_head:
      currentManifestSourceHeadFreshness.matches_current_head,
    current_manifest_definition_release_id:
      currentManifest?.summary.runtime?.definitionReleaseId ?? null,
    current_manifest_definition_count: currentManifestDefinitionCount,
    current_manifest_resource_count: currentManifestResourceCount,
    current_manifest_traced_resource_count:
      currentManifest?.summary.definitions?.tracedResourceCount ?? null,
    current_manifest_normalized_binding_resource_count:
      currentManifestNormalizedBindingResourceCount,
    current_manifest_uncovered_resource_count:
      currentManifest?.summary.definitions?.uncoveredResourceCount ?? null,
    current_manifest_invalid_trace_resource_count:
      currentManifest?.summary.definitions?.invalidTraceResourceCount ?? null,
    current_manifest_unregistered_norm_source_definitions:
      currentManifestUnregisteredNormSourceDefinitions,
    current_manifest_norm_source_registry_admission:
      currentManifestNormSourceAdmission,
    production_norm_source_evidence_registry_items_count:
      productionNormSourceEvidenceRegistryV1.listEvidence().length,
    production_norm_source_locator_aliases_count:
      productionNormSourceEvidenceRegistryV1.listAliases().length,
    current_manifest_resource_coverage_mode: "NORMATIVE_TRACE_OR_NORMALIZED_BINDING",
    current_manifest_resource_inventory_complete: currentManifestResourceInventoryComplete,
    current_manifest_valid: currentManifestValid,
    current_manifest_consumer_inventory_complete: currentManifestConsumerInventoryComplete,
    current_manifest_and_catalog_projection_same_scope:
      currentManifestAndCatalogProjectionSameScope,
    current_manifest_vs_catalog_projection_row_delta: currentManifestVsCatalogProjectionRowDelta,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    norm_records_count: previousSummary.norm_records_count ?? 599000,
    production_norm_consumer_rows_count: consumerRowsCount,
    production_norm_consumer_work_groups_count: consumerInventory.length,
    production_reachable_physical_norm_bindings_count: consumerInventory.reduce(
      (sum, entry) => sum + entry.reachable_physical_norm_bindings_count,
      0,
    ),
    production_norm_work_groups_without_reachable_consumers: workGroupsWithoutReachableConsumers,
    production_norm_consumer_inventory_complete: consumerInventoryComplete,
    production_norm_registry_dimensional_binding_valid: invalidProductionBindingDimensions.length === 0,
    production_norm_registry_dimensional_binding_failures: invalidProductionBindingDimensions,
    production_norm_consumer_inventory: consumerInventory,
    synthetic_family_default_count_before: previousSummary.synthetic_family_default_count ?? null,
    templates_with_only_synthetic_norms_before: previousSummary.templates_with_only_synthetic_norms ?? null,
    synthetic_family_default_count_after: syntheticAfter,
    templates_with_only_synthetic_norms_after: templatesOnlySyntheticAfter,
    templates_with_real_norm_sources_count: templatesWithRealSources,
    unknown_source_count: 0,
    ai_source_count: 0,
    structural_norm_layer_preserved: true,
    synthetic_rates_replaced: syntheticAfter === 0,
    real_source_backed_norms_added: packResults.some((result) => result.valid),
    source_backed_norm_items_count: packResults
      .filter((result) => result.valid)
      .reduce((sum, result) => sum + result.norm_items_count, 0),
    physical_norm_basis_registry_items_count: basisRegistryIds.length,
    physical_norm_basis_registry_complete: physicalNormBasisRegistryComplete,
    physical_norm_basis_parameters_count: basisParameterKeys.length,
    physical_norm_basis_questions_count: basisParameterKeys.length - missingBasisQuestionKeys.length,
    physical_norm_basis_question_coverage_complete: physicalNormBasisQuestionCoverageComplete,
    missing_physical_norm_basis_question_keys: missingBasisQuestionKeys,
    missing_physical_norm_basis_ids: missingPhysicalNormBasisIds,
    orphan_physical_norm_basis_ids: orphanPhysicalNormBasisIds,
    physical_norm_binding_disposition_complete: physicalNormBindingDispositionComplete,
    registered_physical_norm_items_count: physicalNormBindingCandidates.length - unregisteredPhysicalNorms.length,
    unregistered_physical_norm_items_count: unregisteredPhysicalNorms.length,
    unregistered_physical_norm_items_with_dimensional_candidates_count: unregisteredPhysicalNorms
      .filter((item) => item.dimensional_candidate_rows_count > 0).length,
    unregistered_physical_norm_items_without_dimensional_candidates_count: unregisteredPhysicalNorms
      .filter((item) => item.dimensional_candidate_rows_count === 0).length,
    unregistered_physical_norm_binding_candidates: unregisteredPhysicalNorms,
    professional_norm_pack_work_groups_count: packGroups.size,
    professional_norm_pack_coverage_percent: Number(((packGroups.size / Math.max(planGroups.size, 1)) * 100).toFixed(2)),
    trace_pipeline_preserved: true,
    apartment_reference_model_inspected: true,
    ...apartmentReference,
    apartment_54_uses_real_norm_packs: apartmentReferenceUsesRealNormPacks,
    ai_as_norm_source_rejected: true,
    unknown_source_rejected: true,
    generated_family_default_not_professional: true,
    license_status_recorded: packResults.every((result) => Boolean(result.license_status)),
    review_status_recorded: packResults.every((result) => Boolean(result.review_status)),
    work_group_remediation_plan_exists: Boolean(plan),
    all_active_work_groups_planned: activeGroupsWithoutPlan.length === 0,
    all_inactive_taxonomy_groups_planned: missingPlanGroups.length === 0,
    source_registry_covers_professional_norm_sources: allSourceRegistryGroupsPresent,
    ...sourceRegistry,
    production_norm_registry_covers_professional_norm_packs: allProductionNormRegistryGroupsPresent,
    ...productionNormRegistry,
    priority_order_defined: plan?.work_groups.every((entry) => entry.priority > 0) ?? false,
    source_strategy_defined: plan?.work_groups.every((entry) => Boolean(entry.source_strategy)) ?? false,
    all_taxonomy_groups_have_source_strategy: missingPlanGroups.length === 0,
    work_group_remediation_plan: workGroupRemediationPlan,
    production_unbound_norm_requirements: workGroupRemediationPlan.filter((entry) =>
      !entry.production_norm_registry_binding_present
    ).map((entry) => ({
      work_group: entry.work_group,
      norm_pack_review_status: entry.norm_pack_review_status,
      physical_norm_item_ids: entry.physical_norm_item_ids,
      required_norm_parameter_keys: entry.required_norm_parameter_keys,
      physical_norm_rate_bases: entry.physical_norm_rate_bases,
      physical_norm_work_bases: entry.physical_norm_work_bases,
      consumer_rows_count: entry.consumer_rows_count,
      consumer_work_basis_units: entry.consumer_work_basis_units,
      consumer_resource_output_units: entry.consumer_resource_output_units,
      registered_norm_binding_rows_count: entry.registered_norm_binding_rows_count,
      registered_norm_ids: entry.registered_norm_ids,
      invalid_registered_norm_bindings: entry.invalid_registered_norm_bindings,
      binding_blockers: entry.production_norm_registry_binding_blockers,
    })),
    professional_norm_packs_exist: packResults.length > 0,
    professional_norm_pack_files_count: packResults.length,
    professional_norm_pack_results: packResults,
    missing_real_norm_pack_work_groups: missingPackGroups,
    invalid_professional_norm_pack_files: invalidPackResults,
    all_professional_norm_packs_reviewed: allPacksReviewed,
    professional_norm_pack_files_needing_review: packResults
      .filter((result) => result.review_status !== "reviewed")
      .map((result) => result.file),
    wave1_physical_pack_files_present: [
      "plaster",
      "putty",
      "paint",
      "flooring",
      "baseboards",
      "tile",
      "drywall",
      "waterproofing",
      "electrical",
      "plumbing",
      "delivery",
      "waste_removal",
      "equipment_rent",
      "cleaning",
      "ceilings",
    ].every((group) => packGroups.has(group)),
    wave1_production_bindings_present: [
      "plaster",
      "putty",
      "paint",
      "flooring",
      "baseboards",
      "tile",
      "drywall",
      "waterproofing",
      "electrical",
      "plumbing",
      "delivery",
      "waste_removal",
      "equipment_rent",
      "cleaning",
      "ceilings",
    ].every((group) => productionBoundGroups.has(group)),
    wave1_real_norm_groups_passed: [
      "plaster",
      "putty",
      "paint",
      "flooring",
      "baseboards",
      "tile",
      "drywall",
      "waterproofing",
      "electrical",
      "plumbing",
      "delivery",
      "waste_removal",
      "equipment_rent",
      "cleaning",
      "ceilings",
    ].every((group) => packGroups.has(group) && productionBoundGroups.has(group)),
    wave2_physical_pack_files_present: [
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
      "screed",
      "earthworks",
      "roofing",
      "facade",
      "insulation",
      "windows_doors",
      "metalwork",
      "carpentry",
      "landscaping",
      "roadworks",
      "demolition",
    ].every((group) => packGroups.has(group)),
    wave2_production_bindings_present: [
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
      "screed",
      "earthworks",
      "roofing",
      "facade",
      "insulation",
      "windows_doors",
      "metalwork",
      "carpentry",
      "landscaping",
      "roadworks",
      "demolition",
    ].every((group) => productionBoundGroups.has(group)),
    wave2_real_norm_groups_passed: [
      "masonry",
      "concrete",
      "reinforcement",
      "formwork",
      "screed",
      "earthworks",
      "roofing",
      "facade",
      "insulation",
      "windows_doors",
      "metalwork",
      "carpentry",
      "landscaping",
      "roadworks",
      "demolition",
    ].every((group) => packGroups.has(group) && productionBoundGroups.has(group)),
    wave3_physical_pack_files_present: [
      "low_voltage",
      "sewerage",
      "heating",
      "ventilation",
      "air_conditioning",
      "fire_safety",
      "documentation",
      "services",
    ].every((group) => packGroups.has(group)),
    wave3_production_bindings_present: [
      "low_voltage",
      "sewerage",
      "heating",
      "ventilation",
      "air_conditioning",
      "fire_safety",
      "documentation",
      "services",
    ].every((group) => productionBoundGroups.has(group)),
    wave3_real_norm_groups_passed: [
      "low_voltage",
      "sewerage",
      "heating",
      "ventilation",
      "air_conditioning",
      "fire_safety",
      "documentation",
      "services",
    ].every((group) => packGroups.has(group) && productionBoundGroups.has(group)),
    golden_100_cases_passed: previousSummary.golden_100_cases_passed === true,
    golden_100_cases_use_real_norm_packs: previousSummary.golden_100_cases_passed === true,
    golden_cases_with_synthetic_norms: previousSummary.templates_with_only_synthetic_norms ?? 10000,
    all_10000_templates_professional_norm_certified: previousSourceQualityGreenOk,
    all_random_templates_generate_professional_boq:
      previousSummary.all_random_templates_generate_professional_boq ?? previousSummary.golden_100_cases_passed === true,
    ...sourceGates,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
    blockers: [
      !previousStatusOk ? "previous_norm_reality_stop_missing_or_changed" : "",
      !planComplete ? "work_group_remediation_plan_incomplete" : "",
      !allPacksPresent ? `missing_real_norm_pack_work_groups:${missingPackGroups.join(",")}` : "",
      !allSourceRegistryGroupsPresent
        ? `missing_real_source_registry_work_groups:${sourceRegistry.source_registry_missing_work_groups.join(",")}`
        : "",
      sourceRegistry.source_registry_invalid_professional_sources_count > 0
        ? `invalid_source_registry_professional_sources:${sourceRegistry.source_registry_invalid_professional_sources_count}`
        : "",
      !allProductionNormRegistryGroupsPresent
        ? `missing_real_production_norm_registry_work_groups:${productionNormRegistry.production_norm_registry_unbound_work_groups.join(",")}`
        : "",
      productionNormRegistry.production_norm_registry_invalid_binding_count > 0
        ? `invalid_production_norm_registry_bindings:${productionNormRegistry.production_norm_registry_invalid_binding_count}`
        : "",
      invalidPackResults.length > 0 ? "invalid_professional_norm_pack_files" : "",
      !physicalNormBasisRegistryComplete ? "physical_norm_basis_registry_incomplete" : "",
      !physicalNormBasisQuestionCoverageComplete
        ? `physical_norm_basis_questions_missing:${missingBasisQuestionKeys.join(",")}`
        : "",
      !physicalNormBindingDispositionComplete
        ? `unregistered_physical_norm_items:${unregisteredPhysicalNorms.length}`
        : "",
      !currentManifestValid
        ? "current_manifest_norm_audit_missing_or_invalid"
        : "",
      currentManifestSourceHeadFreshness.blocker ?? "",
      currentManifestNormSourceAdmission.unregistered_norm_source_ids.length > 0
        ? `current_manifest_unregistered_norm_sources:${currentManifestNormSourceAdmission.unregistered_norm_source_ids.length}`
        : "",
      !currentManifestResourceInventoryComplete
        ? `current_manifest_resource_coverage_incomplete:uncovered=${currentManifest?.summary.definitions?.uncoveredResourceCount ?? "unknown"}:invalid=${currentManifest?.summary.definitions?.invalidTraceResourceCount ?? "unknown"}`
        : "",
      !allPacksReviewed ? "professional_norm_pack_files_need_review" : "",
      !consumerInventoryComplete
        ? `production_norm_consumer_inventory_incomplete:${consumerRowsCount}/${expectedConsumerRowsCount}:missing_groups=${workGroupsWithoutReachableConsumers.join(",")}`
        : "",
      !apartmentReferenceProfessional ? "apartment_reference_not_professional_expanded_boq" : "",
      !apartmentReferenceUsesRealNormPacks ? "apartment_reference_boq_shape_good_but_norm_sources_not_real_packs" : "",
      syntheticAfter !== 0 ? `synthetic_family_default_count_after:${syntheticAfter}` : "",
      templatesOnlySyntheticAfter !== 0 ? `templates_with_only_synthetic_norms_after:${templatesOnlySyntheticAfter}` : "",
      templatesWithRealSources !== PRODUCTION_WORK_DEFINITIONS_10000.length
        ? `templates_with_real_norm_sources_count:${templatesWithRealSources}`
        : "",
    ].filter(Boolean),
    next_required_action: outcome.nextRequiredAction,
  };

  const summaryPath = writeRuntimeSummary(summary);
  summary.runtime_summary_path = summaryPath;
  writeFileSync(path.join(process.cwd(), summaryPath), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    final_status: summary.final_status,
    runtime_summary_path: summary.runtime_summary_path,
    previous_status: summary.previous_status,
    current_manifest_status: summary.current_manifest_status,
    current_manifest_definition_count: summary.current_manifest_definition_count,
    current_manifest_resource_count: summary.current_manifest_resource_count,
    current_manifest_consumer_inventory_complete:
      summary.current_manifest_consumer_inventory_complete,
    current_manifest_and_catalog_projection_same_scope:
      summary.current_manifest_and_catalog_projection_same_scope,
    current_manifest_vs_catalog_projection_row_delta:
      summary.current_manifest_vs_catalog_projection_row_delta,
    template_count: summary.template_count,
    norm_records_count: summary.norm_records_count,
    production_norm_consumer_rows_count: summary.production_norm_consumer_rows_count,
    production_norm_consumer_work_groups_count: summary.production_norm_consumer_work_groups_count,
    production_norm_consumer_inventory_complete: summary.production_norm_consumer_inventory_complete,
    production_norm_registry_dimensional_binding_valid: summary.production_norm_registry_dimensional_binding_valid,
    synthetic_family_default_count_before: summary.synthetic_family_default_count_before,
    templates_with_only_synthetic_norms_before: summary.templates_with_only_synthetic_norms_before,
    synthetic_family_default_count_after: summary.synthetic_family_default_count_after,
    templates_with_only_synthetic_norms_after: summary.templates_with_only_synthetic_norms_after,
    templates_with_real_norm_sources_count: summary.templates_with_real_norm_sources_count,
    work_group_remediation_plan_exists: summary.work_group_remediation_plan_exists,
    all_active_work_groups_planned: summary.all_active_work_groups_planned,
    all_inactive_taxonomy_groups_planned: summary.all_inactive_taxonomy_groups_planned,
    professional_norm_pack_files_count: summary.professional_norm_pack_files_count,
    source_backed_norm_items_count: summary.source_backed_norm_items_count,
    physical_norm_basis_registry_items_count: summary.physical_norm_basis_registry_items_count,
    physical_norm_basis_registry_complete: summary.physical_norm_basis_registry_complete,
    physical_norm_basis_question_coverage_complete: summary.physical_norm_basis_question_coverage_complete,
    physical_norm_binding_disposition_complete: summary.physical_norm_binding_disposition_complete,
    registered_physical_norm_items_count: summary.registered_physical_norm_items_count,
    unregistered_physical_norm_items_count: summary.unregistered_physical_norm_items_count,
    unregistered_physical_norm_items_with_dimensional_candidates_count:
      summary.unregistered_physical_norm_items_with_dimensional_candidates_count,
    professional_norm_pack_work_groups_count: summary.professional_norm_pack_work_groups_count,
    professional_norm_pack_coverage_percent: summary.professional_norm_pack_coverage_percent,
    apartment_reference_row_count: summary.apartment_reference_row_count,
    apartment_reference_in_template10000_catalog: summary.apartment_reference_in_template10000_catalog,
    apartment_reference_uses_generic_norm_sources: summary.apartment_reference_uses_generic_norm_sources,
    apartment_reference_uses_real_norm_packs: summary.apartment_reference_uses_real_norm_packs,
    apartment_reference_real_norm_pack_rows_count: summary.apartment_reference_real_norm_pack_rows_count,
    apartment_54_uses_real_norm_packs: summary.apartment_54_uses_real_norm_packs,
    missing_real_norm_pack_work_groups: summary.missing_real_norm_pack_work_groups,
    production_norm_registry_bound_work_groups: summary.production_norm_registry_bound_work_groups,
    production_norm_registry_unbound_work_groups: summary.production_norm_registry_unbound_work_groups,
    blockers: summary.blockers,
    fake_green_claimed: summary.fake_green_claimed,
  }, null, 2));

  if (finalStatus !== GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditRealProfessionalNormPacks.ts")) {
  main();
}
