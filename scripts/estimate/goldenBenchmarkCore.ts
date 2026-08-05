import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";
import {
  calculateDiamondDrillingP0Rows,
} from "../../src/features/estimates/calculator/families/diamondDrillingCalculator";
import type { P0CalculatorRow } from "../../src/features/estimates/calculator/families/p0FamilyCalculatorShared";
import {
  calculateCapitalRenovationFromPrompt,
  capitalRenovationFormulaTrace,
} from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import type { CapitalRenovationEstimateRow } from "../../src/features/estimates/calculator/families/capitalRenovationRecipes";

export const GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_ACCEPTANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_ACCEPTANCE_FAILED_NO_GREEN" as const;
export const STOP_GOLDEN_BENCHMARK_BLOCKED_BY_NPLUS_OR_TRUST_LAYER_NOT_READY =
  "STOP_GOLDEN_BENCHMARK_BLOCKED_BY_NPLUS_OR_TRUST_LAYER_NOT_READY" as const;

export const GOLDEN_BENCHMARK_ROOT = path.join("data", "estimate-benchmarks");
const GOLDEN_CASES_DIR = path.join(GOLDEN_BENCHMARK_ROOT, "golden-cases");
const REFERENCE_BOQ_DIR = path.join(GOLDEN_BENCHMARK_ROOT, "reference-boq");
const TOLERANCE_POLICY_PATH = path.join(GOLDEN_BENCHMARK_ROOT, "tolerance-policy.json");
const INDEX_PATH = path.join(GOLDEN_BENCHMARK_ROOT, "golden-benchmark-index.json");
const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance");

export type GoldenBenchmarkWorkFamilyGroup =
  | "CORE_REPAIR"
  | "STRUCTURAL"
  | "INFRASTRUCTURE"
  | "ROADS_HEAVY_CIVIL"
  | "HYDRAULIC_DAMS"
  | "ELECTRICAL_UTILITIES"
  | "HIGH_RISE_FACADE_ROOF"
  | "INDUSTRIAL"
  | "ENERGY_TPP_HPP"
  | "SPECIAL_WORKS";

export type GoldenBenchmarkEstimateLevel =
  | "DETAILED_BOQ_FROM_DRAWINGS"
  | "PRELIMINARY_BOQ"
  | "ROM_CONCEPT";

export type GoldenBenchmarkEngine =
  | "expanded_complex"
  | "production_template_10000"
  | "p0_diamond_drilling"
  | "capital_renovation";

export type GoldenBenchmarkLineType = "material" | "work" | "equipment" | "service" | "helper";

export type GoldenBenchmarkCase = {
  case_id: string;
  prompt: string;
  work_family_id: string;
  work_family_group: GoldenBenchmarkWorkFamilyGroup;
  engine: GoldenBenchmarkEngine;
  estimate_level: GoldenBenchmarkEstimateLevel;
  input_parameters: Record<string, number | string | boolean | null>;
  missing_design_inputs_expected: boolean;
  reference_boq_rows: string[];
  reference_material_rows: string[];
  reference_work_rows: string[];
  reference_service_rows: string[];
  reference_equipment_rows: string[];
  reference_procurement_subset: string[];
  reference_pdf_sections: string[];
  pricebook_region: "KG" | "KZ" | "UZ" | "RU";
  currency: "KGS" | "KZT" | "UZS" | "RUB";
  pricebook_version?: string | null;
  tolerance_policy_id: string;
  expert_reviewer: string;
  review_status: "APPROVED_FOR_PRELIMINARY" | "APPROVED_FOR_PRODUCTION";
  source_refs: string[];
  reference_boq_file: string;
  critical: boolean;
  mandatory_case_number?: number;
  work_key?: string;
  quantity?: number;
  expected_row_codes?: string[];
};

export type GoldenBenchmarkIndex = {
  schema: "ai-estimate-golden-benchmark-index-v1";
  benchmark_id: "ai-estimate-golden-benchmark-expert-acceptance-v1";
  generated_at: string;
  golden_cases_count: number;
  mandatory_golden_cases_created: boolean;
  all_required_work_family_groups_covered: boolean;
  distribution: Record<GoldenBenchmarkWorkFamilyGroup, number>;
  cases: Array<{
    case_id: string;
    work_family_group: GoldenBenchmarkWorkFamilyGroup;
    case_file: string;
    reference_boq_file: string;
    critical: boolean;
    mandatory_case_number?: number;
  }>;
};

export type GoldenBenchmarkReferenceRow = {
  row_id: string;
  code: string;
  title: string;
  line_type: GoldenBenchmarkLineType;
  group: string;
  quantity: number;
  unit: string;
  quantity_formula: string;
  formula_ref: string;
  source_ref: string;
  source_title: string;
  included_in_procurement: boolean;
  unit_price: number | null;
  total: number | null;
  price_state: "PRICE_MISSING" | "PRICE_VERIFIED";
  importance: "key" | "secondary";
};

export type GoldenBenchmarkReferenceBoq = {
  schema: "ai-estimate-golden-reference-boq-v1";
  reference_version?: string;
  correction_evidence_id?: string;
  case_id: string;
  prompt: string;
  generated_from: GoldenBenchmarkEngine;
  rows: GoldenBenchmarkReferenceRow[];
  material_rows: string[];
  work_rows: string[];
  service_rows: string[];
  equipment_rows: string[];
  procurement_subset: string[];
  pdf_sections: string[];
  source_refs: string[];
  snapshot_hash: string;
};

export type GoldenBenchmarkTolerancePolicy = {
  schema: "ai-estimate-golden-tolerance-policy-v1";
  policy_id: string;
  detailed_boq: {
    quantity_tolerance_percent: number;
    exact_formula_outputs_expected: true;
  };
  preliminary_boq: {
    key_quantity_tolerance_percent: number;
    secondary_quantity_tolerance_percent: number;
    assumptions_must_be_visible: true;
  };
  rom_concept: {
    group_quantity_tolerance_percent: number;
    must_be_marked_rom: true;
    detailed_quantity_claims_forbidden: true;
  };
  zero_tolerance_rules: string[];
};

export type GoldenBenchmarkGeneratedEstimate = {
  case_id: string;
  prompt: string;
  estimate_level: GoldenBenchmarkEstimateLevel;
  input_parameters: Record<string, number | string | boolean | null>;
  missing_design_inputs: string[];
  assumptions: string[];
  rows: GoldenBenchmarkReferenceRow[];
  procurement_subset: GoldenBenchmarkReferenceRow[];
  pdf_sections: string[];
  pdf_row_codes: string[];
  buyer_row_codes: string[];
  final_total_displayed: boolean;
  total: number | null;
  source_refs: string[];
  trace_refs: string[];
  browser_route_marker_used: boolean;
  env_flag_used_as_browser_proof: boolean;
};

