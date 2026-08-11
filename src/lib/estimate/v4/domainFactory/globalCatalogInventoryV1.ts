import baseManifestJson from "../../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedTemplatesJson from "../../../../../data/estimate-catalog/expanded-complex/templates.json";

import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import { buildCatalogProfessionalCoverageLedgerV4 } from "../catalogProfessionalCoverageLedgerV4";
import type { ProfessionalEstimateDomainPackageV1 } from "./professionalEstimateDomainFactoryV1";

export type GlobalCatalogReadinessV1 =
  | "UNCLASSIFIED"
  | "CLASSIFIED"
  | "BINDING_READY"
  | "SCHEMA_READY"
  | "NORM_PROFILE_READY"
  | "FORMULA_READY"
  | "RESOURCE_READY"
  | "DETERMINISTIC_COMPILE_GREEN"
  | "DURABLE_GREEN"
  | "DOMAIN_GREEN"
  | "BLOCKED_SOURCE_REQUIRED"
  | "EXCLUDED_WITH_REASON";

export type GlobalCatalogInventoryRowV1 = {
  catalog_id: string;
  work_key: string;
  title_ru: string;
  catalog_group: "base_10000" | "expanded_complex_1610";
  domain_id: string;
  operation_class: string;
  construction_method: string;
  primary_material_or_system: string;
  output_dimension: string;
  new_repair_demolition_state: "NEW" | "REPAIR" | "DEMOLITION" | "UNKNOWN";
  scope_capabilities: readonly string[];
  candidate_canonical_technology_id: string;
  alias_candidate_of: string | null;
  existing_passport_id: string | null;
  existing_schema_id: string | null;
  existing_formula_pack_id: string | null;
  existing_normative_profile_id: string | null;
  current_readiness: GlobalCatalogReadinessV1;
  current_blockers: readonly string[];
  classification_evidence: readonly string[];
  source_hash: string;
  row_hash: string;
};

export type GlobalCatalogInventoryV1 = {
  schema: "global-catalog-11610-inventory:v1";
  catalog_total: 11610;
  rows: readonly GlobalCatalogInventoryRowV1[];
  arithmetic: {
    classified: number;
    unclassified: number;
    bound: number;
    unbound: number;
    domain_denominators: Readonly<Record<string, number>>;
    domain_denominator_sum: number;
    duplicate_catalog_id: number;
    orphan_binding: number;
    silent_exclusion: number;
  };
  readiness_counts: Readonly<Record<GlobalCatalogReadinessV1, number>>;
  baseline: {
    baseline_hash: string;
    readiness_counts: Readonly<Record<GlobalCatalogReadinessV1, number>>;
  };
  delta_from_baseline: {
    changed_records: number;
    readiness_transitions: Readonly<Record<string, number>>;
    overlay_domain_ids: readonly string[];
  };
  inventory_hash: string;
};

export type GlobalCatalogDomainOverlayV1 = {
  domain_package: ProfessionalEstimateDomainPackageV1;
  readiness: "DETERMINISTIC_COMPILE_GREEN" | "DURABLE_GREEN" | "DOMAIN_GREEN";
};

type BaseManifestRow = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string;
  equipment_recipe_id: string;
  unit_policy_id: string;
  work_type: string;
  category: string;
  localized_name_ru: string;
  aliases: string[];
  parameter_schema_status: string;
  formula_status: string;
  material_recipe_status: string;
  labor_recipe_status: string;
  unit_policy_status: string;
  norm_source_status: string;
  calculator_status: string;
  readiness_status: string;
  blocking_reasons: string[];
};

type ExpandedTemplateRow = {
  template_id: string;
  work_family_id: string;
  template_level: string;
  requiredInputs: string[];
  rowGroups: string[];
  pdfPolicy: string;
  buyerHandoffPolicy: string;
};

const baseRows = (baseManifestJson as { templates: BaseManifestRow[] }).templates;
const expandedRows = expandedTemplatesJson as ExpandedTemplateRow[];
const coverageLedger = buildCatalogProfessionalCoverageLedgerV4();
const coverageByCatalogId = new Map(coverageLedger.rows.map((row) => [row.catalogId, row]));

const SCOPE_SUFFIXES = [
  "technical_room",
  "small_area",
  "large_area",
  "wet_zone",
  "high_load",
  "repair",
  "standard",
] as const;

function scopeFromWorkKey(workKey: string): string {
  return SCOPE_SUFFIXES.find((suffix) => workKey.endsWith(`_${suffix}`)) ?? "record_specific";
}

function stripScope(workKey: string): string {
  const scope = scopeFromWorkKey(workKey);
  return scope === "record_specific" ? workKey : workKey.slice(0, -(scope.length + 1));
}

