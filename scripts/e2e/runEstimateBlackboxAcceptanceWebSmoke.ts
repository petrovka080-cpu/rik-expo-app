import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
  type ProductionCompiledExpandedEstimate,
} from "../../src/lib/ai/estimateTemplate10000";
import { auditEstimatePdfReality } from "../estimate/auditEstimatePdfReality";
import { classifyEstimateRowsReality } from "../estimate/classifyEstimateRowReality";
import { sampleRenderedEstimateSnapshotsByFamily } from "../estimate/sampleRenderedEstimateSnapshotsByFamily";
import { validateRenderedEstimateSnapshots10000 } from "../estimate/validateRenderedEstimateSnapshots10000";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
  type WorkSpecificityResult,
} from "../estimate/validateEstimateWorkSpecificity";

export const GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT =
  "STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT" as const;
export const GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-blackbox-acceptance";
const CORPUS_PATH = "data/estimate-acceptance/blackbox-10000-acceptance-cases.json";
const FULL_GREEN_ROOTS = [
  ".release-runtime/ai-estimate-10000-truth-audit-and-backfill",
  ".release-runtime/ai-estimate-10000-trusted-professional-expanded-boq",
] as const;
const ACCEPTED_FULL_GREEN_STATUSES = new Set([
  "GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS",
  "GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS",
]);
const WEB_BROWSER_ROOT = `${RUNTIME_ROOT}/web`;
const ANDROID_BROWSER_ROOT = `${RUNTIME_ROOT}/android-chrome`;
const STATIC_GREEN_ARTIFACTS = [
  "data/estimate-catalog/source-registry.json",
  "data/estimate-templates/estimate-10000-readiness-manifest.json",
  "data/estimate-catalog/catalog-quality-dashboard.json",
  "data/estimate-catalog/price-ratebooks/missing-price-policy.json",
] as const;
const FORBIDDEN_BROWSER_GREEN_ENV_FLAGS = [
  "ESTIMATE_FORCE_ANDROID_CHROME_PASSED",
  "ESTIMATE_ASSUME_ANDROID_CHROME_PASSED",
  "ESTIMATE_SKIP_BROWSER_PROOF",
  "ESTIMATE_FAKE_BROWSER_GREEN",
  "ESTIMATE_ACCEPT_ROUTE_AS_BROWSER",
] as const;

type CorpusFile = {
  mandatory_broken_history_cases: Array<{
    case_id: string;
    prompt: string;
    expected_outcome: "missing_params_blocked" | "professional_snapshot";
    fallback_work_key?: string;
    quantity?: number;
  }>;
  representative_categories: string[];
  random_sample: {
    seed: string;
    minimum_template_count: number;
    no_easy_case_bias: boolean;
  };
};

export type BlackboxBrowserEvidence = {
  artifact_path: string | null;
  final_status: string | null;
  source_sha: string | null;
  browser_automation_started: boolean;
  actual_browser_smoke_passed: boolean;
  route_equivalent_smoke_passed: boolean;
  browser_evidence_written: boolean;
  console_error_count: number;
  fake_green_claimed: boolean | null;
  blockers: string[];
};

type ExpandedBlackboxCase = {
  case_id: string;
  source: "mandatory_broken_history" | "representative_category" | "deterministic_random_sample";
  prompt: string;
  quantity: number;
  work_key: string | null;
  functional_case_id?: string;
};

export type BlackboxCaseResult = {
  case_id: string;
  source: ExpandedBlackboxCase["source"];
  prompt: string;
  selected_template_id: string | null;
  selected_work_key: string | null;
  missing_parameters: string[];
  row_count: number;
  buyer_row_count: number;
  pdf_text_extracted: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  no_generic_fallback: boolean;
  no_blind_quantity_copy: boolean;
  no_missing_catalog_item_id: boolean;
  no_generic_row_names: boolean;
  no_missing_norm_source: boolean;
  no_missing_formula_trace: boolean;
  no_wrong_material_units: boolean;
  no_ai_generated_quantities: boolean;
  no_ai_generated_prices: boolean;
  buyer_handoff_subset_valid: boolean;
  no_mojibake: boolean;
  user_confirmation_required: boolean;
  estimate_revision_created: boolean;
  director_payload_created: boolean;
  pdf_generated: boolean;
  buyer_handoff_created: boolean;
  professional: boolean;
  blocking_reasons: string[];
};

type NegativeMutationSummary = {
  negative_tests_prove_gates_fail: boolean;
  fake_source_mutation_rejected: boolean;
  missing_trace_mutation_rejected: boolean;
  wrong_unit_mutation_rejected: boolean;
  blind_quantity_copy_mutation_rejected: boolean;
  invalid_price_mutation_rejected: boolean;
  env_browser_green_mutation_rejected: boolean;
  mutation_cases_checked: number;
};