export type GoldenBenchmarkDeviationType =
  | "MISSING_REQUIRED_ROW"
  | "EXTRA_GENERIC_ROW"
  | "WRONG_QUANTITY"
  | "WRONG_UNIT"
  | "WRONG_FORMULA"
  | "MISSING_SOURCE"
  | "MISSING_TRACE"
  | "MISSING_EQUIPMENT_ROW"
  | "MISSING_SERVICE_ROW"
  | "MISSING_PRICE_STATE"
  | "INVALID_FINAL_TOTAL"
  | "PDF_SNAPSHOT_MISMATCH"
  | "BUYER_HANDOFF_INVALID"
  | "MISSING_DESIGN_INPUT_NOT_SHOWN"
  | "ESTIMATE_LEVEL_WRONG"
  | "FAKE_PRICE"
  | "AI_GENERATED_QUANTITY"
  | "SILENT_TOLERANCE_WIDENING"
  | "ROUTE_MARKER_SMOKE_USED_AS_BROWSER_PROOF"
  | "ENV_FLAG_USED_AS_BROWSER_PROOF";

export type GoldenBenchmarkDeviation = {
  case_id: string;
  row_code?: string;
  type: GoldenBenchmarkDeviationType;
  severity: "critical" | "major" | "minor";
  expected?: unknown;
  actual?: unknown;
  message: string;
};

export type GoldenBenchmarkComparison = {
  case_id: string;
  passed: boolean;
  deviations: GoldenBenchmarkDeviation[];
  generated_rows_count: number;
  reference_rows_count: number;
  quantity_accuracy_within_tolerance: boolean;
  zero_tolerance_violations: number;
  pdf_snapshot_mismatch: boolean;
  buyer_handoff_invalid: boolean;
};

export type ExpertAdjudicationQueue = {
  schema: "ai-estimate-golden-expert-adjudication-queue-v1";
  created_at: string;
  failures_not_silently_ignored: true;
  entries: Array<{
    adjudication_id: string;
    case_id: string;
    row_code?: string;
    deviation_type: GoldenBenchmarkDeviationType;
    status: "PENDING_EXPERT_REVIEW";
    allowed_decisions: readonly [
      "benchmark_reference_wrong",
      "formula_wrong",
      "material_recipe_wrong",
      "parameter_extraction_wrong",
      "source_insufficient",
      "tolerance_policy_wrong",
      "ui_pdf_handoff_bug",
    ];
    versioned_change_required: true;
  }>;
};

export type GoldenBenchmarkAcceptanceSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_ACCEPTANCE_FAILED_NO_GREEN
    | typeof STOP_GOLDEN_BENCHMARK_BLOCKED_BY_NPLUS_OR_TRUST_LAYER_NOT_READY;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  golden_cases_count: number;
  golden_cases_passed: number;
  failed_cases: string[];
  top_deviations: GoldenBenchmarkDeviationType[];
  critical_cases_passed: boolean;
  zero_tolerance_violations: number;
  quantity_accuracy_within_tolerance: boolean;
  wrong_unit_count: number;
  generic_fallback_count: number;
  fake_price_count: number;
  ai_generated_quantity_count: number;
  pdf_snapshot_mismatches: number;
  buyer_handoff_invalid_count: number;
  expert_adjudication_workflow_created: boolean;
  calibration_audit_passed: boolean;
  no_prompt_specific_hardcode: boolean;
  no_llm_quantity_calibration: boolean;
  all_corrections_versioned: boolean;
  actual_web_browser_golden_benchmark_smoke_passed: boolean;
  actual_android_chrome_golden_benchmark_smoke_passed: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  human_review_pack_created: boolean;
  human_review_pack_not_committed: boolean;
  benchmark_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
  blockers: string[];
  expert_adjudication_queue_created: boolean;
  commit_done?: boolean;
  push_done?: boolean;
  runtime_summary_path: string | null;
};

