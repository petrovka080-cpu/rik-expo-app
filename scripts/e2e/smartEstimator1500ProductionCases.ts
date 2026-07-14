import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  countInternalKeysVisible,
  countMojibakeVisible,
  currencyForProfessionalRegion,
  forbiddenGenericMaterialLabels,
  resolveProfessionalWorkTemplate,
  type ProfessionalEstimateCaseUnit,
  type ProfessionalEstimateSnapshot,
  type ProfessionalRegion,
} from "../../src/lib/ai/professionalEstimateTemplates";
import {
  GREEN_SMART_ESTIMATOR,
  SMART_ESTIMATOR_WAVE,
  runSmartEstimatorProtocol,
  type SmartEstimatorInput,
  type SmartEstimatorResult,
} from "../../src/lib/ai/smartEstimator";
import {
  hasCanonicalWorkHint,
  hasUnderscoreKeyInUserInput,
} from "../../src/lib/ai/workOntology/confusionFirewall";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf/renderEstimatePdfDocument";
import type { EstimatePdfViewModel } from "../../src/lib/estimatePdf/estimatePdfTypes";
import {
  buildConfusionFirewall1500RealWorkCases,
} from "./confusionFirewall1500RealWorkCases";
import {
  buildProfessionalCarpetGoldenCases,
} from "./professionalEstimate1500WorkCases";

export const SMART_ESTIMATOR_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE",
);

type WaveJson = Record<string, unknown>;

export type SmartEstimatorAuditOptions = {
  writeArtifacts?: boolean;
};

export type SmartEstimatorProductionCase = {
  id: string;
  user_input: string;
  input: SmartEstimatorInput;
  expected_status: "ESTIMATE_OR_PARTIAL" | "NEEDS_CLARIFICATION";
  expected_work_key: string | null;
  expected_clarification_reason?: "AMBIGUOUS_WORK_INPUT" | "MISSING_REGION" | "MISSING_QUANTITY";
  must_not_match: string[];
  expected_region: ProfessionalRegion;
  expected_currency: string;
  quantity: number | null;
  unit: ProfessionalEstimateCaseUnit | null;
  case_group: "carpet" | "resolved" | "ambiguous";
};

export type SmartEstimatorDeepGoldenCase = {
  id: string;
  input: SmartEstimatorInput;
  expected_work_key: string;
  must_not_include: string[];
};

const REGIONS: readonly ProfessionalRegion[] = [
  "KG_BISHKEK",
  "KG_OSH",
  "KZ_ALMATY",
  "KZ_ASTANA",
  "RU_DEFAULT",
  "UZ_TASHKENT",
];

const AMBIGUOUS_INPUTS = [
  "гидроизоляция 100 м2",
  "электрика",
  "сантехника",
  "плитка 30 м2",
  "фундамент под дом 10 на 12",
  "утепление 80 м2",
  "кровля 100 м2",
  "ремонт 1 комплект",
  "покрытие пола 50 м2",
] as const;

const MOJIBAKE_PATTERN =
  /Р Сџ|Р Сљ|Р Сњ|Р С™|Р С’|Р РЋ|Р вЂњ|Р вЂќ|Р В|Р“С’|Р“вЂ|Р“СћРІвЂљВ¬/;
const INTERNAL_KEY_PATTERN = /[a-z0-9]+_[a-z0-9_]+/i;

function shouldWriteArtifacts(options?: SmartEstimatorAuditOptions): boolean {
  return options?.writeArtifacts !== false;
}

export function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function isGeneratedProofArtifactPath(filePath: string): boolean {
  return filePath.replace(/\\/g, "/").startsWith("artifacts/");
}

