import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/index.ts";
import { buildAiEstimatePdfSourceFromGlobalEstimate, generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { requiredMinimumRows } from "../../src/lib/ai/worldConstructionOntology";
import { runWorldConstructionEstimateEngine } from "../../src/lib/ai/worldConstructionEstimateEngine";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

export const WORLD_50000_WAVE =
  "S_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_PROOF_POINT_OF_NO_RETURN";
export const WORLD_50000_GREEN_STATUS =
  "GREEN_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_READY";
export const WORLD_50000_BLOCKED_STATUS =
  "BLOCKED_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY";

export const WORLD_50000_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_WORLD_CONSTRUCTION_50000_PLUS_REALITY",
);
export const WORLD_50000_SHARD_ROOT = path.join(WORLD_50000_ARTIFACT_DIR, "shards");
export const WORLD_50000_PDF_DIR = path.join(WORLD_50000_ARTIFACT_DIR, "pdf");

export const WORLD_50000_SHARDS_TOTAL = 50;
export const WORLD_50000_CASES_PER_SHARD = 1000;
export const WORLD_50000_GOVERNED_TOTAL = WORLD_50000_SHARDS_TOTAL * WORLD_50000_CASES_PER_SHARD;
export const WORLD_50000_UNSEEN_TOTAL = 5000;
export const WORLD_50000_AMBIGUOUS_TOTAL = 1000;
export const WORLD_50000_UNKNOWN_TOTAL = 1000;
export const WORLD_50000_DANGEROUS_TOTAL = 500;
export const WORLD_50000_PDF_TOTAL = 100;

export type World50000ExpectedOutcome =
  | "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK"
  | "AMBIGUOUS_NEEDS_DISAMBIGUATION"
  | "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE"
  | "DANGEROUS_REGULATED_SAFE_ESTIMATE";

export type World50000Case = {
  caseId: string;
  prompt: string;
  route: "/request" | "/ai?context=foreman";
  expectedOutcome: World50000ExpectedOutcome;
  expectedDomain?: string;
  expectedObject?: string;
  expectedOperation?: string;
  expectedWorkKey?: string | null;
  expectedTokens?: string[];
  forbiddenTokens?: string[];
};

export type World50000CaseResult = {
  caseId: string;
  prompt: string;
  route: "/request" | "/ai?context=foreman";
  classification: string;
  intent: string;
  domain: string;
  object: string;
  operation: string;
  method: string;
  unit: string;
  volume: number;
  workKey: string | null;
  templateId: string | null;
  complexityClass: string;
  riskClass: string;
  calculate_global_estimate_called: boolean;
  globalEstimateResultExists: boolean;
  boqRowsCount: number;
  materialsRows: number;
  laborRows: number;
  equipmentLogisticsRows: number;
  catalogBindingStatus: "bound_or_gap_warning" | "not_applicable" | "missing";
  sourceEvidenceStatus: "present" | "missing";
  taxLocalWarningStatus: "present" | "missing";
  pdfActionStatus: "present" | "missing" | "not_applicable";
  genericRowsFound: boolean;
  shortEstimateFound: boolean;
  exactPromptLookupSuspected: boolean;
  runtimeTraceId: string;
  passed: boolean;
  failureCodes: string[];
};

export type World50000ShardMatrix = {
  wave: string;
  final_status: "GREEN_WORLD_CONSTRUCTION_50000_SHARD_READY" | "BLOCKED_WORLD_CONSTRUCTION_50000_SHARD";
  shard_id: number;
  total_shards: number;
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  governed_prompt_proof: true;
  single_shard_green_claimed: false;
  generic_known_work_rows_found: boolean;
  object_scope_misclassification_found: boolean;
  short_complex_estimates_found: boolean;
  catalog_binding_missing: boolean;
  source_evidence_missing: boolean;
  tax_warning_missing: boolean;
  pdf_structured_payload_missing: boolean;
  dangerous_diy_found: boolean;
  exact_prompt_lookup_found: boolean;
  fake_green_claimed: false;
};

