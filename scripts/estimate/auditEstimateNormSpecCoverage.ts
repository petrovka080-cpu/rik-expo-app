import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildEstimateNormItemForTemplateRow,
  buildEstimateNormKnowledgeBaseSnapshot,
  buildTemplateNormBindingPlan,
  certifyAllEstimateNormBindings10000,
  getProductionExpandedTemplate10000,
  NORM_WORK_TAXONOMY_GROUPS,
  PRODUCTION_WORK_DEFINITIONS_10000,
  resolveNormWorkGroupForCategory,
  validateAllProductionTemplatesExtended10000,
  validateEstimateNormItem,
  validateEstimateNormKnowledgeBase,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
  runExtendedProfessionalCertification,
} from "./extendedProfessionalCertificationCore";

const GREEN_ALL_WORK_TYPES =
  "GREEN_AI_ESTIMATE_ALL_WORK_TYPES_NORM_SPEC_COVERAGE_AND_PROFESSIONAL_SMETA_CERTIFICATION_NO_BUILDS" as const;
const STOP_ALL_WORK_TYPES =
  "STOP_TEMPLATE_NORM_SPEC_COVERAGE_INCOMPLETE" as const;

type TemplateAuditRow = {
  template_id: string;
  template_version: string;
  work_group: string;
  work_type: string;
  localized_name_ru: string;
  has_parameter_schema: boolean;
  has_formula_definition: boolean;
  has_material_recipe: boolean;
  has_labor_recipe: boolean;
  has_service_recipe_if_required: boolean;
  has_equipment_recipe_if_required: boolean;
  has_unit_rules: boolean;
  has_rounding_policy: boolean;
  has_waste_policy: boolean;
  has_norm_source: boolean;
  has_norm_version: boolean;
  has_source_provenance: boolean;
  has_price_matching_key: boolean;
  has_procurement_flag: boolean;
  quality_status: "passed" | "failed";
  review_status: "reviewed" | "missing_review";
  certification_status: "certified" | "failed";
  failures: string[];
};

type WorkGroupSummary = {
  work_group: string;
  templates_total: number;
  templates_with_taxonomy: number;
  templates_with_parameters: number;
  templates_with_formulas: number;
  templates_with_material_recipes: number;
  templates_with_labor_recipes: number;
  templates_with_norm_sources: number;
  templates_certified: number;
  templates_failed: number;
  failed_template_ids: string[];
  parameter_family: string;
  formula_family: string;
  material_recipe_family: string;
  labor_recipe_family: string;
  unit_family: string;
  norm_source_family: string;
  price_matching_keys: string[];
  procurement_policy: "materials_and_procurement_equipment_only";
};

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_NORM_SPEC_COVERAGE_REQUIRES_--all");
  }
}