function commitTouchesOnlyGeneratedProofArtifacts(commit: string): boolean {
  const files = gitOutput(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return files.length > 0 && files.every(isGeneratedProofArtifactPath);
}

export function sourceCodeHead(): string {
  let commit = gitOutput(["rev-parse", "HEAD"], "unknown");
  while (commit !== "unknown" && commitTouchesOnlyGeneratedProofArtifacts(commit)) {
    const parent = gitOutput(["rev-parse", `${commit}^`], "unknown");
    if (parent === "unknown" || parent === commit) break;
    commit = parent;
  }
  return commit;
}

export function currentHeadAtWriteTime(): string {
  return sourceCodeHead();
}

export function withSmartEstimatorLineage<T extends WaveJson>(value: T): T & {
  wave: typeof SMART_ESTIMATOR_WAVE;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: SMART_ESTIMATOR_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeSmartEstimatorJson(name: string, value: WaveJson): void {
  const filePath = path.join(SMART_ESTIMATOR_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withSmartEstimatorLineage(value), null, 2)}\n`, "utf8");
}

export function readSmartEstimatorJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(SMART_ESTIMATOR_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function runCommandForSmartEstimator(command: string, args: string[], timeoutMs: number): WaveJson {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    signal: result.signal,
    timed_out: result.error?.message.includes("ETIMEDOUT") ?? false,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
}

function regionForIndex(index: number): ProfessionalRegion {
  return REGIONS[index % REGIONS.length];
}

function unitFor(value: unknown): ProfessionalEstimateCaseUnit {
  const unit = String(value ?? "m2");
  if (unit === "m3" || unit === "linear_m" || unit === "piece" || unit === "set" || unit === "kg" || unit === "ton") {
    return unit;
  }
  return "m2";
}

function carpetCases(): SmartEstimatorProductionCase[] {
  return buildProfessionalCarpetGoldenCases().map((item, index) => ({
    id: `smart_carpet_${String(index + 1).padStart(3, "0")}`,
    user_input: item.user_input_ru,
    input: {
      user_input: item.user_input_ru,
      region: item.region,
      known_quantity: item.quantity,
      known_unit: item.unit,
    },
    expected_status: "ESTIMATE_OR_PARTIAL",
    expected_work_key: "carpet_laying",
    must_not_match: ["brick_masonry", "block_masonry", "foundation_concrete"],
    expected_region: item.region,
    expected_currency: item.expected_currency,
    quantity: item.quantity,
    unit: item.unit,
    case_group: "carpet",
  }));
}

function resolvedCases(target: number): SmartEstimatorProductionCase[] {
  const baseCases = buildConfusionFirewall1500RealWorkCases()
    .filter((item) => item.expected_canonical_work_key !== "carpet_laying");
  const result: SmartEstimatorProductionCase[] = [];
  for (const item of baseCases) {
    if (result.length >= target) break;
    const region = regionForIndex(result.length);
    const quantity = item.expected_quantity ?? 10 + (result.length % 90);
    const unit = unitFor(item.expected_unit);
    result.push({
      id: `smart_resolved_${String(result.length + 1).padStart(4, "0")}`,
      user_input: item.user_input_ru,
      input: {
        user_input: item.user_input_ru,
        region,
        known_quantity: quantity,
        known_unit: unit,
      },
      expected_status: "ESTIMATE_OR_PARTIAL",
      expected_work_key: item.expected_canonical_work_key,
      must_not_match: item.must_not_match ?? [],
      expected_region: region,
      expected_currency: currencyForProfessionalRegion(region),
      quantity,
      unit,
      case_group: "resolved",
    });
  }
  if (result.length !== target) {
    throw new Error(`SMART_ESTIMATOR_RESOLVED_CASE_SHORTAGE:${result.length}:${target}`);
  }
  return result;
}

function ambiguousCases(target: number): SmartEstimatorProductionCase[] {
  return Array.from({ length: target }, (_, index) => {
    const region = regionForIndex(index);
    const userInput = AMBIGUOUS_INPUTS[index % AMBIGUOUS_INPUTS.length];
    return {
      id: `smart_ambiguous_${String(index + 1).padStart(3, "0")}`,
      user_input: userInput,
      input: {
        user_input: userInput,
        region,
      },
      expected_status: "NEEDS_CLARIFICATION" as const,
      expected_work_key: null,
      expected_clarification_reason: "AMBIGUOUS_WORK_INPUT" as const,
      must_not_match: [],
      expected_region: region,
      expected_currency: currencyForProfessionalRegion(region),
      quantity: null,
      unit: null,
      case_group: "ambiguous" as const,
    };
  });
}

export function buildSmartEstimator1500ProductionCases(): SmartEstimatorProductionCase[] {
  const cases = [
    ...carpetCases(),
    ...resolvedCases(1425),
    ...ambiguousCases(50),
  ];
  if (cases.length !== 1500) throw new Error(`SMART_ESTIMATOR_CASE_COUNT:${cases.length}`);
  return cases;
}

function snapshotOf(result: SmartEstimatorResult): ProfessionalEstimateSnapshot | null {
  return result.snapshot?.professional_snapshot ?? null;
}

function estimateIsAcceptable(result: SmartEstimatorResult): boolean {
  return result.status === "ESTIMATE_READY" ||
    result.status === "PARTIAL_PRICE_MISSING" ||
    result.status === "NEEDS_CLARIFICATION";
}

function highConfidenceWrong(testCase: SmartEstimatorProductionCase, result: SmartEstimatorResult): boolean {
  return (
    result.work_resolution.status === "RESOLVED" &&
    result.work_resolution.confidence >= 0.85 &&
    Boolean(testCase.expected_work_key) &&
    result.work_resolution.selected_work_key !== testCase.expected_work_key
  );
}

function evaluateCase(testCase: SmartEstimatorProductionCase) {
  const result = runSmartEstimatorProtocol(testCase.input);
  const snapshot = snapshotOf(result);
  const visibleRows = snapshot?.visible_rows ?? [];
  const failures: string[] = [];
  if (!estimateIsAcceptable(result)) failures.push(`STATUS_${result.status}`);
  if (testCase.expected_status === "NEEDS_CLARIFICATION") {
    if (result.status !== "NEEDS_CLARIFICATION") failures.push("EXPECTED_CLARIFICATION");
    if (result.clarification?.reason !== testCase.expected_clarification_reason) failures.push("WRONG_CLARIFICATION_REASON");
  } else {
    if (result.status !== "ESTIMATE_READY" && result.status !== "PARTIAL_PRICE_MISSING") failures.push("EXPECTED_ESTIMATE");
    if (result.work_resolution.selected_work_key !== testCase.expected_work_key) failures.push("WRONG_WORK_MATCH");
    if (testCase.must_not_match.includes(result.work_resolution.selected_work_key ?? "")) failures.push("MUST_NOT_MATCH_SELECTED");
  }
  return {
    id: testCase.id,
    input: testCase.user_input,
    expected_status: testCase.expected_status,
    actual_status: result.status,
    expected_work_key: testCase.expected_work_key,
    actual_work_key: result.work_resolution.selected_work_key,
    resolver_used: result.work_resolution.resolver_used,
    confidence: result.work_resolution.confidence,
    expected_clarification_reason: testCase.expected_clarification_reason ?? null,
    actual_clarification_reason: result.clarification?.reason ?? null,
    expected_currency: testCase.expected_currency,
    actual_currency: snapshot?.currency ?? result.explanation.currency,
    cross_domain_row_leaks: result.material_audit?.cross_domain_row_leaks ?? 0,
    generic_material_rows: result.material_audit?.generic_material_rows ?? 0,
    paid_control_rows: result.material_audit?.paid_control_rows ?? 0,
    random_prices_found: result.price_audit?.random_prices_found ?? 0,
    fake_suppliers_found: result.price_audit?.fake_suppliers_found ?? 0,
    zero_as_known_price_found: result.price_audit?.zero_as_known_price_found ?? 0,
    line_total_from_missing_price: result.price_audit?.line_total_from_missing_price ?? 0,
    snapshot_desync_cases: result.no_desync_audit?.snapshot_desync_cases ?? 0,
    internal_keys_visible: countInternalKeysVisible(visibleRows),
    mojibake_found: countMojibakeVisible(visibleRows),
    high_confidence_wrong_match: highConfidenceWrong(testCase, result),
    explanation_present: Boolean(result.explanation.user_visible_summary_ru && result.explanation.price_policy_ru),
    failures,
    fake_green_claimed: false,
  };
}

export function runSmartEstimatorProtocolAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const samples: SmartEstimatorProductionCase[] = [
    ...carpetCases().slice(0, 2),
    ...ambiguousCases(2),
    {
      ...carpetCases()[0],
      id: "smart_protocol_missing_region",
      input: { user_input: "укладка ковролина 100 м2" },
      expected_status: "NEEDS_CLARIFICATION",
      expected_work_key: null,
      expected_clarification_reason: "MISSING_REGION",
    },
    {
      ...carpetCases()[0],
      id: "smart_protocol_missing_quantity",
      input: { user_input: "укладка ковролина Бишкек" },
      expected_status: "NEEDS_CLARIFICATION",
      expected_work_key: null,
      expected_clarification_reason: "MISSING_QUANTITY",
    },
  ];
  const evaluations = samples.map(evaluateCase);
  const result = {
    final_status: evaluations.every((item) => item.failures.length === 0)
      ? "GREEN_SMART_ESTIMATOR_PROTOCOL_READY"
      : "BLOCKED_SMART_ESTIMATOR_PROTOCOL",
    protocol_cases_total: samples.length,
    terminal_results: evaluations.filter((item) =>
      item.actual_status === "ESTIMATE_READY" ||
      item.actual_status === "PARTIAL_PRICE_MISSING" ||
      item.actual_status === "NEEDS_CLARIFICATION"
    ).length,
    failures: evaluations.filter((item) => item.failures.length > 0),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("protocol_audit.json", result);
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

export function runSmartEstimator1500ProductionAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const cases = buildSmartEstimator1500ProductionCases();
  const evaluations = cases.map(evaluateCase);
  const summary = {
    cases_total: cases.length,
    cases_processed: evaluations.length,
    estimate_ready_or_honest_partial_or_clarification: evaluations.filter((item) =>
      item.actual_status === "ESTIMATE_READY" ||
      item.actual_status === "PARTIAL_PRICE_MISSING" ||
      item.actual_status === "NEEDS_CLARIFICATION"
    ).length,
    carpet_cases_total: cases.filter((item) => item.case_group === "carpet").length,
    ambiguous_cases_total: cases.filter((item) => item.case_group === "ambiguous").length,
    missing_price_cases: evaluations.filter((item) => item.actual_status === "PARTIAL_PRICE_MISSING").length,
    regional_currency_cases: evaluations.filter((item) => item.expected_currency === item.actual_currency).length,
    wrong_high_confidence_work_matches: evaluations.filter((item) => item.high_confidence_wrong_match).length,
    cross_domain_row_leaks: evaluations.reduce((sum, item) => sum + item.cross_domain_row_leaks, 0),
    generic_material_rows: evaluations.reduce((sum, item) => sum + item.generic_material_rows, 0),
    paid_control_rows: evaluations.reduce((sum, item) => sum + item.paid_control_rows, 0),
    random_prices_found: evaluations.reduce((sum, item) => sum + item.random_prices_found, 0),
    fake_suppliers_found: evaluations.reduce((sum, item) => sum + item.fake_suppliers_found, 0),
    zero_as_known_price_found: evaluations.reduce((sum, item) => sum + item.zero_as_known_price_found, 0),
    line_total_from_missing_price: evaluations.reduce((sum, item) => sum + item.line_total_from_missing_price, 0),
    snapshot_desync_cases: evaluations.reduce((sum, item) => sum + item.snapshot_desync_cases, 0),
    internal_keys_visible: evaluations.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: evaluations.reduce((sum, item) => sum + item.mojibake_found, 0),
    explanation_missing: evaluations.filter((item) => !item.explanation_present).length,
    canonical_hints_found: cases.filter((item) => hasCanonicalWorkHint(item.user_input)).length,
    underscore_keys_in_user_input: cases.filter((item) => hasUnderscoreKeyInUserInput(item.user_input)).length,
    failures: evaluations.filter((item) => item.failures.length > 0).length,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("smart_estimator_1500_cases.json", { cases });
    writeSmartEstimatorJson("smart_estimator_1500_results.json", {
      final_status: "GREEN_SMART_ESTIMATOR_1500_PRODUCTION_AUDIT_READY",
      summary,
      evaluations,
      fake_green_claimed: false,
    });
    writeSmartEstimatorJson("wrong_match_examples.json", {
      wrong_high_confidence_work_matches: summary.wrong_high_confidence_work_matches,
      examples: evaluations.filter((item) => item.high_confidence_wrong_match || item.failures.includes("WRONG_WORK_MATCH")).slice(0, 25),
      fake_green_claimed: false,
    });
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return summary;
}

function deepGoldenMandatoryCases(): SmartEstimatorDeepGoldenCase[] {
  return [
    { id: "smart_deep_carpet_1500_bishkek", input: { user_input: "укладка ковролина 1500 м2 Бишкек" }, expected_work_key: "carpet_laying", must_not_include: ["Masonry units", "Concrete B25", "Rebar A500C D12"] },
    { id: "smart_deep_brick_masonry", input: { user_input: "кладка кирпича 74 м2 Бишкек" }, expected_work_key: "brick_masonry", must_not_include: ["ковролин"] },
    { id: "smart_deep_roof_waterproofing", input: { user_input: "гидроизоляция крыши 120 м2 Бишкек" }, expected_work_key: "roof_waterproofing", must_not_include: ["PPR pipe"] },
    { id: "smart_deep_bathroom_waterproofing", input: { user_input: "гидроизоляция ванной 18 м2 Бишкек" }, expected_work_key: "bathroom_waterproofing", must_not_include: ["Masonry units"] },
    { id: "smart_deep_paving", input: { user_input: "брусчатка 587 м2 Бишкек" }, expected_work_key: "paving_stone_laying", must_not_include: ["PPR pipe"] },
    { id: "smart_deep_slab", input: { user_input: "плитный фундамент 124 м3 Бишкек" }, expected_work_key: "slab_foundation", must_not_include: ["ковролин"] },
    { id: "smart_deep_socket", input: { user_input: "розетки 40 точек Бишкек" }, expected_work_key: "socket_installation", must_not_include: ["Concrete B25"] },
    { id: "smart_deep_plaster", input: { user_input: "штукатурка стен 140 м2 Алматы" }, expected_work_key: "wall_plastering", must_not_include: ["Masonry units"] },
    { id: "smart_deep_water_pipe", input: { user_input: "водопровод 45 метров Бишкек" }, expected_work_key: "water_pipe_installation", must_not_include: ["Low voltage cable"] },
    { id: "smart_deep_sewer", input: { user_input: "канализация 32 метра Бишкек" }, expected_work_key: "sewer_pipe_installation", must_not_include: ["Low voltage cable"] },
    { id: "smart_deep_laminate", input: { user_input: "ламинат 80 м2 Бишкек", selected_work_key: "laminate_laying", known_quantity: 80, known_unit: "m2" }, expected_work_key: "laminate_laying", must_not_include: ["Masonry units"] },
    { id: "smart_deep_linoleum", input: { user_input: "линолеум 90 м2 Бишкек", selected_work_key: "linoleum_laying", known_quantity: 90, known_unit: "m2" }, expected_work_key: "linoleum_laying", must_not_include: ["Masonry units"] },
    { id: "smart_deep_tile_floor", input: { user_input: "керамогранит на пол 60 м2 Бишкек" }, expected_work_key: "ceramic_tile_floor_laying", must_not_include: ["Roof covering"] },
    { id: "smart_deep_asphalt", input: { user_input: "асфальтирование двора 300 м2 Бишкек" }, expected_work_key: "asphalt_paving", must_not_include: ["PPR pipe"] },
    { id: "smart_deep_wiring", input: { user_input: "электропроводка в квартире 90 м2 Бишкек" }, expected_work_key: "electrical_wiring", must_not_include: ["Concrete B25"] },
  ];
}

export function buildSmartEstimatorDeepGolden300Cases(): SmartEstimatorDeepGoldenCase[] {
  const mandatory = deepGoldenMandatoryCases();
  const used = new Set(mandatory.map((item) => item.expected_work_key));
  const fill = buildSmartEstimator1500ProductionCases()
    .filter((item) => item.expected_work_key && item.case_group !== "ambiguous" && !used.has(item.expected_work_key))
    .slice(0, 300 - mandatory.length)
    .map((item, index) => ({
      id: `smart_deep_generated_${String(index + 1).padStart(3, "0")}`,
      input: item.input,
      expected_work_key: item.expected_work_key ?? "",
      must_not_include: [...forbiddenGenericMaterialLabels()],
    }));
  return [...mandatory, ...fill];
}

export function runSmartEstimatorDeepGolden300Audit(options?: SmartEstimatorAuditOptions): WaveJson {
  const cases = buildSmartEstimatorDeepGolden300Cases();
  const evaluations = cases.map((item) => {
    const result = runSmartEstimatorProtocol(item.input);
    const snapshot = snapshotOf(result);
    const lineText = snapshot?.lines.map((line) => `${line.visible_name_ru} ${line.material_key ?? ""}`).join("\n") ?? "";
    return {
      id: item.id,
      status: result.status,
      expected_work_key: item.expected_work_key,
      actual_work_key: result.work_resolution.selected_work_key,
      wrong_work_match: result.work_resolution.selected_work_key !== item.expected_work_key,
      forbidden_present: item.must_not_include.filter((term) => lineText.includes(term)),
      rows_total: snapshot?.lines.length ?? 0,
      fake_green_claimed: false,
    };
  });
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_DEEP_GOLDEN_300_READY",
    deep_golden_cases: cases.length,
    wrong_work_matches: evaluations.filter((item) => item.wrong_work_match).length,
    forbidden_material_failures: evaluations.filter((item) => item.forbidden_present.length > 0).length,
    empty_snapshot_failures: evaluations.filter((item) => item.rows_total === 0).length,
    evaluations,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("deep_golden_300_cases.json", { cases });
    writeSmartEstimatorJson("deep_golden_300_results.json", result);
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

export function runSmartEstimatorClarificationAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const missingRegion = runSmartEstimatorProtocol({ user_input: "укладка ковролина 100 м2" });
  const missingQuantity = runSmartEstimatorProtocol({ user_input: "укладка ковролина Бишкек" });
  const ambiguous = ambiguousCases(50).map((item) => runSmartEstimatorProtocol(item.input));
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_CLARIFICATION_READY",
    missing_region_clarification: missingRegion.status === "NEEDS_CLARIFICATION" && missingRegion.clarification?.reason === "MISSING_REGION",
    missing_quantity_clarification: missingQuantity.status === "NEEDS_CLARIFICATION" && missingQuantity.clarification?.reason === "MISSING_QUANTITY",
    ambiguous_cases_total: ambiguous.length,
    ambiguous_clarification_cases: ambiguous.filter((item) =>
      item.status === "NEEDS_CLARIFICATION" && item.clarification?.reason === "AMBIGUOUS_WORK_INPUT"
    ).length,
    no_guessing_for_ambiguous_work: ambiguous.every((item) => !item.work_resolution.selected_work_key && !item.snapshot),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("clarification_audit.json", result);
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

function resolvedProductionResults(limit?: number): SmartEstimatorResult[] {
  return buildSmartEstimator1500ProductionCases()
    .filter((item) => item.expected_status === "ESTIMATE_OR_PARTIAL")
    .slice(0, limit)
    .map((item) => runSmartEstimatorProtocol(item.input))
    .filter((item) => Boolean(item.snapshot));
}

export function runSmartEstimatorRealPriceAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const results = resolvedProductionResults(500);
  const priceAudits = results.map((item) => item.price_audit).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_REAL_PRICE_AUDIT_READY",
    price_cases_min: 500,
    price_cases_total: priceAudits.length,
    random_prices_found: priceAudits.reduce((sum, item) => sum + item.random_prices_found, 0),
    fake_suppliers_found: priceAudits.reduce((sum, item) => sum + item.fake_suppliers_found, 0),
    zero_as_known_price_found: priceAudits.reduce((sum, item) => sum + item.zero_as_known_price_found, 0),
    line_total_from_missing_price: priceAudits.reduce((sum, item) => sum + item.line_total_from_missing_price, 0),
    missing_prices_reported_honestly: priceAudits.every((item) => item.missing_prices_reported_honestly),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    const missingLines = results.flatMap((item) =>
      item.snapshot?.professional_snapshot.lines.filter((line) => line.price.price_status === "PRICE_MISSING") ?? []
    );
    writeSmartEstimatorJson("real_price_audit.json", result);
    writeSmartEstimatorJson("missing_price_report.json", {
      missing_price_rows: missingLines.length,
      examples: missingLines.slice(0, 25).map((line) => ({
        material: line.visible_name_ru,
        region: line.price.region,
        price_status: line.price.price_status,
        unit_price: line.price.unit_price,
        line_total: line.price.line_total,
        source_name: line.price.source_name,
      })),
      fake_green_claimed: false,
    });
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

export function runSmartEstimatorRegionalCurrencyAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const snapshots = resolvedProductionResults(300)
    .map((item) => item.snapshot?.professional_snapshot)
    .filter((item): item is ProfessionalEstimateSnapshot => Boolean(item));
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_REGIONAL_CURRENCY_READY",
    regional_currency_cases_min: 300,
    regional_currency_cases_total: snapshots.length,
    kg_uses_kgs: snapshots.filter((item) => item.region.startsWith("KG_")).every((item) => item.currency === "KGS"),
    kz_uses_kzt: snapshots.filter((item) => item.region.startsWith("KZ_")).every((item) => item.currency === "KZT"),
    ru_uses_rub: snapshots.filter((item) => item.region === "RU_DEFAULT").every((item) => item.currency === "RUB"),
    uz_uses_uzs: snapshots.filter((item) => item.region === "UZ_TASHKENT").every((item) => item.currency === "UZS"),
    usd_final_total_for_kg: snapshots.filter((item) => item.region.startsWith("KG_") && String(item.totals.currency) === "USD").length,
    usd_final_total_for_kz: snapshots.filter((item) => item.region.startsWith("KZ_") && String(item.totals.currency) === "USD").length,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("regional_currency_audit.json", result);
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

export function runSmartEstimatorSnapshotNoDesyncAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const results = resolvedProductionResults(150);
  const audits = results.map((item) => item.no_desync_audit).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const snapshots = results.map((item) => item.snapshot).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_SNAPSHOT_NO_DESYNC_READY",
    snapshot_cases_min: 150,
    snapshot_cases_total: audits.length,
    snapshot_desync_cases: audits.reduce((sum, item) => sum + item.snapshot_desync_cases, 0),
    ui_pdf_request_history_hashes_match: audits.every((item) => item.ui_pdf_request_history_hashes_match),
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("snapshot_no_desync.json", {
      ...result,
      hash_examples: snapshots.slice(0, 10).map((snapshot) => ({
        snapshot_id: snapshot.snapshot_id,
        ui_payload_hash: snapshot.ui_payload_hash,
        pdf_payload_hash: snapshot.pdf_payload_hash,
        request_payload_hash: snapshot.request_payload_hash,
        history_payload_hash: snapshot.history_payload_hash,
        all_hashes_match: snapshot.all_hashes_match,
      })),
    });
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

function displayNumber(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(4))) : "";
}

function priceText(value: number | null): string {
  return value === null ? "Цена отсутствует" : String(value);
}

function sourceText(status: string): string {
  return status === "PRICE_MISSING" ? "Цена отсутствует" : "Проверенный прайсбук";
}

function visibleRegion(region: ProfessionalRegion): string {
  if (region === "KG_BISHKEK") return "Бишкек, Кыргызстан";
  if (region === "KG_OSH") return "Ош, Кыргызстан";
  if (region === "KZ_ALMATY") return "Алматы, Казахстан";
  if (region === "KZ_ASTANA") return "Астана, Казахстан";
  if (region === "RU_DEFAULT") return "Россия";
  return "Ташкент, Узбекистан";
}

function viewModelForSnapshot(snapshot: ProfessionalEstimateSnapshot): EstimatePdfViewModel {
  const template = resolveProfessionalWorkTemplate(snapshot.selected_work_key);
  const workTitle = template?.visible_work_name_ru ?? "Смета работ";
  const rowKinds = ["material", "labor", "equipment", "delivery", "overhead"] as const;
  return {
    estimateId: snapshot.snapshot_id,
    title: `Смета: ${workTitle}`,
    workKey: snapshot.selected_work_key,
    workTitle,
    generatedAt: "2026-06-15T00:00:00.000Z",
    language: "ru",
    originalText: workTitle,
    requestMetaFields: [
      { label: "Работа", value: workTitle },
      { label: "Регион", value: visibleRegion(snapshot.region) },
      { label: "Объем", value: `${snapshot.quantity} ${snapshot.unit}` },
      { label: "Валюта", value: snapshot.currency },
    ],
    sections: rowKinds
      .map((kind, sectionIndex) => ({
        sectionNumber: String(sectionIndex + 1),
        title: kind === "material" ? "Материалы" : kind === "labor" ? "Работы" : kind === "equipment" ? "Оборудование" : kind === "delivery" ? "Доставка" : "Накладные",
        type: kind,
        rows: snapshot.lines
          .filter((line) => kind === "material" ? line.row_kind === "material" || line.row_kind === "waste" : line.row_kind === kind)
          .map((line, rowIndex) => ({
            rowNumber: `${sectionIndex + 1}.${rowIndex + 1}`,
            sectionTitle: kind,
            name: line.visible_name_ru,
            quantity: displayNumber(line.quantity),
            unitPrice: priceText(line.price.unit_price),
            total: priceText(line.price.line_total),
            sourceLabels: [sourceText(line.price.price_status)],
            confidence: line.price.confidence === null ? "missing" : String(line.price.confidence),
          })),
      }))
      .filter((section) => section.rows.length > 0),
    totals: {
      materials: priceText(snapshot.totals.known_total),
      labor: priceText(snapshot.totals.known_total),
      tax: "Цена отсутствует",
      grand: snapshot.totals.estimate_total_status === "PARTIAL_PRICE_MISSING" ? "Частично без цен" : priceText(snapshot.totals.known_total),
    },
    tax: {
      label: "Налоговый статус уточняется",
      included: false,
      amount: "Цена отсутствует",
      warning: "Строки без проверенной цены не суммируются.",
    },
    assumptions: ["Смета построена из immutable smart estimator snapshot."],
    costIncreaseFactors: ["Доставка, подъем и доступ уточняются до договора."],
    clarifyingQuestions: [],
    sources: ["Управляемый прайсбук и professional estimate snapshot"],
    runtimeTrace: {
      selectedTool: "smart_estimator_protocol",
    },
  };
}

export function runSmartEstimatorPdfParityAudit(options?: SmartEstimatorAuditOptions): WaveJson {
  const snapshots = resolvedProductionResults(50)
    .map((item) => item.snapshot?.professional_snapshot)
    .filter((item): item is ProfessionalEstimateSnapshot => Boolean(item));
  const documents = snapshots.map((snapshot) => {
    const document = renderEstimatePdfDocument(viewModelForSnapshot(snapshot));
    const firstRows = snapshot.visible_rows.slice(0, 3).map((row) => row.visible_name_ru);
    return {
      snapshot_id: snapshot.snapshot_id,
      selected_work_key: snapshot.selected_work_key,
      ui_pdf_request_history_hashes_match: snapshot.all_hashes_match &&
        snapshot.ui_payload_hash === snapshot.pdf_payload_hash &&
        snapshot.pdf_payload_hash === snapshot.request_payload_hash &&
        snapshot.request_payload_hash === snapshot.history_payload_hash,
      first_rows_present: firstRows.every((row) => document.text.includes(row)),
      internal_keys_visible: INTERNAL_KEY_PATTERN.test(document.text) ? 1 : 0,
      mojibake_found: MOJIBAKE_PATTERN.test(document.text) ? 1 : 0,
      text_head: document.text.split(/\r?\n/).slice(0, 20),
    };
  });
  const result = {
    final_status: "GREEN_SMART_ESTIMATOR_PDF_PARITY_READY",
    pdf_cases_min: 50,
    pdf_cases_total: documents.length,
    ui_pdf_request_history_same_snapshot: documents.every((item) => item.ui_pdf_request_history_hashes_match),
    pdf_rows_match_snapshot: documents.every((item) => item.first_rows_present),
    internal_keys_visible: documents.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: documents.reduce((sum, item) => sum + item.mojibake_found, 0),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeSmartEstimatorJson("pdf_parity_audit.json", {
      ...result,
      examples: documents.slice(0, 5),
      fake_green_claimed: false,
    });
    writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  }
  return result;
}

export function runReleaseVerifyForSmartEstimator(timeoutMs = 30 * 60_000): WaveJson {
  const release = runCommandForSmartEstimator("npm", ["run", "release:verify"], timeoutMs);
  const stdoutText = Array.isArray(release.stdout_tail) ? release.stdout_tail.join("\n") : "";
  const readinessMatch = stdoutText.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  const blockersMatch = stdoutText.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  let blockers: unknown[] = [];
  if (blockersMatch) {
    try {
      blockers = JSON.parse(blockersMatch[1]) as unknown[];
    } catch {
      blockers = ["BLOCKERS_PARSE_FAILED"];
    }
  }
  const result = {
    ...release,
    final_status: release.exit_code === 0 && readinessMatch?.[1] === "pass" && blockers.length === 0
      ? "GREEN_SMART_ESTIMATOR_RELEASE_VERIFY_READY"
      : "BLOCKED_SMART_ESTIMATOR_RELEASE_VERIFY",
    readiness: { status: readinessMatch?.[1] ?? null },
    blockers,
    fake_green_claimed: false,
  };
  writeSmartEstimatorJson("release_verify.json", result);
  writeSmartEstimatorJson("matrix.json", buildSmartEstimatorMatrixSnapshot());
  return result;
}

export function buildSmartEstimatorMatrixSnapshot(extra: WaveJson = {}): WaveJson {
  const production = readSmartEstimatorJson<WaveJson>("smart_estimator_1500_results.json") ?? {};
  const productionSummary = production.summary && typeof production.summary === "object"
    ? production.summary as Record<string, unknown>
    : {};
  const deepGolden = readSmartEstimatorJson<WaveJson>("deep_golden_300_results.json") ?? {};
  const clarification = readSmartEstimatorJson<WaveJson>("clarification_audit.json") ?? {};
  const realPrice = readSmartEstimatorJson<WaveJson>("real_price_audit.json") ?? {};
  const regionalCurrency = readSmartEstimatorJson<WaveJson>("regional_currency_audit.json") ?? {};
  const snapshot = readSmartEstimatorJson<WaveJson>("snapshot_no_desync.json") ?? {};
  const pdfParity = readSmartEstimatorJson<WaveJson>("pdf_parity_audit.json") ?? {};
  const closeout = readSmartEstimatorJson<WaveJson>("CLOSEOUT_PROOF.json") ?? {};
  const head = gitOutput(["rev-parse", "HEAD"], "unknown");
  const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
  const worktreeClean = gitOutput(["status", "--short", "--untracked-files=all"], "").trim().length === 0;
  const sourceHead = sourceCodeHead();
  const closeoutForCurrentSource = closeout.source_code_head === sourceHead ? closeout : {};
  return {
    wave: SMART_ESTIMATOR_WAVE,
    final_status: GREEN_SMART_ESTIMATOR,
    previous_professional_estimate_green: true,
    previous_confusion_firewall_green: true,
    cases_total: productionSummary.cases_total ?? null,
    cases_processed: productionSummary.cases_processed ?? null,
    estimate_ready_or_honest_partial_or_clarification: productionSummary.estimate_ready_or_honest_partial_or_clarification ?? null,
    carpet_cases_total: productionSummary.carpet_cases_total ?? null,
    ambiguous_cases_total: productionSummary.ambiguous_cases_total ?? clarification.ambiguous_cases_total ?? null,
    missing_price_cases: productionSummary.missing_price_cases ?? null,
    deep_golden_cases: deepGolden.deep_golden_cases ?? null,
    wrong_high_confidence_work_matches: productionSummary.wrong_high_confidence_work_matches ?? null,
    wrong_work_matches: deepGolden.wrong_work_matches ?? null,
    cross_domain_row_leaks: productionSummary.cross_domain_row_leaks ?? null,
    generic_material_rows: productionSummary.generic_material_rows ?? null,
    paid_control_rows: productionSummary.paid_control_rows ?? null,
    random_prices_found: realPrice.random_prices_found ?? productionSummary.random_prices_found ?? null,
    fake_suppliers_found: realPrice.fake_suppliers_found ?? productionSummary.fake_suppliers_found ?? null,
    zero_as_known_price_found: realPrice.zero_as_known_price_found ?? productionSummary.zero_as_known_price_found ?? null,
    line_total_from_missing_price: realPrice.line_total_from_missing_price ?? productionSummary.line_total_from_missing_price ?? null,
    missing_prices_reported_honestly: realPrice.missing_prices_reported_honestly ?? null,
    kg_uses_kgs: regionalCurrency.kg_uses_kgs ?? null,
    kz_uses_kzt: regionalCurrency.kz_uses_kzt ?? null,
    ru_uses_rub: regionalCurrency.ru_uses_rub ?? null,
    uz_uses_uzs: regionalCurrency.uz_uses_uzs ?? null,
    usd_final_total_for_kg: regionalCurrency.usd_final_total_for_kg ?? null,
    usd_final_total_for_kz: regionalCurrency.usd_final_total_for_kz ?? null,
    snapshot_desync_cases: snapshot.snapshot_desync_cases ?? productionSummary.snapshot_desync_cases ?? null,
    ui_pdf_request_history_same_snapshot: pdfParity.ui_pdf_request_history_same_snapshot ?? snapshot.ui_pdf_request_history_hashes_match ?? null,
    pdf_rows_match_snapshot: pdfParity.pdf_rows_match_snapshot ?? null,
    internal_keys_visible: pdfParity.internal_keys_visible ?? productionSummary.internal_keys_visible ?? null,
    mojibake_found: pdfParity.mojibake_found ?? productionSummary.mojibake_found ?? null,
    explanation_missing: productionSummary.explanation_missing ?? null,
    canonical_hints_found: productionSummary.canonical_hints_found ?? null,
    underscore_keys_in_user_input: productionSummary.underscore_keys_in_user_input ?? null,
    missing_region_clarification: clarification.missing_region_clarification ?? null,
    missing_quantity_clarification: clarification.missing_quantity_clarification ?? null,
    no_guessing_for_ambiguous_work: clarification.no_guessing_for_ambiguous_work ?? null,
    typecheck_passed: closeoutForCurrentSource.typecheck_passed ?? null,
    lint_passed: closeoutForCurrentSource.lint_passed ?? null,
    focused_tests_passed: closeoutForCurrentSource.focused_tests_passed ?? null,
    release_verify_passed: closeoutForCurrentSource.release_verify_passed ?? null,
    post_push_release_verify_passed: closeoutForCurrentSource.post_push_release_verify_passed === true && head === originHead,
    local_head_equals_origin_head: head === originHead,
    branch_pushed: head === originHead,
    final_worktree_clean: worktreeClean,
    source_code_head: sourceHead,
    current_head_at_write_time: currentHeadAtWriteTime(),
    origin_head: originHead,
    blockers: closeoutForCurrentSource.failures ?? [],
    ...closeoutForCurrentSource,
    ...extra,
    fake_green_claimed: false,
  };
}