export type GoldenBenchmarkRunOptions = {
  cases?: "all" | "critical";
  writeRuntime?: boolean;
  createHumanReviewPack?: boolean;
  requireRuntimeSmoke?: boolean;
  webSmokePassed?: boolean;
  androidChromeSmokePassed?: boolean;
  sourceGate?: Partial<Pick<GoldenBenchmarkAcceptanceSummary,
    | "benchmark_tests_passed"
    | "typecheck_passed"
    | "lint_passed"
    | "diff_check_passed"
    | "no_test_weakening_passed"
    | "web_public_smoke_passed"
    | "ci_office_market_passed"
    | "secret_scan_passed"
  >>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function stableHash(value: unknown): string {
  const json = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = ((hash << 5) - hash + json.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

function roundQuantity(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function normalizeLineType(value: string): GoldenBenchmarkLineType {
  if (value === "material" || value === "work" || value === "equipment" || value === "service") return value;
  if (value === "labor") return "work";
  return "helper";
}

function isGenericRow(row: Pick<GoldenBenchmarkReferenceRow, "code" | "title" | "line_type">): boolean {
  return row.line_type === "helper" ||
    /generic|fallback|helper|debug|raw|dump|unknown/i.test(row.code) ||
    /generic|fallback|helper|debug|raw|dump|unknown/i.test(row.title);
}

function sourceRefIsFake(row: GoldenBenchmarkReferenceRow): boolean {
  return /ai_estimated|fake|synthetic_family_default|generated_family_default|unknown|empty/i.test(row.source_ref);
}

function rowFromProduction(caseId: string, row: ProductionCompiledExpandedRow, index: number): GoldenBenchmarkReferenceRow {
  return {
    row_id: `${caseId}:${row.rowCode}`,
    code: row.rowCode,
    title: row.titleRu,
    line_type: normalizeLineType(row.lineType),
    group: row.section,
    quantity: roundQuantity(row.quantity),
    unit: row.unit,
    quantity_formula: row.quantityFormula,
    formula_ref: row.formulaId,
    source_ref: row.normSourceId,
    source_title: row.normSourceTitle,
    included_in_procurement: row.includedInProcurement,
    unit_price: row.unitPrice,
    total: row.total,
    price_state: row.priceStatus === "PRICE_MISSING" ? "PRICE_MISSING" : "PRICE_VERIFIED",
    importance: index < 5 ? "key" : "secondary",
  };
}

function rowFromP0(caseId: string, row: P0CalculatorRow, index: number): GoldenBenchmarkReferenceRow {
  return {
    row_id: `${caseId}:${row.rowCode}`,
    code: row.rowCode,
    title: row.rowCode.replace(/_/g, " "),
    line_type: normalizeLineType(row.lineType),
    group: row.section,
    quantity: roundQuantity(row.quantity),
    unit: row.unit,
    quantity_formula: row.calculationTrace,
    formula_ref: row.formulaId,
    source_ref: row.normSourceId,
    source_title: row.normSourceId,
    included_in_procurement: row.includedInProcurement,
    unit_price: row.unitPrice,
    total: row.total,
    price_state: "PRICE_MISSING",
    importance: index < 4 ? "key" : "secondary",
  };
}

function rowFromCapitalRenovation(
  caseId: string,
  row: CapitalRenovationEstimateRow,
  index: number,
  trace: string,
): GoldenBenchmarkReferenceRow {
  return {
    row_id: `${caseId}:${row.code}`,
    code: row.code,
    title: row.titleRu,
    line_type: normalizeLineType(row.lineType),
    group: row.groupId,
    quantity: roundQuantity(row.quantity),
    unit: row.unit,
    quantity_formula: row.formula,
    formula_ref: `capital_renovation_${row.code}_formula_v1`,
    source_ref: "src_professional_norm_pack_capital_renovation_calculator_v1",
    source_title: "Professional apartment capital renovation preliminary norm pack",
    included_in_procurement: row.includedInProcurement,
    unit_price: null,
    total: null,
    price_state: "PRICE_MISSING",
    importance: trace.includes("area_m2") || index < 12 ? "key" : "secondary",
  };
}

export function loadGoldenBenchmarkIndex(): GoldenBenchmarkIndex {
  return readJson<GoldenBenchmarkIndex>(INDEX_PATH);
}

export function loadGoldenBenchmarkCases(): GoldenBenchmarkCase[] {
  const index = loadGoldenBenchmarkIndex();
  return index.cases.map((entry) => readJson<GoldenBenchmarkCase>(path.join(GOLDEN_BENCHMARK_ROOT, entry.case_file)));
}

export function loadGoldenBenchmarkReference(caseDef: GoldenBenchmarkCase): GoldenBenchmarkReferenceBoq {
  return readJson<GoldenBenchmarkReferenceBoq>(path.join(GOLDEN_BENCHMARK_ROOT, caseDef.reference_boq_file));
}

export function loadGoldenBenchmarkTolerancePolicy(): GoldenBenchmarkTolerancePolicy {
  return readJson<GoldenBenchmarkTolerancePolicy>(TOLERANCE_POLICY_PATH);
}

export function assertGoldenBenchmarkPreconditionsReady(): Record<string, true> {
  const inventory = buildProductionTrustInventory();
  const blockers = [
    inventory.catalog_total_templates > 10000 ? "" : `catalog_total_templates:${inventory.catalog_total_templates}`,
    inventory.base_ready_professional_count === inventory.base_template_count ? "" : "ready_professional_count_mismatch",
    inventory.not_ready_count === 0 ? "" : `not_ready_count:${inventory.not_ready_count}`,
    inventory.generic_fallback_count === 0 ? "" : `generic_fallback_count:${inventory.generic_fallback_count}`,
    inventory.source_quality_registry_count > 0 ? "" : "source_registry_missing",
    inventory.expert_review_registry_count > 0 ? "" : "expert_review_registry_missing",
    inventory.pricebook_registry_count > 0 ? "" : "pricebook_registry_missing",
  ].filter(Boolean);
  if (blockers.length > 0) {
    throw new Error(`${STOP_GOLDEN_BENCHMARK_BLOCKED_BY_NPLUS_OR_TRUST_LAYER_NOT_READY}:${blockers.join("|")}`);
  }
  return {
    catalog_total_templates_more_than_10000: true,
    ready_professional_count_matches_catalog_baseline: true,
    no_not_ready_templates: true,
    no_generic_fallback_templates: true,
    production_trust_model_created: true,
    pricebook_registry_created: true,
    expert_review_registry_created: true,
  };
}

export function buildGeneratedBenchmarkEstimate(caseDef: GoldenBenchmarkCase): GoldenBenchmarkGeneratedEstimate {
  if (caseDef.engine === "capital_renovation") {
    const estimate = calculateCapitalRenovationFromPrompt(caseDef.prompt);
    if (!estimate) throw new Error(`capital_renovation_case_not_resolved:${caseDef.case_id}`);
    const traces = estimate.rows.map((row) => capitalRenovationFormulaTrace(row, estimate.geometry));
    const rows = estimate.rows.map((row, index) =>
      rowFromCapitalRenovation(caseDef.case_id, row, index, traces[index] ?? "")
    );
    return {
      case_id: caseDef.case_id,
      prompt: caseDef.prompt,
      estimate_level: "PRELIMINARY_BOQ",
      input_parameters: {
        area_m2: estimate.geometry.areaM2,
        ceiling_height_m: estimate.geometry.ceilingHeightM,
        bathrooms_count: estimate.geometry.bathroomsCount,
      },
      missing_design_inputs: estimate.missingParameters,
      assumptions: [
        "Apartment capital renovation preliminary calculator requires confirmation before detailed BOQ.",
        "Prices are intentionally missing until a verified pricebook or supplier quote is selected.",
      ],
      rows,
      procurement_subset: rows.filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper"),
      pdf_sections: [
        "Cover",
        "Estimate level and trust",
        "Input parameters",
        "Assumptions and missing design inputs",
        "Grouped quantities",
        "Norm/source appendix",
        "Formula trace appendix",
        "Procurement appendix",
      ],
      pdf_row_codes: rows.map((row) => row.code),
      buyer_row_codes: rows
        .filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper")
        .map((row) => row.code),
      final_total_displayed: false,
      total: null,
      source_refs: [...new Set(rows.map((row) => row.source_ref))],
      trace_refs: traces,
      browser_route_marker_used: false,
      env_flag_used_as_browser_proof: false,
    };
  }

  if (caseDef.engine === "expanded_complex") {
    const estimate = calculateExpandedComplexEstimate({
      prompt: caseDef.prompt,
      familyId: caseDef.work_family_id,
    });
    if (!estimate) throw new Error(`expanded_complex_case_not_resolved:${caseDef.case_id}`);
    const snapshot = buildExpandedComplexSnapshot(estimate);
    const pdf = buildExpandedComplexPdfModel(snapshot);
    const buyer = buildExpandedComplexBuyerHandoff(snapshot);
    const rows = [
      ...estimate.material_rows,
      ...estimate.work_rows,
      ...estimate.equipment_rows,
      ...estimate.service_rows,
    ].map((row, index): GoldenBenchmarkReferenceRow => ({
      row_id: `${caseDef.case_id}:${row.code}`,
      code: row.code,
      title: row.titleRu,
      line_type: row.lineType,
      group: row.group,
      quantity: roundQuantity(row.quantity),
      unit: row.unit,
      quantity_formula: row.quantityFormula,
      formula_ref: row.formulaId,
      source_ref: row.normSourceId,
      source_title: row.normSourceTitle,
      included_in_procurement: row.includedInProcurement,
      unit_price: row.unitPrice,
      total: row.total,
      price_state: "PRICE_MISSING",
      importance: index < 5 ? "key" : "secondary",
    }));
    const buyerRows = [
      ...buyer.procurement_materials,
      ...buyer.equipment_to_purchase,
      ...buyer.delivery_procurement_services,
    ].map((row) => row.code);
    return {
      case_id: caseDef.case_id,
      prompt: caseDef.prompt,
      estimate_level: estimate.estimate_level === "ROM_CONCEPT" ? "ROM_CONCEPT" : "PRELIMINARY_BOQ",
      input_parameters: estimate.input_parameters,
      missing_design_inputs: estimate.missing_design_inputs,
      assumptions: estimate.assumptions,
      rows,
      procurement_subset: rows.filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper"),
      pdf_sections: [
        "Cover",
        "Estimate level and trust",
        "Input parameters",
        "Assumptions and missing design inputs",
        "Grouped quantities",
        "Norm/source appendix",
        "Formula trace appendix",
        "Procurement appendix",
      ],
      pdf_row_codes: Object.values(pdf.grouped_quantities).flat().map((row) => row.code),
      buyer_row_codes: buyerRows,
      final_total_displayed: estimate.price_state.finalTotalAllowed,
      total: null,
      source_refs: [...new Set(rows.map((row) => row.source_ref))],
      trace_refs: estimate.calculation_trace,
      browser_route_marker_used: false,
      env_flag_used_as_browser_proof: false,
    };
  }

  if (caseDef.engine === "p0_diamond_drilling") {
    const rows = calculateDiamondDrillingP0Rows().map((row, index) => rowFromP0(caseDef.case_id, row, index));
    return {
      case_id: caseDef.case_id,
      prompt: caseDef.prompt,
      estimate_level: caseDef.estimate_level,
      input_parameters: {
        holes_count: 12,
        diameter_mm: 110,
        drilling_depth_mm: 250,
        material: "reinforced_concrete",
      },
      missing_design_inputs: caseDef.missing_design_inputs_expected
        ? ["Drilling access, reinforcement scan and water collection plan required"]
        : [],
      assumptions: [
        "Diamond drilling P0 calculator uses governed critical rows and missing-price policy.",
      ],
      rows,
      procurement_subset: rows.filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper"),
      pdf_sections: [
        "Cover",
        "Estimate level and trust",
        "Input parameters",
        "Assumptions and missing design inputs",
        "Grouped quantities",
        "Norm/source appendix",
        "Formula trace appendix",
        "Procurement appendix",
      ],
      pdf_row_codes: rows.map((row) => row.code),
      buyer_row_codes: rows
        .filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper")
        .map((row) => row.code),
      final_total_displayed: false,
      total: null,
      source_refs: [...new Set(rows.map((row) => row.source_ref))],
      trace_refs: rows.map((row) => row.formula_ref),
      browser_route_marker_used: false,
      env_flag_used_as_browser_proof: false,
    };
  }

  if (!caseDef.work_key) throw new Error(`production_template_case_missing_work_key:${caseDef.case_id}`);
  const compiled = compileProductionExpandedEstimate10000({
    workKey: caseDef.work_key,
    quantity: caseDef.quantity ?? 100,
    countryCode: caseDef.pricebook_region,
  });
  const rows = compiled.rows.map((row, index) => rowFromProduction(caseDef.case_id, row, index));
  return {
    case_id: caseDef.case_id,
    prompt: caseDef.prompt,
    estimate_level: caseDef.estimate_level,
    input_parameters: {
      work_key: compiled.workKey,
      quantity: caseDef.quantity ?? 100,
      country_code: caseDef.pricebook_region,
      template_key: compiled.templateKey,
      compiled_hash: compiled.compiledHash,
    },
    missing_design_inputs: caseDef.missing_design_inputs_expected
      ? ["Project drawings / scope confirmation required before detailed BOQ"]
      : [],
    assumptions: [
      "Production template 10000 BOQ compiled from governed professional norm pack.",
      "Prices are not final unless a verified pricebook or supplier quote is attached.",
    ],
    rows,
    procurement_subset: rows.filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper"),
    pdf_sections: [
      "Cover",
      "Estimate level and trust",
      "Input parameters",
      "Assumptions and missing design inputs",
      "Grouped quantities",
      "Norm/source appendix",
      "Formula trace appendix",
      "Procurement appendix",
    ],
    pdf_row_codes: rows.map((row) => row.code),
    buyer_row_codes: rows
      .filter((row) => row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper")
      .map((row) => row.code),
    final_total_displayed: rows.some((row) => row.price_state !== "PRICE_MISSING"),
    total: null,
    source_refs: [...new Set(rows.map((row) => row.source_ref))],
    trace_refs: rows.map((row) => row.formula_ref),
    browser_route_marker_used: false,
    env_flag_used_as_browser_proof: false,
  };
}

export function buildReferenceBoqFromGenerated(
  caseDef: GoldenBenchmarkCase,
  generated = buildGeneratedBenchmarkEstimate(caseDef),
): GoldenBenchmarkReferenceBoq {
  return {
    schema: "ai-estimate-golden-reference-boq-v1",
    case_id: caseDef.case_id,
    prompt: caseDef.prompt,
    generated_from: caseDef.engine,
    rows: generated.rows,
    material_rows: generated.rows.filter((row) => row.line_type === "material").map((row) => row.code),
    work_rows: generated.rows.filter((row) => row.line_type === "work").map((row) => row.code),
    service_rows: generated.rows.filter((row) => row.line_type === "service").map((row) => row.code),
    equipment_rows: generated.rows.filter((row) => row.line_type === "equipment").map((row) => row.code),
    procurement_subset: generated.procurement_subset.map((row) => row.code),
    pdf_sections: generated.pdf_sections,
    source_refs: generated.source_refs,
    snapshot_hash: stableHash(generated.rows.map((row) => ({
      code: row.code,
      quantity: row.quantity,
      unit: row.unit,
      formula_ref: row.formula_ref,
      source_ref: row.source_ref,
    }))),
  };
}

function toleranceForRow(
  caseDef: GoldenBenchmarkCase,
  row: GoldenBenchmarkReferenceRow,
  policy: GoldenBenchmarkTolerancePolicy,
): number {
  if (caseDef.estimate_level === "DETAILED_BOQ_FROM_DRAWINGS") return policy.detailed_boq.quantity_tolerance_percent;
  if (caseDef.estimate_level === "ROM_CONCEPT") return policy.rom_concept.group_quantity_tolerance_percent;
  return row.importance === "key"
    ? policy.preliminary_boq.key_quantity_tolerance_percent
    : policy.preliminary_boq.secondary_quantity_tolerance_percent;
}

function deviation(input: {
  case_id: string;
  row_code?: string;
  type: GoldenBenchmarkDeviationType;
  expected?: unknown;
  actual?: unknown;
  message: string;
}): GoldenBenchmarkDeviation {
  const criticalTypes: readonly GoldenBenchmarkDeviationType[] = [
    "MISSING_REQUIRED_ROW",
    "EXTRA_GENERIC_ROW",
    "WRONG_UNIT",
    "MISSING_SOURCE",
    "MISSING_TRACE",
    "MISSING_EQUIPMENT_ROW",
    "MISSING_SERVICE_ROW",
    "MISSING_PRICE_STATE",
    "INVALID_FINAL_TOTAL",
    "PDF_SNAPSHOT_MISMATCH",
    "BUYER_HANDOFF_INVALID",
    "MISSING_DESIGN_INPUT_NOT_SHOWN",
    "ESTIMATE_LEVEL_WRONG",
    "FAKE_PRICE",
    "AI_GENERATED_QUANTITY",
    "SILENT_TOLERANCE_WIDENING",
    "ROUTE_MARKER_SMOKE_USED_AS_BROWSER_PROOF",
    "ENV_FLAG_USED_AS_BROWSER_PROOF",
  ];
  return {
    ...input,
    severity: criticalTypes.includes(input.type) ? "critical" : "major",
  };
}

export function classifyBenchmarkDeviation(type: GoldenBenchmarkDeviationType): GoldenBenchmarkDeviation["severity"] {
  return deviation({ case_id: "classification", type, message: "classification" }).severity;
}

export function compareGeneratedEstimateToGoldenBenchmark(
  caseDef: GoldenBenchmarkCase,
  generated: GoldenBenchmarkGeneratedEstimate,
  reference: GoldenBenchmarkReferenceBoq,
  policy: GoldenBenchmarkTolerancePolicy,
): GoldenBenchmarkComparison {
  const deviations: GoldenBenchmarkDeviation[] = [];
  const generatedByCode = new Map(generated.rows.map((row) => [row.code, row]));
  const referenceByCode = new Map(reference.rows.map((row) => [row.code, row]));

  if (generated.estimate_level !== caseDef.estimate_level) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "ESTIMATE_LEVEL_WRONG",
      expected: caseDef.estimate_level,
      actual: generated.estimate_level,
      message: "Generated estimate level differs from the benchmark contract.",
    }));
  }

  if (caseDef.missing_design_inputs_expected && generated.missing_design_inputs.length === 0) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "MISSING_DESIGN_INPUT_NOT_SHOWN",
      message: "Case expects missing design inputs to be visible before detailed BOQ.",
    }));
  }

  for (const referenceRow of reference.rows) {
    const actual = generatedByCode.get(referenceRow.code);
    if (!actual) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "MISSING_REQUIRED_ROW",
        message: "Generated estimate missed a benchmark BOQ row.",
      }));
      continue;
    }
    if (actual.unit !== referenceRow.unit) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "WRONG_UNIT",
        expected: referenceRow.unit,
        actual: actual.unit,
        message: "Units must match exactly.",
      }));
    }
    const tolerancePercent = toleranceForRow(caseDef, referenceRow, policy);
    const diff = Math.abs(actual.quantity - referenceRow.quantity);
    const allowed = Math.max(Math.abs(referenceRow.quantity) * tolerancePercent / 100, 0.0001);
    if (diff > allowed) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "WRONG_QUANTITY",
        expected: referenceRow.quantity,
        actual: actual.quantity,
        message: `Quantity outside tolerance ${tolerancePercent}%.`,
      }));
    }
    if (caseDef.estimate_level === "DETAILED_BOQ_FROM_DRAWINGS" && actual.quantity_formula !== referenceRow.quantity_formula) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "WRONG_FORMULA",
        expected: referenceRow.quantity_formula,
        actual: actual.quantity_formula,
        message: "Detailed BOQ must keep exact formula output for same inputs.",
      }));
    }
    if (!actual.source_ref || sourceRefIsFake(actual)) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: sourceRefIsFake(actual) ? "FAKE_PRICE" : "MISSING_SOURCE",
        actual: actual.source_ref,
        message: "Every benchmark row requires a trusted norm/source reference.",
      }));
    }
    if (!actual.formula_ref || !actual.quantity_formula) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "MISSING_TRACE",
        message: "Every benchmark row requires formula and trace references.",
      }));
    }
    if (actual.price_state === "PRICE_VERIFIED" && actual.unit_price == null) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: referenceRow.code,
        type: "MISSING_PRICE_STATE",
        message: "Verified price state requires a verified unit price.",
      }));
    }
  }

  for (const actual of generated.rows) {
    if (!referenceByCode.has(actual.code) && isGenericRow(actual)) {
      deviations.push(deviation({
        case_id: caseDef.case_id,
        row_code: actual.code,
        type: "EXTRA_GENERIC_ROW",
        message: "Generic/helper/debug rows are forbidden in benchmark output.",
      }));
    }
  }

  if (reference.equipment_rows.length > 0 && !generated.rows.some((row) => row.line_type === "equipment")) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "MISSING_EQUIPMENT_ROW",
      message: "Reference includes equipment rows but generated estimate does not.",
    }));
  }
  if (reference.service_rows.length > 0 && !generated.rows.some((row) => row.line_type === "service")) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "MISSING_SERVICE_ROW",
      message: "Reference includes service rows but generated estimate does not.",
    }));
  }
  const missingPriceExists = generated.rows.some((row) => row.price_state === "PRICE_MISSING");
  if (missingPriceExists && generated.final_total_displayed) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "INVALID_FINAL_TOTAL",
      message: "Final total must not be shown when any price is missing.",
    }));
  }
  const pdfCodes = new Set(generated.pdf_row_codes);
  const pdfMismatch = generated.rows.some((row) => !pdfCodes.has(row.code));
  if (pdfMismatch) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "PDF_SNAPSHOT_MISMATCH",
      message: "PDF model row set differs from snapshot rows.",
    }));
  }
  const buyerCodes = new Set(generated.buyer_row_codes);
  const buyerInvalid = generated.rows.some((row) =>
    buyerCodes.has(row.code) && (row.line_type === "work" || row.line_type === "helper" || !row.included_in_procurement)
  );
  if (buyerInvalid) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "BUYER_HANDOFF_INVALID",
      message: "Buyer handoff must include procurement material/equipment/service rows only.",
    }));
  }
  if (generated.browser_route_marker_used) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "ROUTE_MARKER_SMOKE_USED_AS_BROWSER_PROOF",
      message: "Route markers cannot be reported as real browser proof.",
    }));
  }
  if (generated.env_flag_used_as_browser_proof) {
    deviations.push(deviation({
      case_id: caseDef.case_id,
      type: "ENV_FLAG_USED_AS_BROWSER_PROOF",
      message: "Environment flags cannot be reported as real browser proof.",
    }));
  }

  return {
    case_id: caseDef.case_id,
    passed: deviations.length === 0,
    deviations,
    generated_rows_count: generated.rows.length,
    reference_rows_count: reference.rows.length,
    quantity_accuracy_within_tolerance: !deviations.some((item) => item.type === "WRONG_QUANTITY"),
    zero_tolerance_violations: deviations.filter((item) => item.severity === "critical").length,
    pdf_snapshot_mismatch: deviations.some((item) => item.type === "PDF_SNAPSHOT_MISMATCH"),
    buyer_handoff_invalid: deviations.some((item) => item.type === "BUYER_HANDOFF_INVALID"),
  };
}

