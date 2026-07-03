import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter/buildConstructionWorkPlan";
import {
  resolveProfessionalExpandedWorkKey,
} from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  compileProductionExpandedEstimate10000,
  getProductionProjectTemplateGroup10000,
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  PRODUCTION_WORK_DEFINITIONS_10000,
  resolveNormWorkGroupForCategory,
  type EstimateNormWorkGroupKey,
  type ProductionWorkDefinition,
} from "../../src/lib/ai/estimateTemplate10000";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import { resolveGlobalWorkType } from "../../src/lib/ai/globalEstimate/globalWorkTypeResolver";
import type {
  GlobalEstimateInput,
  GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate/globalEstimateTypes";

export const GREEN_AI_ESTIMATE_UNIFIED_PROFESSIONAL_BOQ_ENGINE_FOR_ALL_WORK_TYPES_NO_BUILDS =
  "GREEN_AI_ESTIMATE_UNIFIED_PROFESSIONAL_BOQ_ENGINE_FOR_ALL_WORK_TYPES_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_ENGINE_SPLIT_BRAIN_NOT_RESOLVED =
  "STOP_AI_ESTIMATE_ENGINE_SPLIT_BRAIN_NOT_RESOLVED" as const;
export const STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE =
  "STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE" as const;

export const RUNTIME_ROOT = ".release-runtime/ai-estimate-unified-boq-engine";

const PREVIOUS_FAILURE = "STOP_AI_ESTIMATE_ENGINE_SPLIT_BRAIN_NOT_RESOLVED";
const APARTMENT_WORK_KEY = "apartment_capital_renovation";
const PROFESSIONAL_NORM_PACK_ROOT = "data/estimate-norms/professional";

const GENERIC_STRUCTURAL_SOURCE_IDS = new Set([
  "src_norm_internal_labor_standards_2026_07",
  "src_norm_material_consumption_tables_2026_07",
  "src_norm_public_reference_construction_methods_2026_07",
  "src_norm_estimator_manual_service_policy_2026_07",
]);

type AuditRouteMode = "global_estimate_route" | "production_10000_direct_compile";

type RoutingAuditCase = {
  case_id: string;
  prompt: string;
  route_mode: AuditRouteMode;
  quantity: number;
  unit: string;
  explicit_work_key?: string;
  direct_work_key?: string;
  requested_work_kind: string;
  requested_norm_work_group: EstimateNormWorkGroupKey;
  template10000_lookup_group?: EstimateNormWorkGroupKey;
  preferred_element_key?: string;
  preferred_work_key_fragment?: string;
};

type RouteRow = {
  unit?: string | null;
  section?: string | null;
  normSourceId?: string | null;
  normId?: string | null;
  templateId?: string | null;
  templateVersion?: string | null;
  formulaId?: string | null;
  calculationTrace?: string | null;
  sourceParameters?: Record<string, unknown> | null;
};

type RoutingAuditCaseResult = {
  case_id: string;
  prompt: string;
  route_mode: AuditRouteMode;
  requested_work_kind: string;
  requested_norm_work_group: string;
  selected_work_key: string | null;
  selected_template_key: string | null;
  selected_category: string | null;
  selected_norm_work_group: string | null;
  compiler_path: string;
  uses_10k_template_catalog: boolean;
  uses_apartment_domain_boq: boolean;
  uses_generic_template_engine: boolean;
  uses_norm_pack: boolean;
  uses_synthetic_family_default: boolean;
  professional_norm_pack_file_present: boolean;
  dedicated_work_type_match: boolean;
  norm_group_mismatch: boolean;
  row_count: number;
  section_count: number;
  units: string[];
  real_norm_pack_rows_count: number;
  generic_norm_rows_count: number;
  norm_source_ids: string[];
  all_rows_have_trace_schema: boolean;
  error?: string;
};

export type EstimateEngineRoutingAuditSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_UNIFIED_PROFESSIONAL_BOQ_ENGINE_FOR_ALL_WORK_TYPES_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_ENGINE_SPLIT_BRAIN_NOT_RESOLVED
    | typeof STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE;
  source_sha: string;
  runtime_summary_path?: string;
  previous_failure: typeof PREVIOUS_FAILURE;
  engine_routing_audit_exists: true;
  routing_case_count: number;
  routing_cases: RoutingAuditCaseResult[];
  apartment_54_separate_path_detected: boolean;
  cosmetic_apartment_42_separate_path_detected: boolean;
  template10000_path_detected: boolean;
  split_brain_detected: boolean;
  green_blocked_until_unified: boolean;
  green_blocked_until_real_norm_packs: boolean;
  apartment_capital_renovation_known_by_10k_catalog: boolean;
  apartment_template_group_exists: boolean;
  apartment_template_group_has_child_templates: boolean;
  apartment_boq_represented_as_template_group: boolean;
  apartment_child_templates_bound_to_norms: boolean;
  apartment_uses_same_formula_engine_as_other_work_types: boolean;
  apartment_rows_have_same_trace_schema_as_10k: boolean;
  single_formula_engine_used: boolean;
  all_100_cases_use_unified_engine: boolean;
  all_10000_templates_use_unified_engine: boolean;
  templates_with_separate_manual_path: number;
  cases_using_norm_packs_count: number;
  cases_using_synthetic_family_default_count: number;
  real_standard_or_textbook_norms_required: true;
  generic_template_skeleton_not_accepted_as_real_estimate: true;
  every_work_type_requires_own_norm_pack: true;
  all_routing_cases_have_dedicated_norm_packs: boolean;
  all_routing_cases_use_standard_or_textbook_norms: boolean;
  paint_has_dedicated_template: boolean;
  screed_has_dedicated_template: boolean;
  paint_case_mapped_to_plaster_group: boolean;
  screed_case_has_dedicated_template: boolean;
  fake_green_claimed: false;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  secret_scan_passed: boolean;
};