function outputDimension(unitPolicyId: string): string {
  if (/_m2(?:_|$)/.test(unitPolicyId)) return "AREA";
  if (/_m3(?:_|$)/.test(unitPolicyId)) return "VOLUME";
  if (/_kg(?:_|$)|_t(?:_|$)/.test(unitPolicyId)) return "MASS";
  if (/_m(?:_|$)/.test(unitPolicyId)) return "LENGTH";
  if (/_pcs?(?:_|$)|_item(?:_|$)/.test(unitPolicyId)) return "COUNT";
  return "DECLARED_BY_UNIT_POLICY";
}

function constructionState(category: string, workType: string): GlobalCatalogInventoryRowV1["new_repair_demolition_state"] {
  if (category === "demolition") return "DEMOLITION";
  if (["repair", "replace", "restore"].includes(workType)) return "REPAIR";
  return "NEW";
}

function materialSystem(workKey: string, category: string, operation: string): string {
  const canonical = stripScope(workKey);
  const prefix = `${category}_interior_`;
  const withoutPrefix = canonical.startsWith(prefix) ? canonical.slice(prefix.length) : canonical;
  const operationSuffix = `_${operation}`;
  return withoutPrefix.endsWith(operationSuffix)
    ? withoutPrefix.slice(0, -operationSuffix.length).toUpperCase()
    : withoutPrefix.toUpperCase();
}

function readinessForBase(row: BaseManifestRow): GlobalCatalogReadinessV1 {
  if (row.readiness_status === "READY" && row.norm_source_status === "SOURCE_BACKED") return "RESOURCE_READY";
  if (row.norm_source_status !== "SOURCE_BACKED") return "BLOCKED_SOURCE_REQUIRED";
  if (row.formula_status === "PRESENT" && row.parameter_schema_status === "WORK_SPECIFIC") return "FORMULA_READY";
  if (row.parameter_schema_status === "WORK_SPECIFIC") return "SCHEMA_READY";
  return "CLASSIFIED";
}

function baseInventoryRow(row: BaseManifestRow): GlobalCatalogInventoryRowV1 {
  const coverage = coverageByCatalogId.get(row.work_key);
  const scope = scopeFromWorkKey(row.work_key);
  const canonicalWorkKey = coverage?.canonicalCatalogId ?? (scope === "standard" ? row.work_key : `${stripScope(row.work_key)}_standard`);
  const candidateTechnologyId = `canonical-technology:v1:${row.category}:${stripScope(canonicalWorkKey)}`;
  const sourceHash = estimateDeterministicHash(row);
  const withoutHash: Omit<GlobalCatalogInventoryRowV1, "row_hash"> = {
    catalog_id: row.work_key,
    work_key: row.work_key,
    title_ru: row.localized_name_ru,
    catalog_group: "base_10000",
    domain_id: row.category,
    operation_class: row.work_type.toUpperCase(),
    construction_method: row.calculator_family_id,
    primary_material_or_system: materialSystem(row.work_key, row.category, row.work_type),
    output_dimension: outputDimension(row.unit_policy_id),
    new_repair_demolition_state: constructionState(row.category, row.work_type),
    scope_capabilities: [scope],
    candidate_canonical_technology_id: candidateTechnologyId,
    alias_candidate_of: null,
    existing_passport_id: coverage?.referencePassportCatalogWorkId
      ? `professional-estimate-passport:v4:${coverage.referencePassportCatalogWorkId}`
      : null,
    existing_schema_id: row.parameter_schema_id || null,
    existing_formula_pack_id: row.formula_status === "PRESENT" ? `${row.calculator_family_id}:formula-pack` : null,
    existing_normative_profile_id: row.norm_pack_id || null,
    current_readiness: readinessForBase(row),
    current_blockers: row.blocking_reasons,
    classification_evidence: [
      `source.template_id=${row.template_id}`,
      `source.category=${row.category}`,
      `source.work_family_id=${row.work_family_id}`,
      `source.work_type=${row.work_type}`,
      `source.unit_policy_id=${row.unit_policy_id}`,
      `coverage.state=${coverage?.state ?? "MISSING"}`,
    ],
    source_hash: sourceHash,
  };
  return { ...withoutHash, row_hash: estimateDeterministicHash(withoutHash) };
}