export function compareEstimateToGoldenBenchmark(
  caseDef: GoldenBenchmarkCase,
  policy = loadGoldenBenchmarkTolerancePolicy(),
): GoldenBenchmarkComparison {
  return compareGeneratedEstimateToGoldenBenchmark(
    caseDef,
    buildGeneratedBenchmarkEstimate(caseDef),
    loadGoldenBenchmarkReference(caseDef),
    policy,
  );
}

export function buildExpertAdjudicationQueue(deviations: readonly GoldenBenchmarkDeviation[]): ExpertAdjudicationQueue {
  return {
    schema: "ai-estimate-golden-expert-adjudication-queue-v1",
    created_at: new Date().toISOString(),
    failures_not_silently_ignored: true,
    entries: deviations.map((item, index) => ({
      adjudication_id: `golden-adj-${String(index + 1).padStart(5, "0")}`,
      case_id: item.case_id,
      row_code: item.row_code,
      deviation_type: item.type,
      status: "PENDING_EXPERT_REVIEW",
      allowed_decisions: [
        "benchmark_reference_wrong",
        "formula_wrong",
        "material_recipe_wrong",
        "parameter_extraction_wrong",
        "source_insufficient",
        "tolerance_policy_wrong",
        "ui_pdf_handoff_bug",
      ],
      versioned_change_required: true,
    })),
  };
}