type RunOptions = {
  writeSummary?: boolean;
};

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_ENGINE_ROUTING_REQUIRES_--all");
  }
}

function sourceSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function pathExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function hasProfessionalNormPackFile(group: string): boolean {
  return pathExists(path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT, `${group}.json`));
}

function canLoad10000Template(workKey: string): boolean {
  try {
    getProductionExpandedTemplate10000(workKey);
    return true;
  } catch {
    return false;
  }
}

function sourceIdFor(row: RouteRow): string {
  return String(row.normSourceId ?? row.sourceParameters?.normSourceId ?? "");
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function rowHasTraceSchema(row: RouteRow): boolean {
  return Boolean(
    row.calculationTrace &&
    row.templateId &&
    row.templateVersion &&
    row.normId &&
    row.formulaId &&
    row.sourceParameters?.normSourceId,
  );
}

function summarizeRows(rows: readonly RouteRow[]): {
  units: string[];
  normSourceIds: string[];
  realNormPackRowsCount: number;
  genericNormRowsCount: number;
  usesSyntheticFamilyDefault: boolean;
  allRowsHaveTraceSchema: boolean;
} {
  const normSourceIds = uniqueSorted(rows.map(sourceIdFor));
  const realNormPackRowsCount = rows.filter((row) => isProfessionalNormPackSourceId(sourceIdFor(row))).length;
  const genericNormRowsCount = rows.filter((row) => GENERIC_STRUCTURAL_SOURCE_IDS.has(sourceIdFor(row))).length;
  return {
    units: uniqueSorted(rows.map((row) => row.unit ?? undefined)),
    normSourceIds,
    realNormPackRowsCount,
    genericNormRowsCount,
    usesSyntheticFamilyDefault: genericNormRowsCount > 0,
    allRowsHaveTraceSchema: rows.length > 0 && rows.every(rowHasTraceSchema),
  };
}

function definitionMatchesWorkKind(definition: ProductionWorkDefinition, requestedWorkKind: string): boolean {
  const normalizedKind = requestedWorkKind.toLowerCase();
  const haystack = [
    definition.workKey,
    definition.visibleNameRu,
    definition.elementKey ?? "",
    definition.operationKey,
  ].join(" ").toLowerCase();
  return haystack.includes(normalizedKind);
}

function firstDefinitionForCase(testCase: RoutingAuditCase): ProductionWorkDefinition | null {
  const lookupGroup = testCase.template10000_lookup_group ?? testCase.requested_norm_work_group;
  const candidates = PRODUCTION_WORK_DEFINITIONS_10000.filter(
    (definition) => resolveNormWorkGroupForCategory(definition.category) === lookupGroup,
  );
  if (candidates.length === 0) return null;
  if (testCase.preferred_element_key) {
    const byElement = candidates.find((definition) => definition.elementKey === testCase.preferred_element_key);
    if (byElement) return byElement;
  }
  if (testCase.preferred_work_key_fragment) {
    const byWorkKey = candidates.find((definition) => definition.workKey.includes(testCase.preferred_work_key_fragment!));
    if (byWorkKey) return byWorkKey;
  }
  return candidates[0] ?? null;
}

function baseGlobalEstimateInput(testCase: RoutingAuditCase): GlobalEstimateInput {
  return {
    text: testCase.prompt,
    explicitWorkKey: testCase.explicit_work_key,
    volume: testCase.quantity,
    unit: testCase.unit,
    estimateDetailLevel: "professional_expanded",
    countryCode: "KG",
    city: "Bishkek",
    currency: "KGS",
  };
}

function compileGlobalRouteCase(testCase: RoutingAuditCase): RoutingAuditCaseResult {
  const estimateInput = baseGlobalEstimateInput(testCase);
  const semanticPlan = buildConstructionWorkPlan(testCase.prompt);
  const resolvedWork = resolveGlobalWorkType({ ...estimateInput, language: "en" });
  const professionalExpandedWorkKey = resolveProfessionalExpandedWorkKey({
    estimateInput,
    resolvedWorkKey: resolvedWork.workKey,
    semanticWorkKey: semanticPlan?.workKey,
  });
  const estimate: GlobalEstimateResult = calculateGlobalConstructionEstimateSync(estimateInput);
  const rows = estimate.sections.flatMap((section) => section.rows);
  const summary = summarizeRows(rows);
  const selectedWorkKey = estimate.work.workKey;
  const selectedKnownBy10000 = canLoad10000Template(selectedWorkKey);
  const selectedProjectGroup = getProductionProjectTemplateGroup10000(selectedWorkKey);
  const usesApartmentDomainBoq = selectedWorkKey === APARTMENT_WORK_KEY && !selectedKnownBy10000;
  const selectedGroup = selectedWorkKey === APARTMENT_WORK_KEY
    ? "apartment_project_template_group"
    : estimate.work.category;

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    route_mode: testCase.route_mode,
    requested_work_kind: testCase.requested_work_kind,
    requested_norm_work_group: testCase.requested_norm_work_group,
    selected_work_key: selectedWorkKey,
    selected_template_key: selectedKnownBy10000
      ? getProductionExpandedTemplate10000(selectedWorkKey).templateKey
      : `${professionalExpandedWorkKey ?? selectedWorkKey}_professional_expanded_real_boq`,
    selected_category: estimate.work.category,
    selected_norm_work_group: selectedGroup,
    compiler_path: usesApartmentDomainBoq
      ? "professionalExpandedGlobalEstimate.manual_domain_boq.apartment_capital_renovation"
      : selectedProjectGroup
        ? "productionProjectTemplateGroup10000.compileProductionExpandedEstimate10000"
        : "professionalExpandedGlobalEstimate.manual_or_generated_overlay",
    uses_10k_template_catalog: selectedKnownBy10000,
    uses_apartment_domain_boq: usesApartmentDomainBoq,
    uses_generic_template_engine: selectedKnownBy10000,
    uses_norm_pack: summary.realNormPackRowsCount > 0,
    uses_synthetic_family_default: summary.usesSyntheticFamilyDefault,
    professional_norm_pack_file_present: hasProfessionalNormPackFile(testCase.requested_norm_work_group),
    dedicated_work_type_match: selectedWorkKey.includes(testCase.requested_work_kind),
    norm_group_mismatch: selectedGroup !== testCase.requested_norm_work_group,
    row_count: rows.length,
    section_count: estimate.sections.length,
    units: summary.units,
    real_norm_pack_rows_count: summary.realNormPackRowsCount,
    generic_norm_rows_count: summary.genericNormRowsCount,
    norm_source_ids: summary.normSourceIds,
    all_rows_have_trace_schema: summary.allRowsHaveTraceSchema,
  };
}