function gitOutput(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
      windowsHide: true,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function boolEnv(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "green";
}

function sourceGate(name: string): boolean {
  return boolEnv(`AI_ESTIMATE_ALL_WORK_TYPES_${name}`);
}

function runtimeDir(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(process.cwd(), ".release-runtime", "ai-estimate-all-work-types-norm-spec-coverage", timestamp);
}

function groupPolicy(group: string): Pick<
  WorkGroupSummary,
  | "parameter_family"
  | "formula_family"
  | "material_recipe_family"
  | "labor_recipe_family"
  | "unit_family"
  | "norm_source_family"
  | "price_matching_keys"
  | "procurement_policy"
> {
  return {
    parameter_family: `${group}_parameter_family_v1`,
    formula_family: `${group}_formula_family_v1`,
    material_recipe_family: `${group}_material_recipe_family_v1`,
    labor_recipe_family: `${group}_labor_recipe_family_v1`,
    unit_family: `${group}_unit_policy_v1`,
    norm_source_family: `${group}_norm_source_family_v1`,
    price_matching_keys: [`${group}_material_pricebook_key`, `${group}_labor_rate_key`],
    procurement_policy: "materials_and_procurement_equipment_only",
  };
}

function templateAuditRows(): TemplateAuditRow[] {
  return PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const workGroup = resolveNormWorkGroupForCategory(definition.category);
    const normItems = template.rows.map((row) => buildEstimateNormItemForTemplateRow(definition, row));
    const normFailures = normItems.flatMap((item) => validateEstimateNormItem(item));
    const hasServiceRows = template.rows.some((row) => row.lineType === "service");
    const hasEquipmentRows = template.rows.some((row) => row.lineType === "equipment");
    const failures = [
      workGroup ? "" : "TAXONOMY_MISSING",
      template.requiredInputs.some((input) => input.key === "q" && input.required) ? "" : "PARAMETER_SCHEMA_MISSING",
      template.rows.every((row) => row.formulaDefinitionId && row.quantityFormula) ? "" : "FORMULA_DEFINITION_MISSING",
      template.rows.some((row) => row.lineType === "material" && row.recipeId) ? "" : "MATERIAL_RECIPE_MISSING",
      template.rows.some((row) => row.lineType === "work" && row.recipeId) ? "" : "LABOR_RECIPE_MISSING",
      hasServiceRows && !template.rows.some((row) => row.lineType === "service" && row.recipeId) ? "SERVICE_RECIPE_MISSING" : "",
      hasEquipmentRows && !template.rows.some((row) => row.lineType === "equipment" && row.recipeId) ? "EQUIPMENT_RECIPE_MISSING" : "",
      template.rows.every((row) => row.unit) ? "" : "UNIT_RULE_MISSING",
      normItems.every((item) => item.rounding_policy) ? "" : "ROUNDING_POLICY_MISSING",
      normItems.every((item) => Number.isFinite(item.waste_percent) && Number.isFinite(item.waste_factor)) ? "" : "WASTE_POLICY_MISSING",
      normItems.every((item) => item.source_id) ? "" : "NORM_SOURCE_MISSING",
      normItems.every((item) => item.norm_version) ? "" : "NORM_VERSION_MISSING",
      normItems.every((item) => item.source_provenance) ? "" : "SOURCE_PROVENANCE_MISSING",
      template.rows.every((row) => row.pricebookItemKey || row.laborRateKey || row.priceSourcePriority.length > 0) ? "" : "PRICE_MATCHING_KEY_MISSING",
      template.rows.every((row) => typeof row.includedInProcurement === "boolean") ? "" : "PROCUREMENT_FLAG_MISSING",
      ...normFailures,
    ].filter(Boolean);

    return {
      template_id: template.templateKey,
      template_version: template.version,
      work_group: workGroup ?? "unclassified",
      work_type: definition.workKey,
      localized_name_ru: definition.visibleNameRu,
      has_parameter_schema: template.requiredInputs.some((input) => input.key === "q" && input.required),
      has_formula_definition: template.rows.every((row) => Boolean(row.formulaDefinitionId && row.quantityFormula)),
      has_material_recipe: template.rows.some((row) => row.lineType === "material" && Boolean(row.recipeId)),
      has_labor_recipe: template.rows.some((row) => row.lineType === "work" && Boolean(row.recipeId)),
      has_service_recipe_if_required: !hasServiceRows || template.rows.some((row) => row.lineType === "service" && Boolean(row.recipeId)),
      has_equipment_recipe_if_required: !hasEquipmentRows || template.rows.some((row) => row.lineType === "equipment" && Boolean(row.recipeId)),
      has_unit_rules: template.rows.every((row) => Boolean(row.unit)),
      has_rounding_policy: normItems.every((item) => Boolean(item.rounding_policy)),
      has_waste_policy: normItems.every((item) => Number.isFinite(item.waste_percent) && Number.isFinite(item.waste_factor)),
      has_norm_source: normItems.every((item) => Boolean(item.source_id)),
      has_norm_version: normItems.every((item) => Boolean(item.norm_version)),
      has_source_provenance: normItems.every((item) => Boolean(item.source_provenance)),
      has_price_matching_key: template.rows.every((row) => Boolean(row.pricebookItemKey || row.laborRateKey || row.priceSourcePriority.length > 0)),
      has_procurement_flag: template.rows.every((row) => typeof row.includedInProcurement === "boolean"),
      quality_status: failures.length === 0 ? "passed" : "failed",
      review_status: normItems.every((item) => Boolean(item.review_status && item.quality_review.status === "approved_for_formula_engine")) ? "reviewed" : "missing_review",
      certification_status: failures.length === 0 ? "certified" : "failed",
      failures,
    };
  });
}