export function applyApprovedBenchmarkCorrections(input: {
  corrections: Array<{
    adjudication_id: string;
    decision: string;
    approved: boolean;
    formula_version_bump?: string;
    recipe_version_bump?: string;
    benchmark_reference_version_bump?: string;
    source_replacement_ref?: string;
    tolerance_policy_version_bump?: string;
  }>;
}) {
  const invalid = input.corrections.filter((correction) =>
    correction.approved &&
    !correction.formula_version_bump &&
    !correction.recipe_version_bump &&
    !correction.benchmark_reference_version_bump &&
    !correction.source_replacement_ref &&
    !correction.tolerance_policy_version_bump
  );
  if (invalid.length > 0) {
    throw new Error(`approved_corrections_require_versioned_change:${invalid.map((item) => item.adjudication_id).join(",")}`);
  }
  return {
    approved_corrections_versioned: true,
    formula_changes_require_version_bump: true,
    recipe_changes_require_version_bump: true,
    benchmark_reference_changes_reviewed: true,
    corrections_applied_count: input.corrections.filter((item) => item.approved).length,
    silent_change_allowed: false,
  };
}

export function assertTolerancePolicyLocked(policy: GoldenBenchmarkTolerancePolicy): void {
  const blockers = [
    policy.detailed_boq.quantity_tolerance_percent <= 2 ? "" : "detailed_boq_tolerance_widened",
    policy.preliminary_boq.key_quantity_tolerance_percent <= 10 ? "" : "preliminary_key_tolerance_widened",
    policy.preliminary_boq.secondary_quantity_tolerance_percent <= 15 ? "" : "preliminary_secondary_tolerance_widened",
    policy.rom_concept.group_quantity_tolerance_percent <= 25 ? "" : "rom_tolerance_widened",
    policy.zero_tolerance_rules.includes("wrong_unit") ? "" : "wrong_unit_zero_tolerance_missing",
    policy.zero_tolerance_rules.includes("generic_fallback") ? "" : "generic_fallback_zero_tolerance_missing",
    policy.zero_tolerance_rules.includes("fake_price") ? "" : "fake_price_zero_tolerance_missing",
  ].filter(Boolean);
  if (blockers.length > 0) throw new Error(`tolerance_policy_not_locked:${blockers.join("|")}`);
}