function compileProduction10000Case(testCase: RoutingAuditCase): RoutingAuditCaseResult {
  if (testCase.direct_work_key) {
    try {
      const selectedWorkKey = testCase.direct_work_key;
      const template = getProductionExpandedTemplate10000(selectedWorkKey);
      const compiled = compileProductionExpandedEstimate10000({
        workKey: selectedWorkKey,
        quantity: testCase.quantity,
        countryCode: "KG",
      });
      const rows = compiled.rows;
      const summary = summarizeRows(rows);
      const projectGroup = getProductionProjectTemplateGroup10000(selectedWorkKey);
      const selectedGroup = projectGroup
        ? testCase.requested_norm_work_group
        : resolveNormWorkGroupForCategory(compiled.category) ?? "services";
      return {
        case_id: testCase.case_id,
        prompt: testCase.prompt,
        route_mode: testCase.route_mode,
        requested_work_kind: testCase.requested_work_kind,
        requested_norm_work_group: testCase.requested_norm_work_group,
        selected_work_key: selectedWorkKey,
        selected_template_key: template.templateKey,
        selected_category: compiled.category,
        selected_norm_work_group: selectedGroup,
        compiler_path: projectGroup
          ? "productionProjectTemplateGroup10000.compileProductionExpandedEstimate10000"
          : "productionExpandedWorkCatalog10000.compileProductionExpandedEstimate10000",
        uses_10k_template_catalog: true,
        uses_apartment_domain_boq: false,
        uses_generic_template_engine: true,
        uses_norm_pack: summary.realNormPackRowsCount > 0,
        uses_synthetic_family_default: summary.usesSyntheticFamilyDefault,
        professional_norm_pack_file_present: hasProfessionalNormPackFile(testCase.requested_norm_work_group),
        dedicated_work_type_match: selectedWorkKey.includes(testCase.requested_work_kind),
        norm_group_mismatch: selectedGroup !== testCase.requested_norm_work_group,
        row_count: rows.length,
        section_count: new Set(rows.map((row) => row.section)).size,
        units: summary.units,
        real_norm_pack_rows_count: summary.realNormPackRowsCount,
        generic_norm_rows_count: summary.genericNormRowsCount,
        norm_source_ids: summary.normSourceIds,
        all_rows_have_trace_schema: summary.allRowsHaveTraceSchema,
      };
    } catch (error) {
      return {
        case_id: testCase.case_id,
        prompt: testCase.prompt,
        route_mode: testCase.route_mode,
        requested_work_kind: testCase.requested_work_kind,
        requested_norm_work_group: testCase.requested_norm_work_group,
        selected_work_key: testCase.direct_work_key,
        selected_template_key: null,
        selected_category: null,
        selected_norm_work_group: null,
        compiler_path: "productionExpandedWorkCatalog10000.direct_lookup_failed",
        uses_10k_template_catalog: false,
        uses_apartment_domain_boq: false,
        uses_generic_template_engine: false,
        uses_norm_pack: false,
        uses_synthetic_family_default: false,
        professional_norm_pack_file_present: hasProfessionalNormPackFile(testCase.requested_norm_work_group),
        dedicated_work_type_match: false,
        norm_group_mismatch: true,
        row_count: 0,
        section_count: 0,
        units: [],
        real_norm_pack_rows_count: 0,
        generic_norm_rows_count: 0,
        norm_source_ids: [],
        all_rows_have_trace_schema: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const definition = firstDefinitionForCase(testCase);
  if (!definition) {
    return {
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      route_mode: testCase.route_mode,
      requested_work_kind: testCase.requested_work_kind,
      requested_norm_work_group: testCase.requested_norm_work_group,
      selected_work_key: null,
      selected_template_key: null,
      selected_category: null,
      selected_norm_work_group: null,
      compiler_path: "productionExpandedWorkCatalog10000.lookup_failed",
      uses_10k_template_catalog: false,
      uses_apartment_domain_boq: false,
      uses_generic_template_engine: false,
      uses_norm_pack: false,
      uses_synthetic_family_default: false,
      professional_norm_pack_file_present: hasProfessionalNormPackFile(testCase.requested_norm_work_group),
      dedicated_work_type_match: false,
      norm_group_mismatch: true,
      row_count: 0,
      section_count: 0,
      units: [],
      real_norm_pack_rows_count: 0,
      generic_norm_rows_count: 0,
      norm_source_ids: [],
      all_rows_have_trace_schema: false,
      error: `NO_PRODUCTION_10000_TEMPLATE_FOR_GROUP:${testCase.requested_norm_work_group}`,
    };
  }

  const template = getProductionExpandedTemplate10000(definition.workKey);
  const compiled = compileProductionExpandedEstimate10000({
    workKey: definition.workKey,
    quantity: testCase.quantity,
    countryCode: "KG",
  });
  const rows = compiled.rows;
  const summary = summarizeRows(rows);
  const selectedGroup = resolveNormWorkGroupForCategory(definition.category) ?? "services";

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    route_mode: testCase.route_mode,
    requested_work_kind: testCase.requested_work_kind,
    requested_norm_work_group: testCase.requested_norm_work_group,
    selected_work_key: definition.workKey,
    selected_template_key: template.templateKey,
    selected_category: definition.category,
    selected_norm_work_group: selectedGroup,
    compiler_path: "productionExpandedWorkCatalog10000.compileProductionExpandedEstimate10000",
    uses_10k_template_catalog: true,
    uses_apartment_domain_boq: false,
    uses_generic_template_engine: true,
    uses_norm_pack: summary.realNormPackRowsCount > 0,
    uses_synthetic_family_default: summary.usesSyntheticFamilyDefault,
    professional_norm_pack_file_present: hasProfessionalNormPackFile(testCase.requested_norm_work_group),
    dedicated_work_type_match: definitionMatchesWorkKind(definition, testCase.requested_work_kind),
    norm_group_mismatch: selectedGroup !== testCase.requested_norm_work_group,
    row_count: rows.length,
    section_count: new Set(rows.map((row) => row.section)).size,
    units: summary.units,
    real_norm_pack_rows_count: summary.realNormPackRowsCount,
    generic_norm_rows_count: summary.genericNormRowsCount,
    norm_source_ids: summary.normSourceIds,
    all_rows_have_trace_schema: summary.allRowsHaveTraceSchema,
  };
}

function routingAuditCases(): RoutingAuditCase[] {
  return [
    {
      case_id: "apartment_54_capital",
      prompt: "apartment capital renovation 54 sq_m estimate",
      route_mode: "global_estimate_route",
      quantity: 54,
      unit: "sq_m",
      requested_work_kind: "apartment_capital_renovation",
      requested_norm_work_group: "services",
    },
    {
      case_id: "apartment_42_cosmetic",
      prompt: "cosmetic apartment renovation 42 sq_m estimate",
      route_mode: "global_estimate_route",
      quantity: 42,
      unit: "sq_m",
      explicit_work_key: APARTMENT_WORK_KEY,
      requested_work_kind: "apartment_capital_renovation",
      requested_norm_work_group: "services",
    },
    {
      case_id: "plaster_300_layer_20",
      prompt: "wall plaster 300 m2 layer 20 mm estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 300,
      unit: "m2",
      requested_work_kind: "plaster",
      requested_norm_work_group: "plaster",
      preferred_element_key: "wall_plaster",
    },
    {
      case_id: "screed_100_thickness_50",
      prompt: "floor screed 100 m2 thickness 50 mm estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 100,
      unit: "m2",
      direct_work_key: "screed_cement_sand_50mm",
      requested_work_kind: "screed",
      requested_norm_work_group: "flooring",
      preferred_element_key: "subfloor",
    },
    {
      case_id: "masonry_400_gasblock_200",
      prompt: "gas block masonry 400 m2 thickness 200 mm estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 400,
      unit: "m2",
      requested_work_kind: "masonry",
      requested_norm_work_group: "masonry",
      preferred_work_key_fragment: "block",
    },
    {
      case_id: "tile_45",
      prompt: "tile laying 45 m2 estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 45,
      unit: "m2",
      requested_work_kind: "tile",
      requested_norm_work_group: "tile",
      preferred_element_key: "ceramic_tile",
    },
    {
      case_id: "paint_200_two_coats",
      prompt: "wall painting 200 m2 two coats estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 200,
      unit: "m2",
      direct_work_key: "paint_wall_ceiling_2_coats",
      requested_work_kind: "paint",
      requested_norm_work_group: "paint",
    },
    {
      case_id: "drywall_partition_80",
      prompt: "drywall partition 80 m2 estimate",
      route_mode: "production_10000_direct_compile",
      quantity: 80,
      unit: "m2",
      requested_work_kind: "drywall",
      requested_norm_work_group: "drywall",
      preferred_element_key: "drywall_partition",
    },
  ];
}

function compileCase(testCase: RoutingAuditCase): RoutingAuditCaseResult {
  return testCase.route_mode === "global_estimate_route"
    ? compileGlobalRouteCase(testCase)
    : compileProduction10000Case(testCase);
}

function writeRuntimeSummary(summary: EstimateEngineRoutingAuditSummary): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "summary.json");
  writeFileSync(file, JSON.stringify({ ...summary, runtime_summary_path: file }, null, 2));
  return file;
}