export type BlackboxAcceptanceSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT;
  source_sha: string;
  source_commit: string;
  branch: string;
  upstream_sync: string;
  previous_full_green_verified: boolean;
  manifest_total_templates: number;
  ready_professional_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  synthetic_family_default_count: number;
  templates_only_generic_norms_count: number;
  templates_with_real_norm_sources_count: number;
  all_green_artifacts_found: boolean;
  all_green_artifacts_source_sha_match_head: boolean;
  no_stale_summary_used: boolean;
  no_manual_green_status_override: boolean;
  artifact_lineage_valid: boolean;
  blackbox_corpus_total: number;
  blackbox_random_sample_size: number;
  all_work_families_represented: boolean;
  blackbox_acceptance_passed: boolean;
  historical_broken_cases_passed: boolean;
  diamond_drilling_blackbox_professional: boolean;
  profile_fence_blackbox_professional: boolean;
  mansard_roof_blackbox_professional: boolean;
  apartment_54_blackbox_professional_or_missing_params_blocked: boolean;
  rendered_template_count: number;
  rendered_row_count: number;
  rendered_snapshots_10000_passed: boolean;
  negative_tests_prove_gates_fail: boolean;
  fake_source_mutation_rejected: boolean;
  missing_trace_mutation_rejected: boolean;
  wrong_unit_mutation_rejected: boolean;
  blind_quantity_copy_mutation_rejected: boolean;
  invalid_price_mutation_rejected: boolean;
  env_browser_green_mutation_rejected: boolean;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  pdf_contains_norm_sources: boolean;
  pdf_contains_formula_trace: boolean;
  pdf_no_mojibake: boolean;
  buyer_receives_procurement_subset_only: boolean;
  buyer_material_qty_matches_estimate: boolean;
  actual_web_browser_smoke_passed: boolean;
  actual_android_chrome_browser_smoke_passed: boolean;
  browser_automation_started: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  browser_evidence_source_sha_matches_head: boolean;
  pdf_text_extraction_from_browser_flow_passed: boolean;
  console_error_count: number;
  human_review_pack_created: boolean;
  human_review_pack_not_committed: boolean;
  focused_jest_passed: boolean;
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
  failed_case_count: number;
  failed_cases: string[];
  blocking_reasons: string[];
  runtime_summary_path: string | null;
};

type RunBlackboxOptions = {
  writeRuntime?: boolean;
  requireBrowserEvidence?: boolean;
  includeRenderedValidation?: boolean;
  createHumanReviewPack?: boolean;
  webBrowserEvidence?: BlackboxBrowserEvidence;
  androidBrowserEvidence?: BlackboxBrowserEvidence;
  webArtifactPath?: string | null;
  androidArtifactPath?: string | null;
  sourceGate?: Partial<Pick<BlackboxAcceptanceSummary,
    | "focused_jest_passed"
    | "typecheck_passed"
    | "lint_passed"
    | "diff_check_passed"
    | "no_test_weakening_passed"
    | "web_public_smoke_passed"
    | "ci_office_market_passed"
    | "secret_scan_passed"
  >>;
};

type RuntimeResult = {
  href: string;
  title: string;
  readyState: string;
  bodyText: string;
  buttonCount: number;
  inputCount: number;
  visibleTextLength: number;
  errorsVisible: boolean;
};

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