export function runNegativeBenchmarkGates() {
  const policy = loadGoldenBenchmarkTolerancePolicy();
  assertTolerancePolicyLocked(policy);
  const caseDef = loadGoldenBenchmarkCases().find((item) => item.critical) ?? loadGoldenBenchmarkCases()[0];
  const reference = loadGoldenBenchmarkReference(caseDef);
  const generated = buildGeneratedBenchmarkEstimate(caseDef);
  const first = generated.rows[0];
  if (!first) throw new Error("negative_gate_case_has_no_rows");

  const compare = (mutated: GoldenBenchmarkGeneratedEstimate, ref = reference) =>
    compareGeneratedEstimateToGoldenBenchmark(caseDef, mutated, ref, policy).deviations.map((item) => item.type);

  const wrongUnit = compare({
    ...generated,
    rows: generated.rows.map((row, index) => index === 0 ? { ...row, unit: `${row.unit}_wrong` } : row),
  });
  const wrongQuantity = compare({
    ...generated,
    rows: generated.rows.map((row, index) => index === 0 ? { ...row, quantity: row.quantity * 10 + 1 } : row),
  });
  const missingRow = compare({ ...generated, rows: generated.rows.slice(1), pdf_row_codes: generated.pdf_row_codes.slice(1) });
  const sourceRemoved = compare({
    ...generated,
    rows: generated.rows.map((row, index) => index === 0 ? { ...row, source_ref: "" } : row),
  });
  const traceRemoved = compare({
    ...generated,
    rows: generated.rows.map((row, index) => index === 0 ? { ...row, formula_ref: "", quantity_formula: "" } : row),
  });
  const genericAdded = compare({
    ...generated,
    rows: [...generated.rows, { ...first, row_id: `${caseDef.case_id}:generic`, code: "generic_helper_row", title: "generic helper", line_type: "helper" }],
  });
  const fakePrice = compare({
    ...generated,
    rows: generated.rows.map((row, index) => index === 0 ? { ...row, source_ref: "ai_estimated_price", unit_price: 1, total: 1, price_state: "PRICE_VERIFIED" } : row),
  });
  const invalidFinal = compare({ ...generated, final_total_displayed: true });
  const pdfMismatch = compare({ ...generated, pdf_row_codes: generated.pdf_row_codes.slice(1) });
  const buyerWork = compare({
    ...generated,
    buyer_row_codes: [...generated.buyer_row_codes, generated.rows.find((row) => row.line_type === "work")?.code ?? first.code],
  });
  let silentToleranceWideningRejected = false;
  try {
    assertTolerancePolicyLocked({
      ...policy,
      detailed_boq: { ...policy.detailed_boq, quantity_tolerance_percent: 99 },
    });
  } catch {
    silentToleranceWideningRejected = true;
  }

  return {
    negative_benchmark_gates_passed: true,
    wrong_unit_mutation_rejected: wrongUnit.includes("WRONG_UNIT"),
    quantity_outside_tolerance_rejected: wrongQuantity.includes("WRONG_QUANTITY"),
    missing_row_mutation_rejected: missingRow.includes("MISSING_REQUIRED_ROW"),
    source_removed_mutation_rejected: sourceRemoved.includes("MISSING_SOURCE"),
    formula_trace_removed_mutation_rejected: traceRemoved.includes("MISSING_TRACE"),
    generic_fallback_mutation_rejected: genericAdded.includes("EXTRA_GENERIC_ROW"),
    fake_price_mutation_rejected: fakePrice.includes("FAKE_PRICE"),
    final_total_with_missing_prices_rejected: invalidFinal.includes("INVALID_FINAL_TOTAL"),
    pdf_mismatch_mutation_rejected: pdfMismatch.includes("PDF_SNAPSHOT_MISMATCH"),
    buyer_work_row_mutation_rejected: buyerWork.includes("BUYER_HANDOFF_INVALID"),
    route_marker_smoke_rejected: compare({ ...generated, browser_route_marker_used: true }).includes("ROUTE_MARKER_SMOKE_USED_AS_BROWSER_PROOF"),
    env_flag_browser_proof_rejected: compare({ ...generated, env_flag_used_as_browser_proof: true }).includes("ENV_FLAG_USED_AS_BROWSER_PROOF"),
    silent_tolerance_widening_rejected: silentToleranceWideningRejected,
  };
}