function expandedInventoryRow(row: ExpandedTemplateRow): GlobalCatalogInventoryRowV1 {
  const catalogId = `expanded-template:${row.template_id}`;
  const coverage = coverageByCatalogId.get(catalogId);
  const sourceHash = estimateDeterministicHash(row);
  const withoutHash: Omit<GlobalCatalogInventoryRowV1, "row_hash"> = {
    catalog_id: catalogId,
    work_key: row.template_id,
    title_ru: row.work_family_id,
    catalog_group: "expanded_complex_1610",
    domain_id: `expanded:${row.work_family_id}`,
    operation_class: row.template_level,
    construction_method: "PROJECT_LEVEL_PROJECTION",
    primary_material_or_system: row.work_family_id.toUpperCase(),
    output_dimension: "PROJECT_DEFINED",
    new_repair_demolition_state: "UNKNOWN",
    scope_capabilities: [row.template_level],
    candidate_canonical_technology_id: `canonical-technology:v1:expanded:${row.work_family_id}`,
    alias_candidate_of: null,
    existing_passport_id: null,
    existing_schema_id: null,
    existing_formula_pack_id: null,
    existing_normative_profile_id: null,
    current_readiness: "CLASSIFIED",
    current_blockers: [...new Set([...row.requiredInputs, "domain_expert_review", "normative_profile_required"])],
    classification_evidence: [
      `source.work_family_id=${row.work_family_id}`,
      `source.template_level=${row.template_level}`,
      `source.row_groups=${row.rowGroups.join("|")}`,
      `coverage.state=${coverage?.state ?? "MISSING"}`,
    ],
    source_hash: sourceHash,
  };
  return { ...withoutHash, row_hash: estimateDeterministicHash(withoutHash) };
}

function readinessCounts(rows: readonly GlobalCatalogInventoryRowV1[]): Record<GlobalCatalogReadinessV1, number> {
  const counts: Record<GlobalCatalogReadinessV1, number> = {
    UNCLASSIFIED: 0,
    CLASSIFIED: 0,
    BINDING_READY: 0,
    SCHEMA_READY: 0,
    NORM_PROFILE_READY: 0,
    FORMULA_READY: 0,
    RESOURCE_READY: 0,
    DETERMINISTIC_COMPILE_GREEN: 0,
    DURABLE_GREEN: 0,
    DOMAIN_GREEN: 0,
    BLOCKED_SOURCE_REQUIRED: 0,
    EXCLUDED_WITH_REASON: 0,
  };
  for (const row of rows) counts[row.current_readiness] += 1;
  return counts;
}

const cachedInventoryByOverlay = new Map<string, GlobalCatalogInventoryV1>();

function applyDomainOverlays(
  baselineRows: readonly GlobalCatalogInventoryRowV1[],
  overlays: readonly GlobalCatalogDomainOverlayV1[],
): { rows: GlobalCatalogInventoryRowV1[]; orphanBindings: number } {
  const baselineByCatalogId = new Map(baselineRows.map((row) => [row.catalog_id, row]));
  const claimedCatalogIds = new Set<string>();
  let orphanBindings = 0;
  for (const overlay of overlays) {
    const technologyById = new Map(overlay.domain_package.canonical_technologies.map((item) => [item.technology_id, item]));
    for (const binding of overlay.domain_package.catalog_bindings) {
      if (claimedCatalogIds.has(binding.catalog_id)) {
        throw new Error(`GLOBAL_DOMAIN_OVERLAY_DUPLICATE_BINDING:${binding.catalog_id}`);
      }
      claimedCatalogIds.add(binding.catalog_id);
      const baseline = baselineByCatalogId.get(binding.catalog_id);
      const technology = technologyById.get(binding.canonical_technology_id);
      if (!baseline || !technology || baseline.work_key !== binding.work_key) {
        orphanBindings += 1;
        continue;
      }
      const { row_hash: _baselineRowHash, ...baselineWithoutHash } = baseline;
      const withoutHash: Omit<GlobalCatalogInventoryRowV1, "row_hash"> = {
        ...baselineWithoutHash,
        domain_id: overlay.domain_package.manifest.domain_id,
        operation_class: technology.operation_class,
        construction_method: technology.method,
        primary_material_or_system: technology.material_system,
        output_dimension: technology.output.dimension,
        new_repair_demolition_state: binding.scope_capability === "repair" ? "REPAIR" : "NEW",
        scope_capabilities: [binding.scope_capability],
        candidate_canonical_technology_id: technology.technology_id,
        alias_candidate_of: binding.alias_of,
        existing_passport_id: `domain-passport:${binding.catalog_id}:v1`,
        existing_schema_id: technology.parameter_schema_id,
        existing_formula_pack_id: technology.formula_pack_id,
        existing_normative_profile_id: technology.normative_profile_ids[0] ?? null,
        current_readiness: overlay.readiness,
        current_blockers: [],
        classification_evidence: [
          ...baseline.classification_evidence,
          `domain_package.id=${overlay.domain_package.manifest.domain_id}`,
          `domain_package.version=${overlay.domain_package.manifest.domain_version}`,
          `domain_binding.technology_id=${technology.technology_id}`,
          `domain_binding.readiness=${overlay.readiness}`,
        ],
      };
      baselineByCatalogId.set(binding.catalog_id, {
        ...withoutHash,
        row_hash: estimateDeterministicHash(withoutHash),
      });
    }
  }
  return {
    rows: [...baselineByCatalogId.values()].sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)),
    orphanBindings,
  };
}