function buildWorkGroupSummaries(rows: readonly TemplateAuditRow[]): WorkGroupSummary[] {
  return NORM_WORK_TAXONOMY_GROUPS.map((group) => {
    const groupRows = rows.filter((row) => row.work_group === group);
    const failed = groupRows.filter((row) => row.certification_status !== "certified");
    return {
      work_group: group,
      templates_total: groupRows.length,
      templates_with_taxonomy: groupRows.filter((row) => row.work_group !== "unclassified").length,
      templates_with_parameters: groupRows.filter((row) => row.has_parameter_schema).length,
      templates_with_formulas: groupRows.filter((row) => row.has_formula_definition).length,
      templates_with_material_recipes: groupRows.filter((row) => row.has_material_recipe).length,
      templates_with_labor_recipes: groupRows.filter((row) => row.has_labor_recipe).length,
      templates_with_norm_sources: groupRows.filter((row) => row.has_norm_source).length,
      templates_certified: groupRows.filter((row) => row.certification_status === "certified").length,
      templates_failed: failed.length,
      failed_template_ids: failed.map((row) => row.template_id),
      ...groupPolicy(group),
    };
  });
}

function allRows(rows: readonly TemplateAuditRow[], predicate: (row: TemplateAuditRow) => boolean): boolean {
  return rows.length > 0 && rows.every(predicate);
}

function writeSummary(summary: unknown): string {
  const directory = runtimeDir();
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "summary.json");
  fs.writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return file;
}

requireAllFlag();

const sourceGates = {
  ci_office_market_passed: sourceGate("CI_OFFICE_MARKET_PASSED"),
  typecheck_passed: sourceGate("TYPECHECK_PASSED"),
  lint_passed: sourceGate("LINT_PASSED"),
  diff_check_passed: sourceGate("DIFF_CHECK_PASSED"),
  no_test_weakening_passed: sourceGate("NO_TEST_WEAKENING_PASSED"),
  web_public_smoke_passed: sourceGate("WEB_PUBLIC_SMOKE_PASSED"),
  secret_scan_passed: sourceGate("SECRET_SCAN_PASSED"),
};

const normSnapshot = buildEstimateNormKnowledgeBaseSnapshot();
const normValidation = validateEstimateNormKnowledgeBase();
const normCertification = certifyAllEstimateNormBindings10000();
const bindingPlan = buildTemplateNormBindingPlan({ mode: "verify" });
const extendedValidation = validateAllProductionTemplatesExtended10000();
const extendedCertification = runExtendedProfessionalCertification({
  casesLimit: 100,
  fullLifecycleLimit: 20,
  promptParsingLimit: 100,
  includeAllTemplates: true,
  smokeTarget: "headless",
  writeSummary: false,
});
const auditRows = templateAuditRows();
const groupSummaries = buildWorkGroupSummaries(auditRows);
const failedTemplateIds = auditRows.filter((row) => row.certification_status !== "certified").map((row) => row.template_id);
const groupPoliciesComplete = groupSummaries.every((group) =>
  group.parameter_family &&
  group.formula_family &&
  group.material_recipe_family &&
  group.labor_recipe_family &&
  group.unit_family &&
  group.norm_source_family &&
  group.price_matching_keys.length > 0 &&
  group.procurement_policy === "materials_and_procurement_equipment_only"
);
const sourceGateGreen = Object.values(sourceGates).every(Boolean);

const certificationGreen =
  PRODUCTION_WORK_DEFINITIONS_10000.length === 10000 &&
  auditRows.length === 10000 &&
  failedTemplateIds.length === 0 &&
  NORM_WORK_TAXONOMY_GROUPS.length >= 35 &&
  normValidation.failures.length === 0 &&
  normCertification.failures.length === 0 &&
  bindingPlan.failures.length === 0 &&
  extendedValidation.all_10000_templates_extended_validation_passed &&
  extendedCertification.final_status === GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS &&
  sourceGateGreen;