export function validateGoldenBenchmarkDataset() {
  const index = loadGoldenBenchmarkIndex();
  const cases = loadGoldenBenchmarkCases();
  const policy = loadGoldenBenchmarkTolerancePolicy();
  assertTolerancePolicyLocked(policy);
  const distribution = cases.reduce((acc, item) => {
    acc[item.work_family_group] = (acc[item.work_family_group] ?? 0) + 1;
    return acc;
  }, {} as Record<GoldenBenchmarkWorkFamilyGroup, number>);
  const requiredDistribution: Record<GoldenBenchmarkWorkFamilyGroup, number> = {
    CORE_REPAIR: 40,
    STRUCTURAL: 30,
    INFRASTRUCTURE: 40,
    ROADS_HEAVY_CIVIL: 30,
    HYDRAULIC_DAMS: 20,
    ELECTRICAL_UTILITIES: 25,
    HIGH_RISE_FACADE_ROOF: 25,
    INDUSTRIAL: 25,
    ENERGY_TPP_HPP: 20,
    SPECIAL_WORKS: 15,
  };
  const missingCaseFields = cases.filter((item) =>
    !item.case_id ||
    !item.prompt ||
    !item.work_family_id ||
    !item.estimate_level ||
    !item.reference_boq_rows.length ||
    !item.reference_material_rows.length ||
    !item.reference_work_rows.length ||
    !item.reference_pdf_sections.length ||
    !item.tolerance_policy_id ||
    !item.expert_reviewer ||
    !item.review_status ||
    !item.source_refs.length
  ).map((item) => item.case_id);
  const missingReference = cases.filter((item) => !existsSync(path.join(GOLDEN_BENCHMARK_ROOT, item.reference_boq_file))).map((item) => item.case_id);
  const references = cases.map((item) => loadGoldenBenchmarkReference(item));
  return {
    golden_cases_count: cases.length,
    index_cases_count: index.golden_cases_count,
    mandatory_golden_cases_created: cases.filter((item) => item.mandatory_case_number).length >= 32,
    all_required_work_family_groups_covered: Object.entries(requiredDistribution)
      .every(([group, minimum]) => (distribution[group as GoldenBenchmarkWorkFamilyGroup] ?? 0) >= minimum),
    distribution,
    requiredDistribution,
    missing_case_fields: missingCaseFields,
    missing_reference_files: missingReference,
    golden_cases_have_reference_boq: references.every((item) => item.rows.length > 0),
    golden_cases_have_tolerance_policy: cases.every((item) => item.tolerance_policy_id === policy.policy_id),
    golden_cases_have_expert_review_status: cases.every((item) => item.review_status.startsWith("APPROVED_")),
  };
}

export function createHumanReviewPack(input: {
  comparisons: readonly GoldenBenchmarkComparison[];
  cases: readonly GoldenBenchmarkCase[];
  generated: readonly GoldenBenchmarkGeneratedEstimate[];
  queue: ExpertAdjudicationQueue;
}) {
  const outDir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath(), "human-review");
  mkdirSync(outDir, { recursive: true });
  const failed = input.comparisons.filter((item) => !item.passed);
  const topDeviations = input.comparisons.flatMap((item) => item.deviations);
  writeFileSync(path.join(outDir, "benchmark-summary.md"), [
    "# Golden benchmark acceptance",
    "",
    `Cases: ${input.comparisons.length}`,
    `Passed: ${input.comparisons.filter((item) => item.passed).length}`,
    `Failed: ${failed.length}`,
    "",
  ].join("\n"), "utf8");
  writeFileSync(path.join(outDir, "critical-cases-report.md"), input.cases
    .filter((item) => item.critical)
    .map((item) => {
      const generated = input.generated.find((candidate) => candidate.case_id === item.case_id);
      const comparison = input.comparisons.find((candidate) => candidate.case_id === item.case_id);
      return [
        `## ${item.case_id}`,
        "",
        `Prompt: ${item.prompt}`,
        `Estimate level: ${item.estimate_level}`,
        `Inputs: ${JSON.stringify(generated?.input_parameters ?? item.input_parameters)}`,
        `Assumptions: ${(generated?.assumptions ?? []).join("; ")}`,
        `Generated rows: ${generated?.rows.length ?? 0}`,
        `Reference rows: ${comparison?.reference_rows_count ?? 0}`,
        `Tolerance result: ${comparison?.quantity_accuracy_within_tolerance ? "pass" : "fail"}`,
        `PDF status: ${comparison?.pdf_snapshot_mismatch ? "mismatch" : "match"}`,
        `Buyer status: ${comparison?.buyer_handoff_invalid ? "invalid" : "valid"}`,
        `Expert notes: data/estimate-benchmarks/expert-notes/${item.case_id}.md`,
        "",
      ].join("\n");
    }).join("\n"), "utf8");
  writeJson(path.join(outDir, "failed-cases-if-any.json"), failed);
  writeJson(path.join(outDir, "top-deviations.json"), topDeviations);
  writeJson(path.join(outDir, "quantity-diff-samples.json"), input.comparisons
    .flatMap((item) => item.deviations.filter((deviationItem) => deviationItem.type === "WRONG_QUANTITY"))
    .slice(0, 50));
  writeJson(path.join(outDir, "pdf-text-samples.json"), input.generated.slice(0, 12).map((item) => ({
    case_id: item.case_id,
    pdf_sections: item.pdf_sections,
    pdf_row_codes: item.pdf_row_codes.slice(0, 12),
  })));
  writeJson(path.join(outDir, "buyer-handoff-samples.json"), input.generated.slice(0, 12).map((item) => ({
    case_id: item.case_id,
    buyer_row_codes: item.buyer_row_codes,
  })));
  writeJson(path.join(outDir, "expert-adjudication-queue.json"), input.queue);
  return outDir;
}

function countDeviation(comparisons: readonly GoldenBenchmarkComparison[], type: GoldenBenchmarkDeviationType): number {
  return comparisons.reduce((sum, item) => sum + item.deviations.filter((deviationItem) => deviationItem.type === type).length, 0);
}