function envPassed(name: string): boolean {
  return process.env[name] === "true";
}

export function runEstimateEngineRoutingAudit(options: RunOptions = {}): EstimateEngineRoutingAuditSummary {
  const cases = routingAuditCases().map(compileCase);
  const apartment54 = cases.find((item) => item.case_id === "apartment_54_capital");
  const cosmeticApartment42 = cases.find((item) => item.case_id === "apartment_42_cosmetic");
  const paintCase = cases.find((item) => item.case_id === "paint_200_two_coats");
  const screedCase = cases.find((item) => item.case_id === "screed_100_thickness_50");
  const apartmentKnownBy10000 = canLoad10000Template(APARTMENT_WORK_KEY);
  const apartmentProjectGroup = getProductionProjectTemplateGroup10000(APARTMENT_WORK_KEY);
  const apartment54SeparatePathDetected =
    apartment54?.uses_apartment_domain_boq === true &&
    apartment54.uses_10k_template_catalog === false;
  const cosmeticApartment42SeparatePathDetected =
    cosmeticApartment42?.uses_apartment_domain_boq === true &&
    cosmeticApartment42.uses_10k_template_catalog === false;
  const template10000PathDetected = cases.some((item) => item.uses_10k_template_catalog);
  const splitBrainDetected = apartment54SeparatePathDetected && template10000PathDetected;
  const casesUsingNormPacksCount = cases.filter((item) => item.uses_norm_pack).length;
  const casesUsingSyntheticFamilyDefaultCount = cases.filter((item) => item.uses_synthetic_family_default).length;
  const allRoutingCasesHaveDedicatedNormPacks =
    cases.every((item) => item.professional_norm_pack_file_present && item.uses_norm_pack);
  const allRoutingCasesUseStandardOrTextbookNorms = false;
  const apartmentTemplateGroupExists = apartmentKnownBy10000 && Boolean(apartmentProjectGroup);
  const apartmentUsesSameFormulaEngine =
    apartmentTemplateGroupExists &&
    apartment54?.uses_10k_template_catalog === true &&
    apartment54.uses_apartment_domain_boq === false;
  const singleFormulaEngineUsed = cases.every((item) => item.uses_10k_template_catalog && !item.uses_apartment_domain_boq);
  const all100CasesUseUnifiedEngine = false;
  const all10000TemplatesUseUnifiedEngine = false;
  const templatesWithSeparateManualPath = apartment54SeparatePathDetected ? 1 : 0;
  const paintHasDedicatedTemplate = paintCase?.norm_group_mismatch === false && paintCase?.selected_norm_work_group === "paint";
  const screedHasDedicatedTemplate = screedCase?.dedicated_work_type_match === true;
  const realNormPacksComplete =
    allRoutingCasesHaveDedicatedNormPacks &&
    allRoutingCasesUseStandardOrTextbookNorms &&
    casesUsingSyntheticFamilyDefaultCount === 0;
  const green =
    apartmentKnownBy10000 &&
    apartmentTemplateGroupExists &&
    singleFormulaEngineUsed &&
    paintHasDedicatedTemplate &&
    screedHasDedicatedTemplate &&
    all100CasesUseUnifiedEngine &&
    all10000TemplatesUseUnifiedEngine &&
    templatesWithSeparateManualPath === 0 &&
    realNormPacksComplete;
  const finalStatus = green
    ? GREEN_AI_ESTIMATE_UNIFIED_PROFESSIONAL_BOQ_ENGINE_FOR_ALL_WORK_TYPES_NO_BUILDS
    : splitBrainDetected || !singleFormulaEngineUsed
      ? STOP_AI_ESTIMATE_ENGINE_SPLIT_BRAIN_NOT_RESOLVED
      : STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE;

  const summary: EstimateEngineRoutingAuditSummary = {
    final_status: finalStatus,
    source_sha: sourceSha(),
    previous_failure: PREVIOUS_FAILURE,
    engine_routing_audit_exists: true,
    routing_case_count: cases.length,
    routing_cases: cases,
    apartment_54_separate_path_detected: apartment54SeparatePathDetected,
    cosmetic_apartment_42_separate_path_detected: cosmeticApartment42SeparatePathDetected,
    template10000_path_detected: template10000PathDetected,
    split_brain_detected: splitBrainDetected,
    green_blocked_until_unified: !singleFormulaEngineUsed,
    green_blocked_until_real_norm_packs: !realNormPacksComplete,
    apartment_capital_renovation_known_by_10k_catalog: apartmentKnownBy10000,
    apartment_template_group_exists: apartmentTemplateGroupExists,
    apartment_template_group_has_child_templates: Boolean(apartmentProjectGroup?.children.length),
    apartment_boq_represented_as_template_group: apartmentTemplateGroupExists,
    apartment_child_templates_bound_to_norms: apartment54?.all_rows_have_trace_schema === true,
    apartment_uses_same_formula_engine_as_other_work_types: apartmentUsesSameFormulaEngine,
    apartment_rows_have_same_trace_schema_as_10k: apartment54?.all_rows_have_trace_schema === true,
    single_formula_engine_used: singleFormulaEngineUsed,
    all_100_cases_use_unified_engine: all100CasesUseUnifiedEngine,
    all_10000_templates_use_unified_engine: all10000TemplatesUseUnifiedEngine,
    templates_with_separate_manual_path: templatesWithSeparateManualPath,
    cases_using_norm_packs_count: casesUsingNormPacksCount,
    cases_using_synthetic_family_default_count: casesUsingSyntheticFamilyDefaultCount,
    real_standard_or_textbook_norms_required: true,
    generic_template_skeleton_not_accepted_as_real_estimate: true,
    every_work_type_requires_own_norm_pack: true,
    all_routing_cases_have_dedicated_norm_packs: allRoutingCasesHaveDedicatedNormPacks,
    all_routing_cases_use_standard_or_textbook_norms: allRoutingCasesUseStandardOrTextbookNorms,
    paint_has_dedicated_template: paintHasDedicatedTemplate,
    screed_has_dedicated_template: screedHasDedicatedTemplate,
    paint_case_mapped_to_plaster_group: paintCase?.selected_norm_work_group === "plaster",
    screed_case_has_dedicated_template: screedHasDedicatedTemplate,
    fake_green_claimed: false,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    typecheck_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_TYPECHECK_PASSED"),
    lint_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_LINT_PASSED"),
    diff_check_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_WEB_PUBLIC_SMOKE_PASSED"),
    secret_scan_passed: envPassed("AI_ESTIMATE_UNIFIED_BOQ_ENGINE_SECRET_SCAN_PASSED"),
  };

  if (options.writeSummary !== false) {
    summary.runtime_summary_path = writeRuntimeSummary(summary);
  }

  return summary;
}

function main(): void {
  try {
    requireAllFlag();
    const summary = runEstimateEngineRoutingAudit();
    console.log(JSON.stringify(summary, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_UNIFIED_PROFESSIONAL_BOQ_ENGINE_FOR_ALL_WORK_TYPES_NO_BUILDS) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimateEngineRouting.ts")) {
  main();
}