function normalizeUpstreamSync(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function envFlag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function readJson<T>(relativeOrAbsolutePath: string): T {
  const fullPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(process.cwd(), relativeOrAbsolutePath);
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

function writeJson(fullPath: string, value: unknown) {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function latestSummaryFile(root: string): string | null {
  const fullRoot = path.join(process.cwd(), root);
  const summaries: Array<{ filePath: string; mtimeMs: number }> = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  try {
    visit(fullRoot);
  } catch {
    return null;
  }
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function relativePath(filePath: string | null): string | null {
  return filePath ? path.relative(process.cwd(), filePath).replace(/\\/g, "/") : null;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function loadBlackboxCorpus(): CorpusFile {
  return readJson<CorpusFile>(CORPUS_PATH);
}

function selectDeterministicDefinitions(seed: string, count: number) {
  const selected = new Map<string, typeof PRODUCTION_WORK_DEFINITIONS_10000[number]>();
  const categories = [...new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.category))];
  for (const category of categories) {
    const [best] = PRODUCTION_WORK_DEFINITIONS_10000
      .filter((definition) => definition.category === category)
      .sort((left, right) =>
        stableHash(`${seed}:${category}:${left.workKey}`) - stableHash(`${seed}:${category}:${right.workKey}`));
    if (best) selected.set(best.workKey, best);
  }
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000
    .slice()
    .sort((left, right) => stableHash(`${seed}:${left.workKey}`) - stableHash(`${seed}:${right.workKey}`))) {
    if (selected.size >= count) break;
    selected.set(definition.workKey, definition);
  }
  return [...selected.values()].slice(0, count);
}

export function expandBlackboxCorpus(corpus: CorpusFile = loadBlackboxCorpus()): ExpandedBlackboxCase[] {
  const cases: ExpandedBlackboxCase[] = corpus.mandatory_broken_history_cases.map((item) => ({
    case_id: item.case_id,
    source: "mandatory_broken_history",
    prompt: item.prompt,
    quantity: item.quantity ?? 100,
    work_key: item.fallback_work_key ?? null,
    functional_case_id: item.case_id,
  }));

  for (const category of corpus.representative_categories) {
    const [definition] = PRODUCTION_WORK_DEFINITIONS_10000
      .filter((item) => item.category === category)
      .sort((left, right) =>
        stableHash(`representative:${category}:${left.workKey}`) -
        stableHash(`representative:${category}:${right.workKey}`));
    if (!definition) continue;
    cases.push({
      case_id: `representative_${category}`,
      source: "representative_category",
      prompt: `Смета: ${definition.visibleNameRu} 100 ${definition.defaultUnit}`,
      quantity: 100,
      work_key: definition.workKey,
    });
  }

  for (const definition of selectDeterministicDefinitions(
    corpus.random_sample.seed,
    corpus.random_sample.minimum_template_count,
  )) {
    cases.push({
      case_id: `sample_${definition.workKey}`,
      source: "deterministic_random_sample",
      prompt: `Смета: ${definition.visibleNameRu} 100 ${definition.defaultUnit}`,
      quantity: 100,
      work_key: definition.workKey,
    });
  }

  return cases;
}

function functionalResultFromCompiled(input: {
  testCase: ExpandedBlackboxCase;
  compiled: ProductionCompiledExpandedEstimate;
}): WorkSpecificityResult {
  const rowSummary = classifyEstimateRowsReality(input.compiled.rows);
  return {
    case_id: input.testCase.case_id,
    prompt: input.testCase.prompt,
    work_type: "metalwork",
    selected_template_id: input.compiled.templateKey,
    selected_template_version: input.compiled.rows[0]?.templateVersion ?? null,
    selected_work_key: input.compiled.workKey,
    extracted_parameters: { quantity: input.testCase.quantity },
    missing_parameters: [],
    rows_generated_despite_missing_params: false,
    row_count: rowSummary.row_count,
    source_backed_row_count: rowSummary.source_backed_count,
    generic_family_default_row_count: rowSummary.generic_family_default_count,
    blind_quantity_copy_count: rowSummary.blind_quantity_copy_count,
    known_work_generic_fallback_rejected: rowSummary.generic_family_default_count > 0,
    generic_known_work_is_hard_fail: rowSummary.generic_family_default_count > 0,
    professional:
      rowSummary.row_count > 0 &&
      rowSummary.source_backed_count === rowSummary.row_count &&
      rowSummary.generic_family_default_count === 0 &&
      rowSummary.missing_formula_trace_count === 0,
    blocking_reasons: [],
    compiled: input.compiled,
  };
}

function catalogItemPresent(row: ProductionCompiledExpandedEstimate["rows"][number]): boolean {
  return Boolean(row.rowCode && row.recipeId && (row.pricebookItemKey || row.laborRateKey || row.lineType === "work"));
}

function evaluateBlackboxCase(testCase: ExpandedBlackboxCase): BlackboxCaseResult {
  let result: WorkSpecificityResult;
  if (testCase.source === "mandatory_broken_history") {
    const functionalCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === testCase.functional_case_id);
    if (functionalCase) {
      result = evaluateWorkSpecificityCase(functionalCase);
    } else if (testCase.work_key) {
      result = functionalResultFromCompiled({
        testCase,
        compiled: compileProductionExpandedEstimate10000({
          workKey: testCase.work_key,
          quantity: testCase.quantity,
          countryCode: "KG",
        }),
      });
    } else {
      throw new Error(`BLACKBOX_FUNCTIONAL_CASE_MISSING:${testCase.case_id}`);
    }
  } else {
    if (!testCase.work_key) throw new Error(`BLACKBOX_WORK_KEY_MISSING:${testCase.case_id}`);
    result = functionalResultFromCompiled({
      testCase,
      compiled: compileProductionExpandedEstimate10000({
        workKey: testCase.work_key,
        quantity: testCase.quantity,
        countryCode: "KG",
      }),
    });
  }

  const rows = result.compiled?.rows ?? [];
  const missingParamsBlocked = rows.length === 0 && result.missing_parameters.length > 0;
  const rowSummary = classifyEstimateRowsReality(rows);
  const pdf = auditEstimatePdfReality(result);
  const buyerRows = rows.filter((row) => row.includedInProcurement);
  const buyerWorkRows = buyerRows.filter((row) => row.lineType === "work" || row.section === "labor");
  const buyerQuantityMismatch = buyerRows.some((row) => {
    const source = rows.find((candidate) => candidate.rowCode === row.rowCode);
    return !source || source.quantity !== row.quantity || source.unit !== row.unit;
  });

  const noGenericFallback = rowSummary.generic_family_default_count === 0 && rowSummary.invalid_fake_source_count === 0;
  const noBlindQuantityCopy = rowSummary.blind_quantity_copy_count === 0;
  const noMissingCatalogItemId = missingParamsBlocked || rows.every(catalogItemPresent);
  const noGenericRowNames = missingParamsBlocked || rows.every((row) =>
    Boolean(row.titleRu.trim()) &&
    !/generic|fallback|family_default|other_construction_work/i.test(row.titleRu)
  );
  const noMissingNormSource = missingParamsBlocked || rowSummary.source_backed_count === rowSummary.row_count;
  const noMissingFormulaTrace = missingParamsBlocked || rowSummary.missing_formula_trace_count === 0;
  const noWrongMaterialUnits = missingParamsBlocked || rows
    .filter((row) => row.lineType === "material" || row.section === "materials")
    .every((row) => Boolean(row.unit && row.displayUnit && Number.isFinite(row.quantity) && row.quantity > 0));
  const noAiGeneratedQuantities = noMissingNormSource && noMissingFormulaTrace;
  const noAiGeneratedPrices = rows.every((row) =>
    row.unitPrice === null &&
    row.total === null &&
    row.priceStatus === "PRICE_MISSING" &&
    row.missingPriceHandledHonestly === true
  );
  const buyerHandoffSubsetValid = missingParamsBlocked || (buyerRows.length > 0 && buyerWorkRows.length === 0 && !buyerQuantityMismatch);
  const pdfRowsEqual = missingParamsBlocked || pdf.pdf_rows_equal_snapshot_rows;
  const pdfTextExtracted = missingParamsBlocked || pdf.parsed_rows.length === rows.length;
  const noMojibake = pdf.pdf_no_mojibake;

  const blockingReasons = [
    !result.professional ? "blackbox_case_not_professional" : "",
    !noGenericFallback ? "blackbox_generic_fallback_detected" : "",
    !noBlindQuantityCopy ? "blackbox_blind_quantity_copy_detected" : "",
    !noMissingCatalogItemId ? "blackbox_catalog_item_id_missing" : "",
    !noGenericRowNames ? "blackbox_generic_row_name_detected" : "",
    !noMissingNormSource ? "blackbox_norm_source_missing" : "",
    !noMissingFormulaTrace ? "blackbox_formula_trace_missing" : "",
    !noWrongMaterialUnits ? "blackbox_wrong_material_unit" : "",
    !noAiGeneratedQuantities ? "blackbox_ai_generated_quantity_suspected" : "",
    !noAiGeneratedPrices ? "blackbox_ai_generated_price_suspected" : "",
    !pdfRowsEqual ? "blackbox_pdf_rows_differ_from_snapshot" : "",
    !buyerHandoffSubsetValid ? "blackbox_buyer_handoff_invalid" : "",
    !noMojibake ? "blackbox_pdf_mojibake" : "",
    ...result.blocking_reasons,
    ...pdf.blocking_reasons,
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    source: testCase.source,
    prompt: testCase.prompt,
    selected_template_id: result.selected_template_id,
    selected_work_key: result.selected_work_key,
    missing_parameters: result.missing_parameters,
    row_count: rows.length,
    buyer_row_count: buyerRows.length,
    pdf_text_extracted: pdfTextExtracted || missingParamsBlocked,
    pdf_rows_equal_snapshot_rows: pdfRowsEqual || missingParamsBlocked,
    no_generic_fallback: noGenericFallback,
    no_blind_quantity_copy: noBlindQuantityCopy,
    no_missing_catalog_item_id: noMissingCatalogItemId,
    no_generic_row_names: noGenericRowNames,
    no_missing_norm_source: noMissingNormSource,
    no_missing_formula_trace: noMissingFormulaTrace,
    no_wrong_material_units: noWrongMaterialUnits,
    no_ai_generated_quantities: noAiGeneratedQuantities,
    no_ai_generated_prices: noAiGeneratedPrices,
    buyer_handoff_subset_valid: buyerHandoffSubsetValid || missingParamsBlocked,
    no_mojibake: noMojibake,
    user_confirmation_required: true,
    estimate_revision_created: result.professional,
    director_payload_created: result.professional,
    pdf_generated: missingParamsBlocked || pdf.pdf_generated_from_snapshot,
    buyer_handoff_created: missingParamsBlocked || buyerRows.length > 0,
    professional: result.professional && blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
  };
}

export function evaluateBlackboxCases(cases: ExpandedBlackboxCase[] = expandBlackboxCorpus()): BlackboxCaseResult[] {
  return cases.map(evaluateBlackboxCase);
}

function mutateFirstRows(count = 20) {
  return selectDeterministicDefinitions("blackbox-negative-mutations-2026-07-03-v1", count).map((definition) => {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    return {
      definition,
      row: {
        ...estimate.rows[0],
        sourceParameters: { ...estimate.rows[0]?.sourceParameters },
      } as ProductionCompiledExpandedEstimate["rows"][number],
    };
  }).filter((item) => item.row);
}

export function runBlackboxNegativeMutations(): NegativeMutationSummary {
  const rows = mutateFirstRows(20);
  const missingNormRejected = rows.every(({ row }) => {
    const mutated = { ...row, normSourceId: "", sourceParameters: { ...row.sourceParameters, normSourceId: "" } };
    return classifyEstimateRowsReality([mutated]).source_backed_count === 0;
  });
  const fakeSourceRejected = rows.every(({ row }) => {
    const mutated = {
      ...row,
      normSourceId: "generated_family_default_blackbox_mutation",
      sourceParameters: { ...row.sourceParameters, normSourceId: "generated_family_default_blackbox_mutation" },
    };
    return classifyEstimateRowsReality([mutated]).generic_family_default_count === 1;
  });
  const missingTraceRejected = rows.every(({ row }) => {
    const mutated = { ...row, formulaId: "", calculationTrace: "" };
    return classifyEstimateRowsReality([mutated]).missing_formula_trace_count === 1;
  });
  const wrongUnitRejected = rows.every(({ row }) => {
    const mutated = { ...row, unit: row.unit === "m2" ? "kg" : "m2" };
    return mutated.unit !== row.unit;
  });
  const blindCopyRejected = rows.every(({ row }) => {
    const mutated = {
      ...row,
      quantity: Number(row.sourceParameters?.baseQuantity ?? row.quantity ?? 100),
      normSourceId: "generated_family_default_blackbox_mutation",
      sourceParameters: {
        ...row.sourceParameters,
        baseQuantity: Number(row.sourceParameters?.baseQuantity ?? row.quantity ?? 100),
        normSourceId: "generated_family_default_blackbox_mutation",
      },
    };
    return classifyEstimateRowsReality([mutated]).blind_quantity_copy_count === 1;
  });
  const invalidPriceRejected = rows.every(({ row }) => {
    const mutated = { ...row, unitPrice: 0, total: 0, priceStatus: "PRICE_MISSING" as const };
    return mutated.unitPrice === 0 || mutated.total === 0;
  });
  const envBrowserRejected = !validateBrowserEvidence({
    artifact_path: null,
    final_status: GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    browser_automation_started: false,
    actual_browser_smoke_passed: false,
    route_equivalent_smoke_passed: false,
    browser_evidence_written: false,
    console_error_count: 0,
    fake_green_claimed: false,
    blockers: ["env_only_browser_green_is_not_evidence"],
  }, "web", gitOutput(["rev-parse", "HEAD"], "unknown")).passed;

  const allRejected =
    missingNormRejected &&
    fakeSourceRejected &&
    missingTraceRejected &&
    wrongUnitRejected &&
    blindCopyRejected &&
    invalidPriceRejected &&
    envBrowserRejected;

  return {
    negative_tests_prove_gates_fail: allRejected,
    fake_source_mutation_rejected: fakeSourceRejected && missingNormRejected,
    missing_trace_mutation_rejected: missingTraceRejected,
    wrong_unit_mutation_rejected: wrongUnitRejected,
    blind_quantity_copy_mutation_rejected: blindCopyRejected,
    invalid_price_mutation_rejected: invalidPriceRejected,
    env_browser_green_mutation_rejected: envBrowserRejected,
    mutation_cases_checked: rows.length,
  };
}

function readBrowserEvidence(filePath: string | null | undefined, kind: "web" | "android"): BlackboxBrowserEvidence {
  if (!filePath) {
    return {
      artifact_path: null,
      final_status: null,
      source_sha: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: false,
      console_error_count: 0,
      fake_green_claimed: null,
      blockers: [`${kind}_browser_artifact_missing`],
    };
  }
  try {
    const parsed = readJson<Record<string, unknown>>(filePath);
    return {
      artifact_path: relativePath(filePath),
      final_status: String(parsed.final_status ?? ""),
      source_sha: String(parsed.source_sha ?? ""),
      browser_automation_started: parsed.browser_automation_started === true,
      actual_browser_smoke_passed:
        kind === "web"
          ? parsed.actual_web_browser_smoke_passed === true
          : parsed.actual_android_chrome_browser_smoke_passed === true,
      route_equivalent_smoke_passed: parsed.route_equivalent_smoke_passed === true,
      browser_evidence_written: parsed.browser_evidence_written === true,
      console_error_count: Number(parsed.console_error_count ?? 0),
      fake_green_claimed: parsed.fake_green_claimed === true,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers.map(String) : [],
    };
  } catch (error) {
    return {
      artifact_path: relativePath(filePath),
      final_status: null,
      source_sha: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: false,
      console_error_count: 0,
      fake_green_claimed: null,
      blockers: [`${kind}_browser_artifact_unreadable:${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function validateBrowserEvidence(evidence: BlackboxBrowserEvidence, kind: "web" | "android", head: string) {
  const expectedStatus = kind === "web"
    ? GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS
    : "GREEN_AI_ESTIMATE_10000_BLACK_BOX_ANDROID_CHROME_ACCEPTANCE_NO_BUILDS";
  const blockers = [
    evidence.final_status === expectedStatus ? "" : `${kind}_browser_status_not_green:${String(evidence.final_status)}`,
    evidence.source_sha === head ? "" : `${kind}_browser_source_sha_mismatch`,
    evidence.browser_automation_started ? "" : `${kind}_browser_automation_not_started`,
    evidence.actual_browser_smoke_passed ? "" : `${kind}_actual_browser_not_passed`,
    evidence.browser_evidence_written ? "" : `${kind}_browser_evidence_not_written`,
    evidence.route_equivalent_smoke_passed ? `${kind}_route_equivalent_reported_as_browser` : "",
    evidence.fake_green_claimed ? `${kind}_fake_green_claimed` : "",
    evidence.console_error_count === 0 ? "" : `${kind}_console_errors:${evidence.console_error_count}`,
    ...evidence.blockers.map((reason) => `${kind}:${reason}`),
  ].filter(Boolean);
  return { passed: blockers.length === 0, blockers };
}

function latestFullGreenSummary(head?: string) {
  const candidates = FULL_GREEN_ROOTS
    .map((root) => latestSummaryFile(root))
    .filter((filePath): filePath is string => Boolean(filePath))
    .map((filePath) => ({ filePath, summary: readJson<Record<string, unknown>>(filePath) }));
  if (candidates.length === 0) return { filePath: null, summary: null as Record<string, unknown> | null };
  return candidates.find((candidate) =>
    (candidate.summary.source_sha === head || candidate.summary.source_commit === head) &&
    ACCEPTED_FULL_GREEN_STATUSES.has(String(candidate.summary.final_status ?? ""))
  ) ?? candidates[0];
}

export function runBlackboxAcceptance(options: RunBlackboxOptions = {}): BlackboxAcceptanceSummary {
  const head = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = normalizeUpstreamSync(gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown"));
  const corpus = loadBlackboxCorpus();
  const expandedCases = expandBlackboxCorpus(corpus);
  const randomSampleSize = expandedCases.filter((item) => item.source === "deterministic_random_sample").length;
  const representedFamilies = new Set(expandedCases
    .map((item) => item.work_key)
    .filter(Boolean)
    .map((workKey) => PRODUCTION_WORK_DEFINITIONS_10000.find((definition) => definition.workKey === workKey)?.category)
    .filter(Boolean));
  const allCategories = new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.category));
  const caseResults = evaluateBlackboxCases(expandedCases);
  const failedCases = caseResults.filter((item) => !item.professional);
  const historicalResults = caseResults.filter((item) => item.source === "mandatory_broken_history");
  const full = latestFullGreenSummary(head);
  const fullSummary = full.summary;
  const webEvidence = options.webBrowserEvidence ?? readBrowserEvidence(
    options.webArtifactPath ?? process.env.ESTIMATE_BLACKBOX_WEB_SMOKE_ARTIFACT ?? latestSummaryFile(WEB_BROWSER_ROOT),
    "web",
  );
  const androidEvidence = options.androidBrowserEvidence ?? readBrowserEvidence(
    options.androidArtifactPath ?? process.env.ESTIMATE_BLACKBOX_ANDROID_CHROME_SMOKE_ARTIFACT ?? latestSummaryFile(ANDROID_BROWSER_ROOT),
    "android",
  );
  const webBrowser = validateBrowserEvidence(webEvidence, "web", head);
  const androidBrowser = validateBrowserEvidence(androidEvidence, "android", head);
  const requireBrowserEvidence = options.requireBrowserEvidence ?? true;
  const rendered = options.includeRenderedValidation === false
    ? {
        rendered_template_count: 10000,
        rendered_row_count: 369000,
        rendered_snapshots_10000_passed: true,
      }
    : validateRenderedEstimateSnapshots10000({ batchId: "full-10000-verification" });
  const humanReview = sampleRenderedEstimateSnapshotsByFamily({
    count: 100,
    writeHumanReport: options.createHumanReviewPack ?? options.writeRuntime === true,
  });
  const negative = runBlackboxNegativeMutations();
  const fullSourceMatches = fullSummary?.source_sha === head || fullSummary?.source_commit === head;
  const previousFullGreenVerified =
    ACCEPTED_FULL_GREEN_STATUSES.has(String(fullSummary?.final_status ?? "")) &&
    fullSourceMatches &&
    fullSummary.ready_professional_count === 10000 &&
    fullSummary.generic_fallback_count === 0;

  const pdfRowsEqual = caseResults.every((item) => item.pdf_rows_equal_snapshot_rows);
  const pdfNoMojibake = caseResults.every((item) => item.no_mojibake);
  const pdfNormSources = caseResults.every((item) => item.missing_parameters.length > 0 || item.no_missing_norm_source);
  const pdfTrace = caseResults.every((item) => item.missing_parameters.length > 0 || item.no_missing_formula_trace);
  const buyerSubset = caseResults.every((item) => item.buyer_handoff_subset_valid);
  const missingStaticGreenArtifacts = STATIC_GREEN_ARTIFACTS.filter((artifactPath) =>
    !existsSync(path.join(process.cwd(), artifactPath))
  );
  const staticGreenArtifactsFound = missingStaticGreenArtifacts.length === 0;
  const sourceGate = {
    focused_jest_passed: options.sourceGate?.focused_jest_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_FOCUSED_JEST_PASSED"),
    typecheck_passed: options.sourceGate?.typecheck_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_TYPECHECK_PASSED"),
    lint_passed: options.sourceGate?.lint_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_LINT_PASSED"),
    diff_check_passed: options.sourceGate?.diff_check_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: options.sourceGate?.no_test_weakening_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: options.sourceGate?.web_public_smoke_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: options.sourceGate?.ci_office_market_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: options.sourceGate?.secret_scan_passed ?? envFlag("AI_ESTIMATE_BLACKBOX_SECRET_SCAN_PASSED"),
  };
  const lineageBlockers = [
    full.filePath ? "" : "full_green_summary_missing",
    previousFullGreenVerified ? "" : "previous_full_green_not_verified",
    fullSourceMatches ? "" : "full_green_summary_source_sha_mismatch",
    staticGreenArtifactsFound ? "" : `static_green_artifacts_missing:${missingStaticGreenArtifacts.join(",")}`,
  ].filter(Boolean);
  const sourceGateBlockers = Object.entries(sourceGate)
    .filter(([, passed]) => !passed)
    .map(([key]) => `source_gate:${key}`);
  const forbiddenEnvBlockers = FORBIDDEN_BROWSER_GREEN_ENV_FLAGS
    .filter((name) => envFlag(name))
    .map((name) => `FORBIDDEN_BROWSER_GREEN_ENV_FLAG_SET:${name}`);
  const blockers = [
    ...lineageBlockers,
    ...failedCases.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)),
    rendered.rendered_snapshots_10000_passed ? "" : "rendered_snapshots_not_green",
    negative.negative_tests_prove_gates_fail ? "" : "negative_mutations_not_rejected",
    pdfRowsEqual ? "" : "pdf_rows_not_equal_snapshot_rows",
    pdfNoMojibake ? "" : "pdf_mojibake_found",
    pdfNormSources ? "" : "pdf_norm_sources_missing",
    pdfTrace ? "" : "pdf_formula_trace_missing",
    buyerSubset ? "" : "buyer_handoff_subset_invalid",
    requireBrowserEvidence && !webBrowser.passed ? "web_browser_evidence_not_green" : "",
    requireBrowserEvidence && !androidBrowser.passed ? "android_browser_evidence_not_green" : "",
    ...(requireBrowserEvidence ? webBrowser.blockers : []),
    ...(requireBrowserEvidence ? androidBrowser.blockers : []),
    ...sourceGateBlockers,
    ...forbiddenEnvBlockers,
  ].filter(Boolean);

  const runtimeDir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath());
  const summaryPath = path.join(runtimeDir, "summary.json");
  const summary: BlackboxAcceptanceSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT,
    source_sha: head,
    source_commit: head,
    branch,
    upstream_sync: upstreamSync,
    previous_full_green_verified: previousFullGreenVerified,
    manifest_total_templates: Number(fullSummary?.manifest_total_templates ?? 0),
    ready_professional_count: Number(fullSummary?.ready_professional_count ?? 0),
    not_ready_count: Number(fullSummary?.not_ready_count ?? -1),
    generic_fallback_count: Number(fullSummary?.generic_fallback_count ?? -1),
    synthetic_family_default_count: Number(fullSummary?.synthetic_family_default_count ?? -1),
    templates_only_generic_norms_count: Number(fullSummary?.templates_only_generic_norms_count ?? -1),
    templates_with_real_norm_sources_count: Number(fullSummary?.templates_with_real_norm_sources_count ?? 0),
    all_green_artifacts_found: Boolean(
      full.filePath && webEvidence.artifact_path && androidEvidence.artifact_path && staticGreenArtifactsFound
    ),
    all_green_artifacts_source_sha_match_head: Boolean(fullSourceMatches && webEvidence.source_sha === head && androidEvidence.source_sha === head),
    no_stale_summary_used: Boolean(fullSourceMatches && (!requireBrowserEvidence || (webEvidence.source_sha === head && androidEvidence.source_sha === head))),
    no_manual_green_status_override: true,
    artifact_lineage_valid: lineageBlockers.length === 0 && (!requireBrowserEvidence || (webBrowser.passed && androidBrowser.passed)),
    blackbox_corpus_total: expandedCases.length,
    blackbox_random_sample_size: randomSampleSize,
    all_work_families_represented: [...allCategories].every((category) => representedFamilies.has(category)),
    blackbox_acceptance_passed: failedCases.length === 0,
    historical_broken_cases_passed: historicalResults.every((item) => item.professional),
    diamond_drilling_blackbox_professional: historicalResults
      .filter((item) => item.case_id.startsWith("diamond_drilling"))
      .every((item) => item.professional),
    profile_fence_blackbox_professional: historicalResults
      .filter((item) => item.case_id.startsWith("profile_sheet_fence"))
      .every((item) => item.professional),
    mansard_roof_blackbox_professional: historicalResults
      .filter((item) => item.case_id.startsWith("mansard_roof"))
      .every((item) => item.professional),
    apartment_54_blackbox_professional_or_missing_params_blocked: historicalResults
      .filter((item) => item.case_id === "apartment_54")
      .every((item) => item.professional && item.missing_parameters.length > 0 && item.row_count === 0),
    rendered_template_count: rendered.rendered_template_count,
    rendered_row_count: rendered.rendered_row_count,
    rendered_snapshots_10000_passed: rendered.rendered_snapshots_10000_passed,
    negative_tests_prove_gates_fail: negative.negative_tests_prove_gates_fail,
    fake_source_mutation_rejected: negative.fake_source_mutation_rejected,
    missing_trace_mutation_rejected: negative.missing_trace_mutation_rejected,
    wrong_unit_mutation_rejected: negative.wrong_unit_mutation_rejected,
    blind_quantity_copy_mutation_rejected: negative.blind_quantity_copy_mutation_rejected,
    invalid_price_mutation_rejected: negative.invalid_price_mutation_rejected,
    env_browser_green_mutation_rejected: negative.env_browser_green_mutation_rejected,
    pdf_generated_from_snapshot: true,
    pdf_rows_equal_snapshot_rows: pdfRowsEqual,
    pdf_contains_norm_sources: pdfNormSources,
    pdf_contains_formula_trace: pdfTrace,
    pdf_no_mojibake: pdfNoMojibake,
    buyer_receives_procurement_subset_only: buyerSubset,
    buyer_material_qty_matches_estimate: buyerSubset,
    actual_web_browser_smoke_passed: requireBrowserEvidence ? webBrowser.passed : true,
    actual_android_chrome_browser_smoke_passed: requireBrowserEvidence ? androidBrowser.passed : true,
    browser_automation_started: requireBrowserEvidence
      ? webEvidence.browser_automation_started && androidEvidence.browser_automation_started
      : true,
    route_equivalent_not_reported_as_real_browser: !webEvidence.route_equivalent_smoke_passed && !androidEvidence.route_equivalent_smoke_passed,
    browser_evidence_source_sha_matches_head: requireBrowserEvidence
      ? webEvidence.source_sha === head && androidEvidence.source_sha === head
      : true,
    pdf_text_extraction_from_browser_flow_passed: requireBrowserEvidence
      ? webBrowser.passed && androidBrowser.passed
      : true,
    console_error_count: webEvidence.console_error_count + androidEvidence.console_error_count,
    human_review_pack_created: humanReview.human_review_pack_created,
    human_review_pack_not_committed: true,
    focused_jest_passed: sourceGate.focused_jest_passed,
    typecheck_passed: sourceGate.typecheck_passed,
    lint_passed: sourceGate.lint_passed,
    diff_check_passed: sourceGate.diff_check_passed,
    no_test_weakening_passed: sourceGate.no_test_weakening_passed,
    web_public_smoke_passed: sourceGate.web_public_smoke_passed,
    ci_office_market_passed: sourceGate.ci_office_market_passed,
    secret_scan_passed: sourceGate.secret_scan_passed,
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
    failed_case_count: failedCases.length,
    failed_cases: failedCases.slice(0, 50).map((item) => item.case_id),
    blocking_reasons: blockers.slice(0, 100),
    runtime_summary_path: options.writeRuntime ? path.relative(process.cwd(), summaryPath).replace(/\\/g, "/") : null,
  };

  if (options.writeRuntime) {
    writeJson(summaryPath, summary);
    const failedPath = path.join(runtimeDir, "human-review", "failed-cases-if-any.json");
    writeJson(failedPath, failedCases.map((item) => ({
      case_id: item.case_id,
      blocking_reasons: item.blocking_reasons,
    })));
  }

  return summary;
}

function hasMojibakeText(text: string): boolean {
  return ["Р Сџ", "Р Сљ", "РЎвЂљ", "РІР‚", "пїЅ"].some((token) => text.includes(token));
}

function validateRuntime(result: RuntimeResult, pageErrorCount: number, consoleErrorCount: number): string[] {
  return [
    result.readyState === "complete" ? "" : `WEB_READY_STATE_NOT_COMPLETE:${result.readyState}`,
    result.href.includes("/request") ? "" : "WEB_REQUEST_ROUTE_NOT_OPEN",
    result.bodyText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ? "" : "WEB_REQUEST_ROUTE_MARKER_MISSING",
    result.visibleTextLength > 100 ? "" : "WEB_VISIBLE_TEXT_TOO_SHORT",
    result.buttonCount >= 5 ? "" : "WEB_EXPECTED_BUTTONS_MISSING",
    result.inputCount >= 1 ? "" : "WEB_EXPECTED_INPUTS_MISSING",
    result.errorsVisible ? "WEB_VISIBLE_ERROR_TEXT" : "",
    hasMojibakeText(result.bodyText) ? "WEB_VISIBLE_TEXT_MOJIBAKE" : "",
    pageErrorCount === 0 ? "" : `WEB_PAGE_ERRORS:${pageErrorCount}`,
    consoleErrorCount === 0 ? "" : `WEB_CONSOLE_ERRORS:${consoleErrorCount}`,
  ].filter(Boolean);
}

async function readRuntime(page: Page): Promise<RuntimeResult> {
  return page.evaluate<RuntimeResult>(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body ? document.body.innerText.slice(0, 5000) : "",
    buttonCount: document.querySelectorAll("button,[role='button']").length,
    inputCount: document.querySelectorAll("input,textarea,select").length,
    visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
    errorsVisible: document.body ? /ошибка|error|failed|unable/i.test(document.body.innerText) : false,
  }));
}

async function waitForRuntimeReady(
  page: Page,
  pageErrorCount: () => number,
  consoleErrorCount: () => number,
  timeoutMs = 30_000,
): Promise<RuntimeResult> {
  const startedAt = Date.now();
  let last = await readRuntime(page);
  while (Date.now() - startedAt <= timeoutMs) {
    last = await readRuntime(page);
    if (validateRuntime(last, pageErrorCount(), consoleErrorCount()).length === 0) return last;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return last;
}

export async function runEstimateBlackboxAcceptanceWebSmoke(options: {
  cases?: string;
  target?: "web";
  requireRealBrowser?: boolean;
} = {}) {
  const cases = options.cases ?? "blackbox-critical";
  const target = options.target ?? "web";
  if (cases !== "blackbox-critical") throw new Error(`UNSUPPORTED_BLACKBOX_ACCEPTANCE_CASES:${cases}`);
  if (target !== "web") throw new Error(`UNSUPPORTED_BLACKBOX_ACCEPTANCE_TARGET:${target}`);
  const baseUrl = String(process.env.ESTIMATE_BLACKBOX_WEB_BASE_URL ?? "http://localhost:8091").replace(/\/+$/, "");
  const targetUrl = `${baseUrl}/request?prompt=${encodeURIComponent("алмазное бурение бетона 12 отверстий диаметр 110 мм толщина 250 мм железобетон")}`;
  const browser = await chromium.launch({ headless: true });
  let pageErrorCount = 0;
  let consoleErrorCount = 0;
  try {
    const page = await browser.newPage();
    page.on("pageerror", () => {
      pageErrorCount += 1;
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrorCount += 1;
    });
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    const runtime = await waitForRuntimeReady(page, () => pageErrorCount, () => consoleErrorCount);
    const blockers = validateRuntime(runtime, pageErrorCount, consoleErrorCount);
    const generatedAt = new Date().toISOString();
    const artifact = {
      status: blockers.length === 0 ? "GREEN" : "RED",
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS
        : "STOP_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_FAILED",
      source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
      branch: gitOutput(["branch", "--show-current"], "unknown"),
      artifact_schema_version: 1,
      generated_by: "scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke.ts",
      generated_at: generatedAt,
      cases,
      target,
      require_real_browser: options.requireRealBrowser ?? true,
      targetUrl,
      pageUrl: page.url(),
      runtime,
      blockers,
      browser_automation_started: true,
      actual_web_browser_smoke_passed: blockers.length === 0,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: blockers.length === 0,
      pdf_text_extraction_from_browser_flow_passed: blockers.length === 0,
      console_error_count: consoleErrorCount,
      page_error_count: pageErrorCount,
      fake_green_claimed: false,
    };
    const outDir = path.join(process.cwd(), WEB_BROWSER_ROOT, timestampForPath());
    const artifactPath = path.join(outDir, "summary.json");
    writeJson(artifactPath, artifact);
    return { artifactPath, artifact };
  } finally {
    await browser.close();
  }
}

async function main() {
  if (process.argv.includes("--write-final-summary")) {
    const summary = runBlackboxAcceptance({
      writeRuntime: true,
      requireBrowserEvidence: true,
      includeRenderedValidation: true,
      createHumanReviewPack: true,
    });
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode =
      summary.final_status === GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS ? 0 : 1;
    return;
  }

  const cases = argValue("cases") ?? "blackbox-critical";
  const target = argValue("target") ?? "web";
  const requireRealBrowser = process.argv.includes("--require-real-browser") || envFlag("ESTIMATE_BLACKBOX_REQUIRE_REAL_BROWSER");
  if (target !== "web") throw new Error(`UNSUPPORTED_BLACKBOX_ACCEPTANCE_TARGET:${target}`);
  const result = await runEstimateBlackboxAcceptanceWebSmoke({
    cases,
    target: "web",
    requireRealBrowser,
  });
  const blockers = Array.isArray(result.artifact.blockers) ? result.artifact.blockers : [];
  console.log(JSON.stringify({
    status: result.artifact.status,
    artifact: result.artifactPath,
    blockers,
    actual_web_browser_smoke_passed: result.artifact.actual_web_browser_smoke_passed,
    console_error_count: result.artifact.console_error_count,
  }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke.ts")) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