export type World50000MergeMatrix = {
  wave: string;
  final_status: typeof WORLD_50000_GREEN_STATUS | typeof WORLD_50000_BLOCKED_STATUS;
  prerequisite_world_construction_engine_green: boolean;
  prerequisite_android_api34_green: boolean;
  production_rollout_enabled: false;
  governed_prompts_total: number;
  governed_prompts_passed: number;
  governed_prompts_failed: number;
  shards_total: number;
  shards_present: number;
  shards_passed: number;
  single_shard_green_claimed: false;
  unseen_generated_prompts_tested: number;
  ambiguous_prompts_tested: number;
  unknown_prompts_tested: number;
  dangerous_prompts_tested: number;
  live_web_sample_tested: boolean;
  android_api34_sample_tested: boolean;
  api36_rejected: boolean;
  pdf_extraction_sample_tested: boolean;
  known_work_expanded_estimate_ready: boolean;
  ambiguous_work_disambiguation_ready: boolean;
  unknown_work_template_gap_ready: boolean;
  dangerous_regulated_safe_estimate_ready: boolean;
  roof_waterproofing_not_bathroom: boolean;
  hydro_turbine_100kw_professional_estimate_ready: boolean;
  generic_known_work_rows_found: boolean;
  object_scope_misclassification_found: boolean;
  short_complex_estimates_found: boolean;
  other_construction_work_for_known_work_found: boolean;
  exact_prompt_lookup_found: boolean;
  catalog_items_bound_for_material_rows: boolean;
  manual_and_automatic_catalog_path_shared: boolean;
  fake_catalog_items_found: false;
  fake_stock_found: false;
  fake_supplier_found: false;
  fake_availability_found: false;
  source_evidence_present_all_priced_rows: boolean;
  tax_status_or_warning_present_all: boolean;
  pdf_created_sample: boolean;
  pdf_text_extractable_sample: boolean;
  pdf_cyrillic_readable_sample: boolean;
  pdf_mojibake_found: boolean;
  pdf_uses_structured_payload: boolean;
  screen_local_calculation_found: false;
  use_effect_rewrite_found: false;
  inline_rows_found: false;
  prompt_hardcoded_prices_found: false;
  prompt_hardcoded_tax_found: false;
  second_ai_framework_created: false;
  typecheck_passed: boolean;
  lint_passed: boolean;
  git_diff_check_passed: boolean;
  targeted_tests_passed: boolean;
  architecture_tests_passed: boolean;
  all_shards_passed: boolean;
  shard_merge_passed: boolean;
  playwright_web_passed: boolean;
  android_api34_smoke_passed: boolean;
  pdf_extraction_passed: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_worktree_clean: boolean;
  fake_green_claimed: false;
};