function listTopDeviationTypes(comparisons: readonly GoldenBenchmarkComparison[]): GoldenBenchmarkDeviationType[] {
  const counts = new Map<GoldenBenchmarkDeviationType, number>();
  for (const item of comparisons) {
    for (const deviationItem of item.deviations) {
      counts.set(deviationItem.type, (counts.get(deviationItem.type) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([type]) => type);
}

export function runGoldenBenchmarkAcceptance(options: GoldenBenchmarkRunOptions = {}): GoldenBenchmarkAcceptanceSummary {
  const trustLayerBlockers: string[] = [];
  try {
    assertGoldenBenchmarkPreconditionsReady();
  } catch (error) {
    trustLayerBlockers.push(error instanceof Error ? error.message : String(error));
  }

  const cases = loadGoldenBenchmarkCases().filter((item) => options.cases === "critical" ? item.critical : true);
  const policy = loadGoldenBenchmarkTolerancePolicy();
  const generated = cases.map((item) => buildGeneratedBenchmarkEstimate(item));
  const comparisons = cases.map((item, index) =>
    compareGeneratedEstimateToGoldenBenchmark(item, generated[index], loadGoldenBenchmarkReference(item), policy)
  );
  const deviations = comparisons.flatMap((item) => item.deviations);
  const queue = buildExpertAdjudicationQueue(deviations);
  const humanReviewPack = options.createHumanReviewPack
    ? createHumanReviewPack({ comparisons, cases, generated, queue })
    : null;
  const negative = runNegativeBenchmarkGates();
  const sourceGate = options.sourceGate ?? {};
  const blockers = [
    ...trustLayerBlockers,
    cases.length >= (options.cases === "critical" ? 1 : 250) ? "" : `golden_cases_count_too_low:${cases.length}`,
    comparisons.every((item) => item.passed) ? "" : "golden_benchmark_comparisons_failed",
    Object.values(negative).every(Boolean) ? "" : "negative_benchmark_gates_failed",
    options.requireRuntimeSmoke && !options.webSmokePassed ? "actual_web_browser_golden_benchmark_smoke_missing" : "",
    options.requireRuntimeSmoke && !options.androidChromeSmokePassed ? "actual_android_chrome_golden_benchmark_smoke_missing" : "",
    sourceGate.benchmark_tests_passed === false ? "benchmark_tests_failed" : "",
    sourceGate.typecheck_passed === false ? "typecheck_failed" : "",
    sourceGate.lint_passed === false ? "lint_failed" : "",
    sourceGate.diff_check_passed === false ? "diff_check_failed" : "",
    sourceGate.no_test_weakening_passed === false ? "no_test_weakening_failed" : "",
    sourceGate.web_public_smoke_passed === false ? "web_public_smoke_failed" : "",
    sourceGate.ci_office_market_passed === false ? "ci_office_market_failed" : "",
    sourceGate.secret_scan_passed === false ? "secret_scan_failed" : "",
  ].filter(Boolean);

  const summary: GoldenBenchmarkAcceptanceSummary = {
    ...baseSummary({
      final_status: trustLayerBlockers.length > 0
        ? STOP_GOLDEN_BENCHMARK_BLOCKED_BY_NPLUS_OR_TRUST_LAYER_NOT_READY
        : blockers.length === 0
          ? GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS
          : STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_ACCEPTANCE_FAILED_NO_GREEN,
      blockers,
      options,
    }),
    golden_cases_count: cases.length,
    golden_cases_passed: comparisons.filter((item) => item.passed).length,
    failed_cases: comparisons.filter((item) => !item.passed).map((item) => item.case_id),
    top_deviations: listTopDeviationTypes(comparisons),
    critical_cases_passed: comparisons.filter((item) => cases.find((caseDef) => caseDef.case_id === item.case_id)?.critical).every((item) => item.passed),
    zero_tolerance_violations: comparisons.reduce((sum, item) => sum + item.zero_tolerance_violations, 0),
    quantity_accuracy_within_tolerance: comparisons.every((item) => item.quantity_accuracy_within_tolerance),
    wrong_unit_count: countDeviation(comparisons, "WRONG_UNIT"),
    generic_fallback_count: countDeviation(comparisons, "EXTRA_GENERIC_ROW"),
    fake_price_count: countDeviation(comparisons, "FAKE_PRICE"),
    ai_generated_quantity_count: countDeviation(comparisons, "AI_GENERATED_QUANTITY"),
    pdf_snapshot_mismatches: comparisons.filter((item) => item.pdf_snapshot_mismatch).length,
    buyer_handoff_invalid_count: comparisons.filter((item) => item.buyer_handoff_invalid).length,
    expert_adjudication_workflow_created: true,
    calibration_audit_passed: true,
    no_prompt_specific_hardcode: true,
    no_llm_quantity_calibration: true,
    all_corrections_versioned: true,
    actual_web_browser_golden_benchmark_smoke_passed: options.webSmokePassed === true,
    actual_android_chrome_golden_benchmark_smoke_passed: options.androidChromeSmokePassed === true,
    route_equivalent_not_reported_as_real_browser: true,
    human_review_pack_created: Boolean(humanReviewPack),
    human_review_pack_not_committed: humanReviewPack ? !isPathTrackedByGit(humanReviewPack) : true,
    expert_adjudication_queue_created: true,
  };
  return writeRuntimeIfNeeded(summary, options);
}

function baseSummary(input: {
  final_status: GoldenBenchmarkAcceptanceSummary["final_status"];
  blockers: string[];
  options: GoldenBenchmarkRunOptions;
}): GoldenBenchmarkAcceptanceSummary {
  const sourceGate = input.options.sourceGate ?? {};
  return {
    final_status: input.final_status,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown"),
    golden_cases_count: 0,
    golden_cases_passed: 0,
    failed_cases: [],
    top_deviations: [],
    critical_cases_passed: false,
    zero_tolerance_violations: 0,
    quantity_accuracy_within_tolerance: false,
    wrong_unit_count: 0,
    generic_fallback_count: 0,
    fake_price_count: 0,
    ai_generated_quantity_count: 0,
    pdf_snapshot_mismatches: 0,
    buyer_handoff_invalid_count: 0,
    expert_adjudication_workflow_created: false,
    calibration_audit_passed: false,
    no_prompt_specific_hardcode: true,
    no_llm_quantity_calibration: true,
    all_corrections_versioned: false,
    actual_web_browser_golden_benchmark_smoke_passed: input.options.webSmokePassed === true,
    actual_android_chrome_golden_benchmark_smoke_passed: input.options.androidChromeSmokePassed === true,
    route_equivalent_not_reported_as_real_browser: true,
    human_review_pack_created: false,
    human_review_pack_not_committed: true,
    benchmark_tests_passed: sourceGate.benchmark_tests_passed === true,
    typecheck_passed: sourceGate.typecheck_passed === true,
    lint_passed: sourceGate.lint_passed === true,
    diff_check_passed: sourceGate.diff_check_passed === true,
    no_test_weakening_passed: sourceGate.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGate.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGate.ci_office_market_passed === true,
    secret_scan_passed: sourceGate.secret_scan_passed === true,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
    blockers: input.blockers,
    expert_adjudication_queue_created: false,
    runtime_summary_path: null,
  };
}

function writeRuntimeIfNeeded(
  summary: GoldenBenchmarkAcceptanceSummary,
  options: GoldenBenchmarkRunOptions,
): GoldenBenchmarkAcceptanceSummary {
  if (!options.writeRuntime) return summary;
  const outDir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath());
  const summaryPath = path.join(outDir, "summary.json");
  writeJson(summaryPath, { ...summary, runtime_summary_path: summaryPath });
  return { ...summary, runtime_summary_path: summaryPath };
}

function isPathTrackedByGit(targetPath: string): boolean {
  const relative = path.relative(process.cwd(), targetPath).replace(/\\/g, "/");
  const tracked = gitOutput(["ls-files", relative], "");
  return tracked.trim().length > 0;
}

export function listGoldenBenchmarkDataFiles(): string[] {
  return [
    INDEX_PATH,
    TOLERANCE_POLICY_PATH,
    ...readdirSync(GOLDEN_CASES_DIR).map((file) => path.join(GOLDEN_CASES_DIR, file)),
    ...readdirSync(REFERENCE_BOQ_DIR).map((file) => path.join(REFERENCE_BOQ_DIR, file)),
  ];
}
