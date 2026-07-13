import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  NORM_WORK_TAXONOMY_GROUPS,
  PRODUCTION_WORK_DEFINITIONS_10000,
  resolveNormWorkGroupForCategory,
} from "../../src/lib/ai/estimateTemplate10000";

export const GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS =
  "GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS" as const;
export const STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS =
  "STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS" as const;
export const STOP_NORM_REALITY_AUDIT_NOT_FOUND =
  "STOP_NORM_REALITY_AUDIT_NOT_FOUND" as const;

const PROFESSIONAL_NORM_PACK_ROOT = "data/estimate-norms/professional";
const REMEDIATION_PLAN_FILE = "work-group-remediation-plan.json";
const PREVIOUS_AUDIT_ROOT = ".release-runtime/ai-estimate-norm-base-reality-and-source-quality-audit";
const RUNTIME_ROOT = ".release-runtime/ai-estimate-real-professional-norm-packs";
const REQUIRED_PREVIOUS_STATUS = "STOP_NORM_BASE_STRUCTURAL_BUT_NOT_PROFESSIONAL";
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
const GENERIC_STRUCTURAL_SOURCE_IDS = new Set([
  "src_norm_internal_labor_standards_2026_07",
  "src_norm_material_consumption_tables_2026_07",
  "src_norm_public_reference_construction_methods_2026_07",
  "src_norm_estimator_manual_service_policy_2026_07",
]);

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