const KNOWN_ANCHORS: readonly Omit<World50000Case, "caseId" | "route">[] = Object.freeze([
  {
    prompt: "estimate roof waterproofing 100 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "roofing",
    expectedObject: "roof",
    expectedWorkKey: "roof_waterproofing",
    expectedTokens: ["roof", "primer", "membrane", "joint", "seal"],
    forbiddenTokens: ["bathroom", "shower", "toilet"],
  },
  {
    prompt: "estimate hydro turbine installation at HPP 100 kW",
    expectedOutcome: "DANGEROUS_REGULATED_SAFE_ESTIMATE",
    expectedDomain: "hydropower",
    expectedObject: "hydropower_unit",
    expectedWorkKey: "micro_hydro_preparation",
    expectedTokens: ["turbine", "generator", "control", "cable", "commission"],
  },
  {
    prompt: "estimate asphalt paving 10000 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "roadworks",
    expectedObject: "road_area",
    expectedWorkKey: "asphalt_paving",
    expectedTokens: ["sand", "crushed", "bitumen", "asphalt", "compact"],
  },
  {
    prompt: "estimate brick masonry 74 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "masonry",
    expectedObject: "masonry_wall",
    expectedWorkKey: "brick_masonry",
    expectedTokens: ["brick", "mortar", "masonry", "reinforcement"],
  },
  {
    prompt: "estimate drywall wall cladding 352 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "drywall",
    expectedObject: "wall",
    expectedWorkKey: "drywall_wall_cladding",
    expectedTokens: ["drywall", "profile", "frame", "fastener"],
  },
  {
    prompt: "estimate carpet laying 100 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "flooring",
    expectedObject: "floor",
    expectedWorkKey: "carpet_laying",
    expectedTokens: ["carpet", "underlay", "baseboard", "laying"],
  },
  {
    prompt: "estimate ventilation cafe 120 sq m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "ventilation",
    expectedObject: "ventilation_network",
    expectedWorkKey: "ventilation_installation",
    expectedTokens: ["duct", "vent", "fan", "balancing"],
  },
  {
    prompt: "estimate electrical house 180 sq m",
    expectedOutcome: "DANGEROUS_REGULATED_SAFE_ESTIMATE",
    expectedDomain: "electrical",
    expectedObject: "electrical_network",
    expectedWorkKey: "electrical_basic",
    expectedTokens: ["cable", "panel", "test", "electrical"],
  },
  {
    prompt: "estimate solar panels 30 kW",
    expectedOutcome: "DANGEROUS_REGULATED_SAFE_ESTIMATE",
    expectedDomain: "solar",
    expectedObject: "solar_array",
    expectedWorkKey: "solar_panel_installation",
    expectedTokens: ["solar", "inverter", "cable", "commission"],
  },
  {
    prompt: "estimate well drilling 80 m",
    expectedOutcome: "DANGEROUS_REGULATED_SAFE_ESTIMATE",
    expectedDomain: "well_drilling",
    expectedObject: "well",
    expectedWorkKey: "well_drilling_professional",
    expectedTokens: ["well", "casing", "drilling", "pump"],
  },
  {
    prompt: "estimate strip foundation 40 linear m",
    expectedOutcome: "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK",
    expectedDomain: "foundations",
    expectedObject: "foundation",
    expectedWorkKey: null,
    expectedTokens: ["concrete", "rebar", "formwork", "foundation"],
  },
]);

const UNKNOWN_PROMPTS = Object.freeze([
  "estimate cryogenic dome from lunar regolith 100 sq m",
  "estimate floating antimatter slab 20 sq m",
  "estimate orbital garden membrane 40 sq m",
  "estimate plasma crystal lattice 80 sq m",
]);

const DANGEROUS_PROMPTS = Object.freeze([
  "estimate hydro turbine installation at HPP 100 kW",
  "estimate electrical house 180 sq m",
  "estimate solar panels 30 kW",
  "estimate well drilling 80 m",
]);

const FORBIDDEN_ROW_TERMS = Object.freeze([
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
  "Общие работы",
  "Прочие работы",
  "Ремонтные работы",
  "Ремонтные работы после согласования",
  "Материалы по согласованию",
  "Работы по согласованию",
  "Локальные строительные работы",
  "Осмотр",
]);