export function buildGlobalCatalogInventoryV1(
  overlays: readonly GlobalCatalogDomainOverlayV1[] = [],
): GlobalCatalogInventoryV1 {
  const overlayCacheKey = estimateDeterministicHash(overlays.map((overlay) => ({
    domain_id: overlay.domain_package.manifest.domain_id,
    domain_version: overlay.domain_package.manifest.domain_version,
    readiness: overlay.readiness,
    bindings: overlay.domain_package.catalog_bindings.map((binding) => [
      binding.catalog_id,
      binding.work_key,
      binding.canonical_technology_id,
    ]),
  })));
  const cached = cachedInventoryByOverlay.get(overlayCacheKey);
  if (cached) return cached;
  const baselineRows = [...baseRows.map(baseInventoryRow), ...expandedRows.map(expandedInventoryRow)]
    .sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));
  const overlayProjection = applyDomainOverlays(baselineRows, overlays);
  const rows = overlayProjection.rows;
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    if (seen.has(row.catalog_id)) duplicates += 1;
    seen.add(row.catalog_id);
  }
  const domainDenominators: Record<string, number> = {};
  for (const row of rows) domainDenominators[row.domain_id] = (domainDenominators[row.domain_id] ?? 0) + 1;
  const bound = rows.filter((row) => row.existing_passport_id !== null).length;
  const classified = rows.filter((row) => row.current_readiness !== "UNCLASSIFIED").length;
  const arithmetic = {
    classified,
    unclassified: rows.length - classified,
    bound,
    unbound: rows.length - bound,
    domain_denominators: Object.fromEntries(Object.entries(domainDenominators).sort(([left], [right]) => left.localeCompare(right))),
    domain_denominator_sum: Object.values(domainDenominators).reduce((sum, count) => sum + count, 0),
    duplicate_catalog_id: duplicates,
    orphan_binding: coverageLedger.brokenCanonicalTargets.length + overlayProjection.orphanBindings,
    silent_exclusion: rows.filter((row) => row.current_readiness === "EXCLUDED_WITH_REASON" && row.current_blockers.length === 0).length,
  };
  if (rows.length !== 11_610) throw new Error(`GLOBAL_CATALOG_TOTAL_MISMATCH:${rows.length}`);
  if (arithmetic.classified + arithmetic.unclassified !== 11_610) throw new Error("GLOBAL_CLASSIFICATION_ARITHMETIC_MISMATCH");
  if (arithmetic.bound + arithmetic.unbound !== 11_610) throw new Error("GLOBAL_BINDING_ARITHMETIC_MISMATCH");
  if (arithmetic.domain_denominator_sum !== 11_610) throw new Error("GLOBAL_DOMAIN_ARITHMETIC_MISMATCH");
  if (duplicates > 0) throw new Error(`GLOBAL_DUPLICATE_CATALOG_ID:${duplicates}`);
  const baselineSnapshot = {
    source_catalogs: { base_10000: baseRows.length, expanded_complex_1610: expandedRows.length },
    coverage_checksum: coverageLedger.checksum,
    row_source_hashes: baselineRows.map((row) => row.source_hash),
    readiness_counts: readinessCounts(baselineRows),
  };
  const readinessTransitions: Record<string, number> = {};
  let changedRecords = 0;
  const baselineByCatalogId = new Map(baselineRows.map((row) => [row.catalog_id, row]));
  for (const row of rows) {
    const baseline = baselineByCatalogId.get(row.catalog_id);
    if (!baseline || baseline.row_hash === row.row_hash) continue;
    changedRecords += 1;
    const transition = `${baseline.current_readiness}->${row.current_readiness}`;
    readinessTransitions[transition] = (readinessTransitions[transition] ?? 0) + 1;
  }
  const withoutHash = {
    schema: "global-catalog-11610-inventory:v1" as const,
    catalog_total: 11_610 as const,
    rows,
    arithmetic,
    readiness_counts: readinessCounts(rows),
    baseline: {
      baseline_hash: estimateDeterministicHash(baselineSnapshot),
      readiness_counts: baselineSnapshot.readiness_counts,
    },
    delta_from_baseline: {
      changed_records: changedRecords,
      readiness_transitions: Object.fromEntries(Object.entries(readinessTransitions).sort(([left], [right]) => left.localeCompare(right))),
      overlay_domain_ids: overlays.map((overlay) => overlay.domain_package.manifest.domain_id).sort(),
    },
  };
  const inventory = { ...withoutHash, inventory_hash: estimateDeterministicHash(withoutHash) };
  cachedInventoryByOverlay.set(overlayCacheKey, inventory);
  return inventory;
}

export function clearGlobalCatalogInventoryV1Cache(): void {
  cachedInventoryByOverlay.clear();
}