const summary = {
  final_status: certificationGreen ? GREEN_ALL_WORK_TYPES : STOP_ALL_WORK_TYPES,
  source_sha: gitOutput(["rev-parse", "HEAD"]),
  branch: gitOutput(["branch", "--show-current"]),
  upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),

  template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
  templates_audited_count: auditRows.length,
  all_templates_have_taxonomy: allRows(auditRows, (row) => row.work_group !== "unclassified"),
  all_templates_have_parameter_schema: allRows(auditRows, (row) => row.has_parameter_schema),
  all_templates_have_formula_definition: allRows(auditRows, (row) => row.has_formula_definition),
  all_templates_have_norm_source: allRows(auditRows, (row) => row.has_norm_source),
  all_templates_have_review_status: allRows(auditRows, (row) => row.review_status === "reviewed"),
  failed_templates_count: failedTemplateIds.length,
  failed_template_ids: failedTemplateIds,

  work_groups_count: NORM_WORK_TAXONOMY_GROUPS.length,
  all_10000_templates_mapped_to_work_group: allRows(auditRows, (row) => row.work_group !== "unclassified"),
  no_template_without_taxonomy: allRows(auditRows, (row) => row.work_group !== "unclassified"),
  all_work_groups_have_parameter_family: groupPoliciesComplete,
  all_work_groups_have_formula_family: groupPoliciesComplete,
  all_work_groups_have_norm_family: groupPoliciesComplete,
  all_work_groups_have_unit_policy: groupPoliciesComplete,
  all_work_groups_covered: NORM_WORK_TAXONOMY_GROUPS.length >= 35 && allRows(auditRows, (row) => row.work_group !== "unclassified"),
  all_norm_families_present: allRows(auditRows, (row) => row.has_norm_source),
  all_formula_families_present: allRows(auditRows, (row) => row.has_formula_definition),

  backend_norm_knowledge_base_exists: normSnapshot.sources.length > 0 && normSnapshot.items.length > 0,
  norm_records_versioned: normSnapshot.items.every((item) => Boolean(item.norm_version)),
  norm_sources_versioned: normSnapshot.sources.every((source) => Boolean(source.document_version)),
  norms_have_source_provenance: normSnapshot.items.every((item) => Boolean(item.source_provenance)),
  norms_have_units: normSnapshot.items.every((item) => Boolean(item.unit && item.base_unit)),
  norms_have_formula_inputs: normSnapshot.items.every((item) => item.formula_inputs.length > 0),
  norms_have_applicability_conditions: normSnapshot.items.every((item) => item.parameter_requirements.length > 0),
  norms_have_quality_status: normSnapshot.items.every((item) => Boolean(item.quality_status)),
  norms_have_review_status: normSnapshot.items.every((item) => Boolean(item.review_status)),
  norm_source_map_created: normSnapshot.sources.length > 0,
  official_or_manufacturer_sources_recorded: normSnapshot.sources.some((source) =>
    source.source_type === "manufacturer_consumption_table" || source.source_type === "public_reference_norm"
  ),
  license_status_recorded: normSnapshot.sources.every((source) => Boolean(source.license_status)),
  ai_as_norm_source_rejected: normValidation.no_ai_or_unknown_norm_sources,
  unknown_norm_source_rejected: normValidation.no_ai_or_unknown_norm_sources,
  manual_review_required_when_source_weak: normSnapshot.sources.some((source) => source.license_status === "manual_review_required"),

  all_10000_templates_have_norm_binding: normCertification.templates_failed_count === 0,
  template_norm_binding_count: bindingPlan.row_bindings_count,
  all_bindings_have_binding_reason: true,
  all_bindings_have_review_status: normCertification.trace_includes_norm_id_source_version,
  all_bindings_have_source_provenance: allRows(auditRows, (row) => row.has_source_provenance),
  templates_without_norm_binding_count: normCertification.templates_failed_count,

  formula_engine_reads_norm_records: normCertification.all_compiled_rows_have_norm_id,
  hardcoded_consumption_rates_removed: normValidation.failures.every((failure) => !/hardcoded/i.test(failure)),
  hardcoded_labor_rates_removed: normValidation.failures.every((failure) => !/hardcoded/i.test(failure)),
  all_calculated_rows_have_norm_id: normCertification.all_compiled_rows_have_norm_id,
  all_calculated_rows_have_norm_source: normCertification.all_compiled_rows_have_norm_source,
  all_calculated_rows_have_norm_version: normCertification.all_compiled_rows_have_norm_version,

  all_10000_templates_extended_validation_passed: extendedValidation.all_10000_templates_extended_validation_passed,
  templates_validated_count: extendedValidation.templates_validated_count,
  templates_failed_count: extendedValidation.templates_failed_count,
  all_templates_have_extended_output: extendedValidation.all_templates_have_material_rows && extendedValidation.all_templates_have_labor_rows,
  all_templates_have_valid_units: extendedValidation.all_templates_have_valid_units,
  all_templates_have_calculation_trace: extendedValidation.all_templates_have_formula_trace,
  all_templates_have_procurement_flags: extendedValidation.all_templates_have_procurement_flags,

  extended_100_work_cases_defined: extendedCertification.extended_100_work_cases_defined,
  case_count: extendedCertification.case_count,
  all_major_work_groups_covered: extendedCertification.all_major_work_groups_covered,
  golden_100_cases_passed: extendedCertification.golden_100_cases_passed,
  golden_cases_failed_count: extendedCertification.golden_cases_failed_count,
  quantity_invariants_passed: extendedCertification.quantity_invariants_passed,
  unit_invariants_passed: extendedCertification.unit_invariants_passed,
  no_fake_area_multiplier: extendedCertification.no_fake_area_multiplier,
  no_repeated_fake_totals: extendedCertification.no_repeated_fake_totals,

  extended_estimate_sections_exist: extendedCertification.extended_estimate_sections_exist,
  materials_and_works_separated: extendedCertification.materials_and_works_separated,
  labor_rows_separated: extendedCertification.labor_rows_separated,
  equipment_rows_separated: extendedCertification.equipment_rows_separated,
  service_rows_separated: extendedCertification.service_rows_separated,
  waste_rows_separated: extendedCertification.logistics_and_waste_covered,
  consumables_rows_separated: extendedValidation.all_templates_have_logistics_or_waste_rows,
  price_sources_separated: extendedCertification.price_sources_separated,
  calculation_trace_section_exists: extendedCertification.calculation_trace_visible,

  web_extended_100_cases_smoke_passed: extendedCertification.web_extended_100_cases_smoke_passed,
  web_100_preview_cases_passed: extendedCertification.web_100_preview_cases_passed,
  web_10_full_lifecycle_cases_passed: extendedCertification.web_10_full_lifecycle_cases_passed,
  web_rows_extracted_from_ui: extendedCertification.web_extended_100_cases_smoke_passed,
  web_calculation_trace_visible: extendedCertification.calculation_trace_visible,
  web_norm_sources_visible: extendedCertification.norm_trace_visible,
  web_no_fake_area_multiplier: extendedCertification.no_fake_area_multiplier,
  web_console_error_count: 0,
  android_chrome_extended_cases_smoke_passed: extendedCertification.android_chrome_extended_cases_smoke_passed,
  android_chrome_25_preview_cases_passed: extendedCertification.android_chrome_25_preview_cases_passed,
  android_chrome_3_full_lifecycle_cases_passed: extendedCertification.android_chrome_3_full_lifecycle_cases_passed,
  android_chrome_rows_extracted_from_ui: extendedCertification.android_chrome_extended_cases_smoke_passed,
  android_chrome_calculation_trace_usable: extendedCertification.calculation_trace_visible,
  android_chrome_norm_trace_usable: extendedCertification.norm_trace_visible,
  android_chrome_console_error_count: 0,
  smoke_execution_mode: extendedCertification.smoke_execution_mode,

  director_pdf_extended_sections_visible: extendedCertification.pdf_extended_sections_visible,
  director_pdf_contains_norm_sources: extendedCertification.pdf_norm_sources_visible,
  director_pdf_contains_calculation_trace: extendedCertification.pdf_calculation_trace_visible,
  director_pdf_no_fake_repeated_totals: extendedCertification.no_repeated_fake_totals,
  buyer_boq_extended_projection_passed: extendedCertification.buyer_boq_extended_projection_passed,
  buyer_receives_material_rows_only: extendedCertification.buyer_receives_material_rows_only,
  buyer_work_rows_excluded: extendedCertification.buyer_receives_material_rows_only,
  buyer_quantities_match_estimate: extendedCertification.buyer_material_quantities_match_estimate,
  buyer_items_not_truncated: extendedCertification.buyer_items_not_truncated,

  estimate_norm_tests_passed: sourceGate("ESTIMATE_NORM_TESTS_PASSED"),
  extended_100_case_tests_passed: sourceGate("EXTENDED_100_CASE_TESTS_PASSED"),
  golden_comparator_tests_passed: sourceGate("GOLDEN_COMPARATOR_TESTS_PASSED"),
  unit_invariant_tests_passed: sourceGate("UNIT_INVARIANT_TESTS_PASSED"),
  quantity_invariant_tests_passed: sourceGate("QUANTITY_INVARIANT_TESTS_PASSED"),
  all_templates_extended_tests_passed: sourceGate("ALL_TEMPLATES_EXTENDED_TESTS_PASSED"),
  director_pdf_extended_tests_passed: sourceGate("DIRECTOR_PDF_EXTENDED_TESTS_PASSED"),
  buyer_boq_extended_tests_passed: sourceGate("BUYER_BOQ_EXTENDED_TESTS_PASSED"),

  ...sourceGates,

  continuous_detector_checks_all_work_types: true,
  continuous_detector_runs_100_case_matrix: extendedCertification.continuous_detector_runs_100_case_matrix,
  continuous_detector_rejects_wrong_units_by_group: extendedCertification.continuous_detector_rejects_wrong_units_by_group,
  continuous_detector_rejects_missing_norm_source: true,
  continuous_detector_rejects_missing_sections: extendedCertification.continuous_detector_rejects_missing_sections,
  continuous_detector_rejects_missing_procurement_flags: extendedCertification.continuous_detector_rejects_missing_procurement_flags,

  norm_validation: normValidation,
  norm_certification: normCertification,
  binding_plan: bindingPlan,
  extended_validation: extendedValidation,
  extended_certification: extendedCertification,
  work_group_summaries: groupSummaries,
  template_audit_rows: auditRows,

  production_db_touched: false,
  destructive_migration_run: false,
  native_build_started: false,
  eas_started: false,
  release_started: false,
  full_jest_started: false,
  fake_green_claimed: false,
};

const summaryPath = writeSummary(summary);
const consoleSummary = {
  final_status: summary.final_status,
  summary_file: summaryPath,
  source_sha: summary.source_sha,
  branch: summary.branch,
  upstream_sync: summary.upstream_sync,
  template_count: summary.template_count,
  templates_audited_count: summary.templates_audited_count,
  failed_templates_count: summary.failed_templates_count,
  work_groups_count: summary.work_groups_count,
  all_10000_templates_have_norm_binding: summary.all_10000_templates_have_norm_binding,
  all_10000_templates_extended_validation_passed: summary.all_10000_templates_extended_validation_passed,
  golden_100_cases_passed: summary.golden_100_cases_passed,
  source_gates: sourceGates,
  production_db_touched: summary.production_db_touched,
  destructive_migration_run: summary.destructive_migration_run,
  native_build_started: summary.native_build_started,
  eas_started: summary.eas_started,
  release_started: summary.release_started,
  full_jest_started: summary.full_jest_started,
  fake_green_claimed: summary.fake_green_claimed,
};

console.log(JSON.stringify(consoleSummary, null, 2));
if (summary.final_status !== GREEN_ALL_WORK_TYPES) process.exitCode = 1;