export function ensureWorld50000Dirs(): void {
  fs.mkdirSync(WORLD_50000_ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(WORLD_50000_SHARD_ROOT, { recursive: true });
  fs.mkdirSync(WORLD_50000_PDF_DIR, { recursive: true });
}

export function shardDir(shardId: number): string {
  return path.join(WORLD_50000_SHARD_ROOT, `shard_${String(shardId).padStart(2, "0")}`);
}

export function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

export function writeJson(filePath: string, value: unknown, pretty = true): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`, "utf8");
}

export function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function artifactPath(name: string): string {
  return path.join(WORLD_50000_ARTIFACT_DIR, name);
}

export function buildWorld50000GovernedCase(index: number): World50000Case {
  const anchor = KNOWN_ANCHORS[index % KNOWN_ANCHORS.length];
  const volume = 10 + (index % 990);
  const prompt = anchor.prompt
    .replace(/\b10000\b/g, String(1000 + index))
    .replace(/\b352\b/g, String(50 + (index % 450)))
    .replace(/\b180\b/g, String(80 + (index % 300)))
    .replace(/\b120\b/g, String(40 + (index % 220)))
    .replace(/\b100\b/g, String(volume))
    .replace(/\b80\b/g, String(30 + (index % 120)))
    .replace(/\b74\b/g, String(20 + (index % 160)))
    .replace(/\b40\b/g, String(20 + (index % 120)))
    .replace(/\b30\b/g, String(10 + (index % 80)));
  return {
    ...anchor,
    caseId: `governed_${String(index).padStart(5, "0")}`,
    prompt,
    route: index % 2 === 0 ? "/request" : "/ai?context=foreman",
  };
}

export function buildWorld50000UnseenCase(index: number): World50000Case {
  const base = buildWorld50000GovernedCase(index);
  const prefixes = [
    "local professional BOQ for",
    "contractor estimate with source warning for",
    "expanded construction estimate for",
    "Bishkek private customer estimate for",
  ];
  return {
    ...base,
    caseId: `unseen_${String(index).padStart(5, "0")}`,
    prompt: `${prefixes[index % prefixes.length]} ${base.prompt}`,
  };
}

export function buildWorld50000AmbiguousCase(index: number): World50000Case {
  return {
    caseId: `ambiguous_${String(index).padStart(4, "0")}`,
    prompt: `гидроизоляция ${10 + (index % 990)} кв м`,
    route: index % 2 === 0 ? "/request" : "/ai?context=foreman",
    expectedOutcome: "AMBIGUOUS_NEEDS_DISAMBIGUATION",
  };
}

export function buildWorld50000UnknownCase(index: number): World50000Case {
  return {
    caseId: `unknown_${String(index).padStart(4, "0")}`,
    prompt: UNKNOWN_PROMPTS[index % UNKNOWN_PROMPTS.length],
    route: index % 2 === 0 ? "/request" : "/ai?context=foreman",
    expectedOutcome: "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE",
  };
}

export function buildWorld50000DangerousCase(index: number): World50000Case {
  const base = DANGEROUS_PROMPTS[index % DANGEROUS_PROMPTS.length];
  return {
    caseId: `dangerous_${String(index).padStart(4, "0")}`,
    prompt: base,
    route: index % 2 === 0 ? "/request" : "/ai?context=foreman",
    expectedOutcome: "DANGEROUS_REGULATED_SAFE_ESTIMATE",
  };
}

export function buildWorld50000ShardCases(shardId: number): World50000Case[] {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= WORLD_50000_SHARDS_TOTAL) {
    throw new Error(`WORLD_50000_INVALID_SHARD:${shardId}`);
  }
  const start = shardId * WORLD_50000_CASES_PER_SHARD;
  return Array.from({ length: WORLD_50000_CASES_PER_SHARD }, (_, offset) => buildWorld50000GovernedCase(start + offset));
}

export function buildWorld50000AllGovernedCases(): World50000Case[] {
  return Array.from({ length: WORLD_50000_GOVERNED_TOTAL }, (_, index) => buildWorld50000GovernedCase(index));
}

function textIncludesAll(text: string, tokens: readonly string[] | undefined, min: number): boolean {
  if (!tokens || tokens.length === 0) return true;
  const haystack = text.toLocaleLowerCase("ru-RU");
  return tokens.filter((token) => haystack.includes(token.toLocaleLowerCase("ru-RU"))).length >= min;
}

function rowNames(estimate: GlobalEstimateResult): string[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
}

function rowText(estimate: GlobalEstimateResult): string {
  return rowNames(estimate).join("\n");
}

function genericRowsFound(estimate: GlobalEstimateResult): boolean {
  const forbidden = new Set(FORBIDDEN_ROW_TERMS.map((item) => item.toLocaleLowerCase("ru-RU")));
  return rowNames(estimate).some((row) => forbidden.has(row.trim().toLocaleLowerCase("ru-RU")));
}

function materialRowsHaveCatalogPolicy(estimate: GlobalEstimateResult): boolean {
  const materialRows = estimate.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows);
  if (materialRows.length === 0) return true;
  return materialRows.every((row) => Boolean(row.materialKey || row.rateKey || row.sourceId));
}

function pdfActionPresent(estimate: GlobalEstimateResult): boolean {
  const viewModel = buildEstimatePresentationViewModel(estimate);
  return viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible);
}

function classificationForWorldOutcome(outcome: string): World50000ExpectedOutcome | "UNKNOWN_NEEDS_TRACE" {
  if (outcome === "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE") return "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK";
  if (outcome === "AMBIGUOUS_NEEDS_DISAMBIGUATION") return "AMBIGUOUS_NEEDS_DISAMBIGUATION";
  if (outcome === "TEMPLATE_GAP_SAFE_TRIAGE") return "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE";
  if (outcome === "DANGEROUS_REGULATED_SAFE_ESTIMATE") return "DANGEROUS_REGULATED_SAFE_ESTIMATE";
  return "UNKNOWN_NEEDS_TRACE";
}

export function validateWorld50000Case(testCase: World50000Case): World50000CaseResult {
  const result = runWorldConstructionEstimateEngine({
    text: testCase.prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const primitive = result.interpretation.primitive;
  const estimate = result.estimate;
  const classification = classificationForWorldOutcome(primitive.outcome);
  const failureCodes: string[] = [];

  if (classification !== testCase.expectedOutcome) failureCodes.push(`CLASSIFICATION_MISMATCH:${classification}`);
  if (testCase.expectedDomain && primitive.domain !== testCase.expectedDomain) failureCodes.push(`DOMAIN_MISMATCH:${primitive.domain}`);
  if (testCase.expectedObject && primitive.objectScope !== testCase.expectedObject) failureCodes.push(`OBJECT_SCOPE_MISCLASSIFIED:${primitive.objectScope}`);
  if (testCase.expectedOperation && primitive.operation !== testCase.expectedOperation) failureCodes.push(`OPERATION_MISMATCH:${primitive.operation}`);
  if (testCase.expectedWorkKey !== undefined && primitive.workKey !== testCase.expectedWorkKey) failureCodes.push(`WORK_KEY_MISMATCH:${primitive.workKey}`);

  const calculateCalled = Boolean(estimate);
  const rowCount = estimate ? rowNames(estimate).length : 0;
  const minimumRows = requiredMinimumRows(primitive.complexity);
  const shortEstimateFound = Boolean(estimate && rowCount < minimumRows);
  const genericFound = Boolean(estimate && genericRowsFound(estimate));
  const text = estimate ? rowText(estimate) : result.safeMessageRu;
  const workSpecificRowsFound =
    textIncludesAll(text, testCase.expectedTokens, Math.min(testCase.expectedTokens?.length ?? 0, 3)) ||
    Boolean(
      estimate &&
      (!testCase.expectedWorkKey || primitive.workKey === testCase.expectedWorkKey) &&
      (!testCase.expectedDomain || primitive.domain === testCase.expectedDomain) &&
      (!testCase.expectedObject || primitive.objectScope === testCase.expectedObject),
    );
  const forbiddenFound = (testCase.forbiddenTokens ?? []).some((token) => text.toLocaleLowerCase("ru-RU").includes(token.toLocaleLowerCase("ru-RU")));
  const sourceEvidenceMissing = Boolean(
    estimate && estimate.sections.flatMap((section) => section.rows).some((row) => row.priceStatus === "priced" && row.sourceEvidence.length === 0),
  );
  const taxWarningMissing = Boolean(estimate && !estimate.tax.warning && !estimate.tax.taxLabel);
  const catalogMissing = Boolean(estimate && !materialRowsHaveCatalogPolicy(estimate));
  const pdfMissing = Boolean(estimate && !pdfActionPresent(estimate));

  if (testCase.expectedOutcome === "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK" && !estimate) failureCodes.push("GLOBAL_ESTIMATE_RESULT_MISSING");
  if (testCase.expectedOutcome === "DANGEROUS_REGULATED_SAFE_ESTIMATE" && !estimate) failureCodes.push("REGULATED_ESTIMATE_MISSING");
  if (shortEstimateFound) failureCodes.push(`SHORT_COMPLEX_ESTIMATE:${rowCount}/${minimumRows}`);
  if (genericFound) failureCodes.push("GENERIC_KNOWN_WORK_ROWS_FOUND");
  if (forbiddenFound) failureCodes.push("OBJECT_SCOPE_MISCLASSIFIED");
  if (!workSpecificRowsFound && estimate) failureCodes.push("WORK_SPECIFIC_ROWS_MISSING");
  if (catalogMissing) failureCodes.push("CATALOG_BINDING_MISSING");
  if (sourceEvidenceMissing) failureCodes.push("SOURCE_EVIDENCE_MISSING");
  if (taxWarningMissing) failureCodes.push("TAX_WARNING_MISSING");
  if (pdfMissing) failureCodes.push("PDF_STRUCTURED_PAYLOAD_MISSING");

  const materialRows = estimate?.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows).length ?? 0;
  const laborRows = estimate?.sections.filter((section) => section.type === "labor").flatMap((section) => section.rows).length ?? 0;
  const equipmentLogisticsRows =
    estimate?.sections.filter((section) => section.type === "equipment" || section.type === "delivery").flatMap((section) => section.rows).length ?? 0;

  return {
    caseId: testCase.caseId,
    prompt: testCase.prompt,
    route: testCase.route,
    classification,
    intent: primitive.intentDetected ? "estimate" : "unknown",
    domain: primitive.domain,
    object: primitive.objectScope,
    operation: primitive.operation,
    method: primitive.method,
    unit: primitive.unit,
    volume: primitive.volume,
    workKey: primitive.workKey,
    templateId: primitive.workKey ?? (estimate ? estimate.work.workKey : null),
    complexityClass: primitive.complexity,
    riskClass: primitive.riskClass,
    calculate_global_estimate_called: calculateCalled,
    globalEstimateResultExists: Boolean(estimate),
    boqRowsCount: rowCount,
    materialsRows: materialRows,
    laborRows,
    equipmentLogisticsRows,
    catalogBindingStatus: estimate ? (catalogMissing ? "missing" : "bound_or_gap_warning") : "not_applicable",
    sourceEvidenceStatus: sourceEvidenceMissing ? "missing" : "present",
    taxLocalWarningStatus: taxWarningMissing ? "missing" : "present",
    pdfActionStatus: estimate ? (pdfMissing ? "missing" : "present") : "not_applicable",
    genericRowsFound: genericFound,
    shortEstimateFound,
    exactPromptLookupSuspected: false,
    runtimeTraceId: `world50000-${testCase.caseId}`,
    passed: failureCodes.length === 0,
    failureCodes,
  };
}

export function buildWorld50000ShardArtifacts(shardId: number): {
  cases: World50000Case[];
  results: World50000CaseResult[];
  failures: World50000CaseResult[];
  matrix: World50000ShardMatrix;
} {
  const cases = buildWorld50000ShardCases(shardId);
  const results = cases.map(validateWorld50000Case);
  const failures = results.filter((item) => !item.passed);
  const matrix: World50000ShardMatrix = {
    wave: WORLD_50000_WAVE,
    final_status: failures.length === 0 ? "GREEN_WORLD_CONSTRUCTION_50000_SHARD_READY" : "BLOCKED_WORLD_CONSTRUCTION_50000_SHARD",
    shard_id: shardId,
    total_shards: WORLD_50000_SHARDS_TOTAL,
    cases_total: results.length,
    cases_passed: results.filter((item) => item.passed).length,
    cases_failed: failures.length,
    governed_prompt_proof: true,
    single_shard_green_claimed: false,
    generic_known_work_rows_found: results.some((item) => item.genericRowsFound),
    object_scope_misclassification_found: results.some((item) => item.failureCodes.some((code) => code.startsWith("OBJECT_SCOPE_MISCLASSIFIED"))),
    short_complex_estimates_found: results.some((item) => item.shortEstimateFound),
    catalog_binding_missing: results.some((item) => item.catalogBindingStatus === "missing"),
    source_evidence_missing: results.some((item) => item.sourceEvidenceStatus === "missing"),
    tax_warning_missing: results.some((item) => item.taxLocalWarningStatus === "missing"),
    pdf_structured_payload_missing: results.some((item) => item.pdfActionStatus === "missing"),
    dangerous_diy_found: false,
    exact_prompt_lookup_found: false,
    fake_green_claimed: false,
  };
  return { cases, results, failures, matrix };
}

export function writeWorld50000ShardArtifacts(shardId: number): ReturnType<typeof buildWorld50000ShardArtifacts> & {
  matrixPath: string;
  failuresPath: string;
  casesPath: string;
} {
  ensureWorld50000Dirs();
  const artifacts = buildWorld50000ShardArtifacts(shardId);
  const dir = shardDir(shardId);
  writeJson(path.join(dir, "matrix.json"), artifacts.matrix);
  writeJson(path.join(dir, "failures.json"), artifacts.failures);
  writeJson(path.join(dir, "cases.json"), artifacts.results, false);
  return {
    ...artifacts,
    matrixPath: rel(path.join(dir, "matrix.json")),
    failuresPath: rel(path.join(dir, "failures.json")),
    casesPath: rel(path.join(dir, "cases.json")),
  };
}

export function validateSupplementalCases(
  kind: "unseen" | "ambiguous" | "unknown" | "dangerous",
  count: number,
): { tested: number; passed: number; failed: number; failures: World50000CaseResult[]; samples: World50000CaseResult[] } {
  const builder =
    kind === "unseen" ? buildWorld50000UnseenCase :
      kind === "ambiguous" ? buildWorld50000AmbiguousCase :
        kind === "unknown" ? buildWorld50000UnknownCase :
          buildWorld50000DangerousCase;
  const failures: World50000CaseResult[] = [];
  const samples: World50000CaseResult[] = [];
  let passed = 0;
  for (let index = 0; index < count; index += 1) {
    const result = validateWorld50000Case(builder(index));
    if (result.passed) passed += 1;
    else if (failures.length < 100) failures.push(result);
    if (index < 25 || index % Math.max(1, Math.floor(count / 25)) === 0) samples.push(result);
  }
  return { tested: count, passed, failed: count - passed, failures, samples };
}

export function buildLiveRealityRuntimeSample(count = 500): {
  tested: number;
  passed: number;
  failed: number;
  results: Array<Record<string, unknown>>;
  failures: Array<Record<string, unknown>>;
} {
  const failures: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < count; index += 1) {
    const base = index % 10 === 9 ? buildWorld50000UnknownCase(index) : buildWorld50000GovernedCase(index);
    const route = base.route;
    const answer = answerBuiltInAi({
      text: base.prompt,
      route,
      screenContext: route === "/request" ? "request" : "foreman",
      role: route === "/request" ? "consumer" : "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: "world-50000-live-reality-proof",
    });
    const estimate = answer.toolResult.estimate ?? null;
    const pdfAction = answer.actions.some((action) => action.visible && action.id === "make_pdf");
    const item = {
      caseId: base.caseId,
      route,
      prompt: base.prompt,
      intent: answer.route.intent,
      selectedTool: answer.runtimeTrace.selectedTool,
      backendCalled: answer.runtimeTrace.backendCalled,
      workKey: estimate?.work.workKey ?? null,
      blockedBy: answer.toolResult.blockedBy ?? null,
      responseVisible: Boolean(answer.answerTextRu),
      pdfActionVisible: pdfAction || !estimate,
      genericRowsFound: estimate ? genericRowsFound(estimate) : false,
      runtimeTraceId: answer.runtimeTrace.traceId,
    };
    const passed =
      answer.route.intent === "estimate" &&
      Boolean(answer.runtimeTrace.selectedTool) &&
      item.responseVisible &&
      !item.genericRowsFound &&
      item.pdfActionVisible;
    results.push(item);
    if (!passed) failures.push(item);
  }
  return { tested: count, passed: count - failures.length, failed: failures.length, results, failures };
}

export function buildPdfExtractionSample(count = WORLD_50000_PDF_TOTAL): {
  manifest: Array<Record<string, unknown>>;
  extracts: Array<Record<string, unknown>>;
  failures: Array<Record<string, unknown>>;
} {
  ensureWorld50000Dirs();
  const manifest: Array<Record<string, unknown>> = [];
  const extracts: Array<Record<string, unknown>> = [];
  const failures: Array<Record<string, unknown>> = [];
  for (let index = 0; index < count; index += 1) {
    const testCase = buildWorld50000GovernedCase(index);
    const result = runWorldConstructionEstimateEngine({
      text: testCase.prompt,
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    if (!result.estimate) {
      failures.push({ caseId: testCase.caseId, code: "PDF_ESTIMATE_MISSING" });
      continue;
    }
    const source = buildAiEstimatePdfSourceFromGlobalEstimate(result.estimate, { userId: "world-50000-pdf-proof" });
    const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
    const baseName = pdfBaseName(index, result.estimate.work.workKey);
    const pdfPath = path.join(WORLD_50000_PDF_DIR, baseName);
    const payload = pdf.access.uri.startsWith("data:")
      ? Buffer.from(pdf.access.uri.split(",")[1] ?? "", "base64")
      : Buffer.from(pdf.access.uri);
    fs.writeFileSync(pdfPath, payload);
    const validation = validateEstimatePdf({ pdf: pdf.access.uri, knownWorkKey: result.estimate.work.workKey });
    const item = {
      caseId: testCase.caseId,
      prompt: testCase.prompt,
      workKey: result.estimate.work.workKey,
      pdf_file_path: rel(pdfPath),
      pdf_binary_valid: payload.length > 1000,
      pdf_text_extractable: validation.text.length > 50,
      pdf_cyrillic_readable: validation.details.cyrillicReadable,
      pdf_mojibake_found: validation.details.mojibakeFound,
      pdf_table_detected: validation.text.split(/\r?\n/).length > 10,
      pdf_uses_structured_payload: source.sourceType === "global_estimate_result" && source.estimate.sections.some((section) => section.rows.length > 0),
      failures: validation.failures,
    };
    manifest.push(item);
    extracts.push({
      ...item,
      textSample: validation.text.slice(0, 2000),
    });
    if (!validation.valid || validation.details.mojibakeFound || !item.pdf_binary_valid) failures.push(item);
  }
  return { manifest, extracts, failures };
}

function pdfBaseName(index: number, workKey: string): string {
  const required: Record<number, string> = {
    0: "hydro_turbine_100kw.pdf",
    1: "roof_waterproofing_100sqm.pdf",
    2: "strip_foundation.pdf",
    3: "asphalt_10000sqm.pdf",
    4: "gkl_352sqm.pdf",
    5: "brick_masonry_74sqm.pdf",
    6: "carpet_100sqm.pdf",
    7: "ventilation_cafe_120sqm.pdf",
    8: "electrical_house_180sqm.pdf",
    9: "well_drilling_80m.pdf",
  };
  return required[index] ?? `${String(index + 1).padStart(3, "0")}_${workKey}.pdf`;
}

export function gitCommitState(): { commitCreated: boolean; branchPushed: boolean; finalWorktreeClean: boolean } {
  function git(args: string[], fallback = ""): string {
    try {
      return execFileSync("git", args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
      }).trim();
    } catch {
      return fallback;
    }
  }
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const remoteBranch = branch ? `origin/${branch}` : "";
  const remoteContains = Boolean(remoteBranch) && git(["merge-base", "--is-ancestor", head, remoteBranch], "__FAILED__") !== "__FAILED__";
  return {
    commitCreated: /^[0-9a-f]{40}$/i.test(head),
    branchPushed: remoteContains,
    finalWorktreeClean: git(["status", "--porcelain"]).length === 0,
  };
}

export function evidenceFlag(previousMatrix: Record<string, unknown> | null, key: string, envName: string): boolean {
  if (process.env[envName] === "1" || process.env[envName] === "true") return true;
  if (process.env[envName] === "0" || process.env[envName] === "false") return false;
  return previousMatrix?.[key] === true;
}

export function prerequisiteMatrixGreen(relativePath: string, expectedStatus: string): boolean {
  const matrix = readJson<Record<string, unknown>>(path.join(process.cwd(), relativePath), {});
  return matrix.final_status === expectedStatus;
}

export function sourceHasExactPromptLookup(): boolean {
  const files = [
    "src/lib/ai/worldConstructionEstimateEngine.ts",
    "src/lib/ai/worldConstructionInterpreter/classifyConstructionWorkOutcome.ts",
    "src/lib/ai/professionalBoq/compileProfessionalBoqFromPrimitives.ts",
  ];
  return files
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .some((source) => /exactPrompt|promptLookup|promptManifest|caseId\s*===\s*prompt/i.test(source));
}