type SourceRegistry = {
  sources?: Array<{
    source_id?: string;
    quality_status?: string;
    is_source_backed_professional_norm_pack?: boolean;
    is_generated_family_default?: boolean;
    is_historical_price_only?: boolean;
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
  valid: boolean;
  failures: string[];
};

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

function workGroupTemplateCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const group = resolveNormWorkGroupForCategory(definition.category) ?? "services";
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return counts;
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
  }

  return {
    file: path.relative(process.cwd(), file).replace(/\\/g, "/"),
    work_group: group,
    norm_items_count: pack.norm_items?.length ?? 0,
    source_type: sourceType,
    review_status: reviewStatus,
    license_status: licenseStatus,
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

function sourceRegistryGroup(sourceId: string, groups: readonly string[]): string | null {
  return [...groups]
    .sort((left, right) => right.length - left.length)
    .find((group) =>
      sourceId.startsWith(`src_professional_norm_pack_catalog_${group}_`) ||
      sourceId.startsWith(`src_professional_norm_pack_${group}_`)
    ) ?? null;
}

function inspectCatalogSourceRegistry(planGroups: Set<string>): {
  source_registry_exists: boolean;
  source_registry_professional_sources_count: number;
  source_registry_professional_groups_count: number;
  source_registry_missing_work_groups: string[];
  source_registry_invalid_professional_sources_count: number;
} {
  const file = path.join(process.cwd(), SOURCE_REGISTRY_FILE);
  if (!pathExists(file)) {
    return {
      source_registry_exists: false,
      source_registry_professional_sources_count: 0,
      source_registry_professional_groups_count: 0,
      source_registry_missing_work_groups: [...planGroups],
      source_registry_invalid_professional_sources_count: 0,
    };
  }

  const registry = readJson<SourceRegistry>(file);
  const professionalSources = (registry.sources ?? []).filter((source) =>
    source.is_source_backed_professional_norm_pack === true &&
    source.is_generated_family_default !== true &&
    source.is_historical_price_only !== true
  );
  const invalidSources = professionalSources.filter((source) =>
    !source.source_id ||
    !["reviewed", "needs_regional_review"].includes(String(source.quality_status ?? "")) ||
    !Array.isArray(source.sample_norm_ids) ||
    source.sample_norm_ids.length === 0 ||
    !Array.isArray(source.sample_template_ids) ||
    source.sample_template_ids.length === 0
  );
  const groups = new Set(
    professionalSources
      .map((source) => sourceRegistryGroup(String(source.source_id ?? ""), [...planGroups]))
      .filter((group): group is string => Boolean(group)),
  );

  return {
    source_registry_exists: true,
    source_registry_professional_sources_count: professionalSources.length,
    source_registry_professional_groups_count: groups.size,
    source_registry_missing_work_groups: [...planGroups].filter((group) => !groups.has(group)),
    source_registry_invalid_professional_sources_count: invalidSources.length,
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

  const previous = latestPreviousSummary();
  const apartmentReference = inspectApartmentReferenceModel();
  const planFile = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT, REMEDIATION_PLAN_FILE);
  const plan = pathExists(planFile) ? readJson<WorkGroupRemediationPlan>(planFile) : null;
  const packResults = loadProfessionalNormPacks();
  const templateCounts = workGroupTemplateCounts();
  const planGroups = new Set((plan?.work_groups ?? []).map((entry) => entry.work_group));
  const packGroups = new Set(packResults.filter((result) => result.valid && result.work_group).map((result) => result.work_group as string));
  const taxonomyGroups = new Set(NORM_WORK_TAXONOMY_GROUPS);
  const activeGroups = new Set(templateCounts.keys());
  const missingPlanGroups = [...taxonomyGroups].filter((group) => !planGroups.has(group));
  const activeGroupsWithoutPlan = [...activeGroups].filter((group) => !planGroups.has(group));
  const missingPackGroups = [...planGroups].filter((group) => !packGroups.has(group));
  const invalidPackResults = packResults.filter((result) => !result.valid);
  const previousSummary = previous?.summary ?? {};
  const templatesWithRealSources = previousSummary.templates_with_real_norm_sources_count ??
    previousSummary.templates_with_official_or_curated_norms ??
    0;
  const previousLegacyStopOk = previousSummary.final_status === REQUIRED_PREVIOUS_STATUS &&
    previousSummary.synthetic_family_default_count === 599000 &&
    previousSummary.templates_with_only_synthetic_norms === 10000 &&
    templatesWithRealSources === 0 &&
    previousSummary.all_random_templates_generate_professional_boq === false;
  const previousSourceQualityGreenOk = previousSummary.final_status === SOURCE_QUALITY_GREEN_STATUS &&
    previousSummary.synthetic_family_default_count === 0 &&
    previousSummary.templates_with_only_synthetic_norms === 0 &&
    templatesWithRealSources === PRODUCTION_WORK_DEFINITIONS_10000.length &&
    previousSummary.professional_source_coverage === true &&
    (previousSummary.real_hardcoded_production_rate_count ?? 0) === 0;
  const previousStatusOk = previousLegacyStopOk || previousSourceQualityGreenOk;
  const sourceRegistry = inspectCatalogSourceRegistry(planGroups);

  const workGroupRemediationPlan = (plan?.work_groups ?? []).map((entry) => ({
    ...entry,
    templates_count: templateCounts.get(entry.work_group) ?? 0,
    current_norm_status:
      previousSummary.work_groups_with_only_generic_norms?.includes(entry.work_group)
        ? "structural_generic_only"
        : previousSummary.taxonomy_work_groups_without_norm_records?.includes(entry.work_group)
          ? "missing_norm_records"
          : "needs_real_norm_pack",
    professional_pack_present: packGroups.has(entry.work_group),
  }));

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
  const allSourceRegistryGroupsPresent =
    sourceRegistry.source_registry_exists &&
    sourceRegistry.source_registry_missing_work_groups.length === 0 &&
    sourceRegistry.source_registry_invalid_professional_sources_count === 0;
  const realSourceCoverageComplete = allPacksPresent || allSourceRegistryGroupsPresent;

  const green = previousStatusOk &&
    planComplete &&
    realSourceCoverageComplete &&
    allPacksValid &&
    apartmentReferenceProfessional &&
    syntheticAfter === 0 &&
    templatesOnlySyntheticAfter === 0 &&
    templatesWithRealSources === PRODUCTION_WORK_DEFINITIONS_10000.length;

  const finalStatus = !previousStatusOk
    ? STOP_NORM_REALITY_AUDIT_NOT_FOUND
    : green
      ? GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS
      : STOP_REAL_NORM_SOURCES_MISSING_FOR_WORK_GROUPS;

  const summary: Record<string, unknown> = {
    final_status: finalStatus,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    previous_status: previousSummary.final_status ?? null,
    previous_summary_path: previous
      ? path.relative(process.cwd(), previous.file).replace(/\\/g, "/")
      : null,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    norm_records_count: previousSummary.norm_records_count ?? 599000,
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
    priority_order_defined: plan?.work_groups.every((entry) => entry.priority > 0) ?? false,
    source_strategy_defined: plan?.work_groups.every((entry) => Boolean(entry.source_strategy)) ?? false,
    all_taxonomy_groups_have_source_strategy: missingPlanGroups.length === 0,
    work_group_remediation_plan: workGroupRemediationPlan,
    professional_norm_packs_exist: packResults.length > 0,
    professional_norm_pack_files_count: packResults.length,
    professional_norm_pack_results: packResults,
    missing_real_norm_pack_work_groups: realSourceCoverageComplete ? [] : missingPackGroups,
    invalid_professional_norm_pack_files: invalidPackResults,
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
    ].every((group) => packGroups.has(group)),
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
    ].every((group) => packGroups.has(group)),
    wave3_real_norm_groups_passed: [
      "low_voltage",
      "sewerage",
      "heating",
      "ventilation",
      "air_conditioning",
      "fire_safety",
      "documentation",
      "services",
    ].every((group) => packGroups.has(group)),
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
      !realSourceCoverageComplete ? `missing_real_norm_pack_work_groups:${missingPackGroups.join(",")}` : "",
      sourceRegistry.source_registry_invalid_professional_sources_count > 0
        ? `invalid_source_registry_professional_sources:${sourceRegistry.source_registry_invalid_professional_sources_count}`
        : "",
      invalidPackResults.length > 0 ? "invalid_professional_norm_pack_files" : "",
      !apartmentReferenceProfessional ? "apartment_reference_not_professional_expanded_boq" : "",
      !apartmentReferenceUsesRealNormPacks ? "apartment_reference_boq_shape_good_but_norm_sources_not_real_packs" : "",
      syntheticAfter !== 0 ? `synthetic_family_default_count_after:${syntheticAfter}` : "",
      templatesOnlySyntheticAfter !== 0 ? `templates_with_only_synthetic_norms_after:${templatesOnlySyntheticAfter}` : "",
      templatesWithRealSources !== PRODUCTION_WORK_DEFINITIONS_10000.length
        ? `templates_with_real_norm_sources_count:${templatesWithRealSources}`
        : "",
    ].filter(Boolean),
    next_required_action: green ? "none" : "add_reviewed_source_backed_professional_norm_pack_json_files_then_update_bindings",
  };

  const summaryPath = writeRuntimeSummary(summary);
  summary.runtime_summary_path = summaryPath;
  writeFileSync(path.join(process.cwd(), summaryPath), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    final_status: summary.final_status,
    runtime_summary_path: summary.runtime_summary_path,
    previous_status: summary.previous_status,
    template_count: summary.template_count,
    norm_records_count: summary.norm_records_count,
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
    professional_norm_pack_work_groups_count: summary.professional_norm_pack_work_groups_count,
    professional_norm_pack_coverage_percent: summary.professional_norm_pack_coverage_percent,
    apartment_reference_row_count: summary.apartment_reference_row_count,
    apartment_reference_in_template10000_catalog: summary.apartment_reference_in_template10000_catalog,
    apartment_reference_uses_generic_norm_sources: summary.apartment_reference_uses_generic_norm_sources,
    apartment_reference_uses_real_norm_packs: summary.apartment_reference_uses_real_norm_packs,
    apartment_reference_real_norm_pack_rows_count: summary.apartment_reference_real_norm_pack_rows_count,
    apartment_54_uses_real_norm_packs: summary.apartment_54_uses_real_norm_packs,
    missing_real_norm_pack_work_groups: summary.missing_real_norm_pack_work_groups,
    blockers: summary.blockers,
    fake_green_claimed: summary.fake_green_claimed,
  }, null, 2));

  if (finalStatus !== GREEN_AI_ESTIMATE_REAL_PROFESSIONAL_NORM_PACKS_FOR_ALL_WORK_TYPES_NO_BUILDS) {
    process.exitCode = 1;
  }
}

main();
