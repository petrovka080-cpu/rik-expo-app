import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateEstimateUnitSemantics,
  type GlobalEstimateInput,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  clearProfessionalWorkPassportRuntimeCaches,
  getProfessionalWorkPassportRuntimeCacheStats,
  PROFESSIONAL_WORK_PASSPORT_TOTAL,
} from "../../src/lib/estimate/professionalWorkPassportRegistry";
import type { ProfessionalWorkPassport, WorkPassportParameter } from "../../src/lib/estimate/workPassportContract";

export const AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA =
  "ai-estimate-11610-deep-boq-runtime-replay-v1" as const;
export const AI_ESTIMATE_11610_CATALOG_EXACT_TEMPLATE_EXECUTION_REPLAY =
  "catalog_exact_template_execution_replay" as const;
export const GREEN_AI_ESTIMATE_11610_DEEP_BOQ_34830_CORE_RUNTIME_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_DEEP_BOQ_34830_CORE_RUNTIME_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_DEEP_BOQ_CORE_RUNTIME_PASSED_WEB_ANDROID_PDF_INCOMPLETE_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_DEEP_BOQ_CORE_RUNTIME_PASSED_WEB_ANDROID_PDF_INCOMPLETE_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-deep-boq-runtime-replay");
const SCENARIOS = ["baseline", "scaled", "incomplete_conflicting"] as const;

type RuntimeReplayScenario = typeof SCENARIOS[number];

type RuntimeReplayCase = {
  case_id: string;
  template_id: string;
  work_key: string;
  family_id: string;
  scenario: RuntimeReplayScenario;
  input: GlobalEstimateInput;
};

type RuntimeReplayLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA;
  case_id: string;
  template_id: string;
  work_key: string;
  family_id: string;
  scenario: RuntimeReplayScenario;
  selected_work_key: string | null;
  selected_category: string | null;
  complexity_level: string | null;
  minimum_rows: number;
  actual_rows: number;
  row_count: number;
  material_rows: number;
  labor_rows: number;
  equipment_rows: number;
  delivery_rows: number;
  payload_hash: string | null;
  heap_used_mb: number;
  duration_ms: number;
  failure_codes: string[];
  passed: boolean;
};

type RuntimeReplayShardTelemetry = {
  shard_number: number;
  template_start_index: number;
  template_end_index: number;
  templates_completed: number;
  cases_completed: number;
  heap_before_mb: number;
  heap_after_mb: number;
  heap_peak_mb: number;
  runtime_cache_size: number;
  runtime_cache_limit: number;
  passports_built: number;
  rows_retained_in_memory: number;
  elapsed_ms: number;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function numericArg(name: string): number | null {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
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

function heapUsedMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeReplayUnit(unit: string | null | undefined, category: string): string {
  const normalized = String(unit ?? "").trim().toLocaleLowerCase("en-US");
  if (["sq_m", "m2", "sqm", "м2", "м²"].includes(normalized)) return "sq_m";
  if (["m3", "м3", "м³", "cubic_m"].includes(normalized)) return "m3";
  if (["linear_m", "lm", "m", "meter", "метр", "пог.м"].includes(normalized)) return "linear_m";
  if (["pcs", "piece", "шт"].includes(normalized)) return "pcs";
  if (["kg", "кг"].includes(normalized)) return "kg";
  if (["ton", "t", "т"].includes(normalized)) return "ton";
  if (["set", "комплект"].includes(normalized)) return "set";
  if (category === "foundation" || category === "concrete") return "m3";
  if (category === "doors_windows") return "pcs";
  if (category === "electrical" || category === "plumbing" || category === "heating_hvac") return "set";
  return "sq_m";
}

function baseQuantityForUnit(unit: string): number {
  if (unit === "set" || unit === "pcs") return 1;
  if (unit === "m3") return 10;
  if (unit === "kg") return 1000;
  if (unit === "ton") return 1;
  if (unit === "linear_m") return 40;
  return 100;
}

function firstParameterUnit(passport: ProfessionalWorkPassport): string | null {
  const parameters: readonly WorkPassportParameter[] = [
    ...passport.parameterSchema.required,
    ...passport.parameterSchema.optional,
  ];
  return parameters.find((parameter) => parameter.unit)?.unit ?? null;
}

function inputForScenario(passport: ProfessionalWorkPassport, scenario: RuntimeReplayScenario): GlobalEstimateInput {
  const unit = normalizeReplayUnit(firstParameterUnit(passport), passport.category);
  const baseQuantity = baseQuantityForUnit(unit);
  const scaledQuantity = unit === "set" || unit === "pcs" ? baseQuantity + 9 : baseQuantity * 10;
  const quantity = scenario === "scaled" ? scaledQuantity : baseQuantity;
  const scenarioText = scenario === "baseline"
    ? `${passport.localizedNameRu} ${quantity} ${unit}`
    : scenario === "scaled"
      ? `${passport.localizedNameRu} увеличенный масштаб ${quantity} ${unit}`
      : `${passport.localizedNameRu}. Объем не уточнен, конфликт исходных данных: 10 м2 и 100 м3. Нужна предварительная смета.`;

  return {
    text: scenarioText,
    explicitTemplateId: passport.templateId,
    explicitWorkKey: passport.workKey,
    volume: quantity,
    unit,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
    estimateDetailLevel: "professional_expanded",
    confidenceOverride: scenario === "incomplete_conflicting" ? "low" : undefined,
  };
}

function casesForPassport(passport: ProfessionalWorkPassport): RuntimeReplayCase[] {
  return SCENARIOS.map((scenario) => ({
    case_id: `${passport.templateId}:${scenario}`,
    template_id: passport.templateId,
    work_key: passport.workKey,
    family_id: passport.familyId,
    scenario,
    input: inputForScenario(passport, scenario),
  }));
}

function rowsByType(result: GlobalEstimateResult, type: string): number {
  return result.sections.find((section) => section.type === type)?.rows.length ?? 0;
}

function payloadHash(result: GlobalEstimateResult): string {
  return hashJson({
    work: result.work,
    input: result.input,
    totals: result.totals,
    rows: result.sections.flatMap((section) =>
      section.rows.map((row) => ({
        section: section.type,
        code: row.code,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        total: row.total,
        sourceId: row.sourceId,
        normSourceId: row.normSourceId ?? null,
      })),
    ),
  });
}

function validateRuntimeEstimate(testCase: RuntimeReplayCase, result: GlobalEstimateResult): string[] {
  const depth = validateEstimateBoqDepth(result);
  const unitSemantics = validateEstimateUnitSemantics(result);
  const rows = result.sections.flatMap((section) => section.rows);
  const failures = [
    result.work.workKey === testCase.work_key ? "" : `work_key_mismatch:${result.work.workKey}:${testCase.work_key}`,
    depth.passed ? "" : `depth_failed:${depth.blockers.join("|")}`,
    unitSemantics.passed ? "" : `unit_semantics_failed:${unitSemantics.blockers.join("|")}`,
    rows.length > 0 ? "" : "rows_empty",
    rows.every((row) => Number.isFinite(row.quantity) && Number.isFinite(row.unitPrice) && Number.isFinite(row.total)) ? "" : "nan_or_infinity_row_value",
    Number.isFinite(result.totals.grandTotal) ? "" : "nan_or_infinity_grand_total",
  ].filter(Boolean);
  return failures;
}

function replayOne(testCase: RuntimeReplayCase): RuntimeReplayLedgerRow {
  const started = performance.now();
  try {
    const result = calculateGlobalConstructionEstimateSync(testCase.input);
    const depth = validateEstimateBoqDepth(result);
    const failureCodes = validateRuntimeEstimate(testCase, result);
    const rows = result.sections.flatMap((section) => section.rows);
    return {
      schema: AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA,
      case_id: testCase.case_id,
      template_id: testCase.template_id,
      work_key: testCase.work_key,
      family_id: testCase.family_id,
      scenario: testCase.scenario,
      selected_work_key: result.work.workKey,
      selected_category: result.work.category,
      complexity_level: depth.complexityProfile.level,
      minimum_rows: depth.minimumRows,
      actual_rows: depth.actualRows,
      row_count: rows.length,
      material_rows: rowsByType(result, "materials"),
      labor_rows: rowsByType(result, "labor"),
      equipment_rows: rowsByType(result, "equipment"),
      delivery_rows: rowsByType(result, "delivery"),
      payload_hash: payloadHash(result),
      heap_used_mb: heapUsedMb(),
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      failure_codes: failureCodes,
      passed: failureCodes.length === 0,
    };
  } catch (error) {
    return {
      schema: AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA,
      case_id: testCase.case_id,
      template_id: testCase.template_id,
      work_key: testCase.work_key,
      family_id: testCase.family_id,
      scenario: testCase.scenario,
      selected_work_key: null,
      selected_category: null,
      complexity_level: null,
      minimum_rows: 0,
      actual_rows: 0,
      row_count: 0,
      material_rows: 0,
      labor_rows: 0,
      equipment_rows: 0,
      delivery_rows: 0,
      payload_hash: null,
      heap_used_mb: heapUsedMb(),
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      failure_codes: [`exception:${error instanceof Error ? error.message : String(error)}`],
      passed: false,
    };
  }
}

export function runAiEstimate11610DeepBoqRuntimeReplay(input: {
  all?: boolean;
  limit?: number;
  shardIndex?: number;
  shardCount?: number;
  telemetryShardSize?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  clearProfessionalWorkPassportRuntimeCaches();
  const allIds = listProfessionalWorkPassportTemplateIds();
  const shardCount = Math.max(1, Math.floor(input.shardCount ?? 1));
  const shardIndex = Math.min(shardCount, Math.max(1, Math.floor(input.shardIndex ?? 1)));
  const telemetryShardSize = Math.max(1, Math.floor(input.telemetryShardSize ?? 500));
  const shardIds = allIds.filter((_, index) => index % shardCount === shardIndex - 1);
  const selectedIds = input.all ? shardIds : shardIds.slice(0, Math.max(0, Math.floor(input.limit ?? 30)));
  const runId = timestampForPath();
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, runId) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const ledgerHasher = crypto.createHash("sha256");
  const corpusHasher = crypto.createHash("sha256");
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: RuntimeReplayLedgerRow[] = [];
  const scenarioCounts = Object.fromEntries(SCENARIOS.map((scenario) => [scenario, 0])) as Record<RuntimeReplayScenario, number>;
  let casesCompleted = 0;
  let casesPassed = 0;
  let maxHeapUsedMb = 0;
  let maxDurationMs = 0;
  const shardTelemetry: RuntimeReplayShardTelemetry[] = [];
  let currentShardStarted = performance.now();
  let currentShardTemplateStart = 0;
  let currentShardCaseStart = 0;
  let currentShardPassportStart = 0;
  let currentShardHeapBefore = heapUsedMb();
  let currentShardHeapPeak = currentShardHeapBefore;
  let passportsBuilt = 0;

  const writeLedgerRow = (row: RuntimeReplayLedgerRow) => {
    const serialized = JSON.stringify(row);
    ledgerHasher.update(`${serialized}\n`);
    ledgerStream?.write(`${serialized}\n`);
  };

  const finishTelemetryShard = (templateEndExclusive: number) => {
    if (templateEndExclusive <= currentShardTemplateStart) return;
    const cacheStats = getProfessionalWorkPassportRuntimeCacheStats();
    const heapAfter = heapUsedMb();
    shardTelemetry.push({
      shard_number: shardTelemetry.length + 1,
      template_start_index: currentShardTemplateStart,
      template_end_index: templateEndExclusive - 1,
      templates_completed: templateEndExclusive - currentShardTemplateStart,
      cases_completed: casesCompleted - currentShardCaseStart,
      heap_before_mb: currentShardHeapBefore,
      heap_after_mb: heapAfter,
      heap_peak_mb: Math.max(currentShardHeapPeak, heapAfter),
      runtime_cache_size: cacheStats.singlePassportCacheSize,
      runtime_cache_limit: cacheStats.singlePassportCacheLimit,
      passports_built: passportsBuilt - currentShardPassportStart,
      rows_retained_in_memory: failureSamples.length,
      elapsed_ms: Math.round((performance.now() - currentShardStarted) * 100) / 100,
    });
    currentShardTemplateStart = templateEndExclusive;
    currentShardCaseStart = casesCompleted;
    currentShardPassportStart = passportsBuilt;
    currentShardStarted = performance.now();
    currentShardHeapBefore = heapUsedMb();
    currentShardHeapPeak = currentShardHeapBefore;
  };

  for (const [index, templateId] of selectedIds.entries()) {
    if (index > 0 && index % telemetryShardSize === 0) finishTelemetryShard(index);
    currentShardHeapPeak = Math.max(currentShardHeapPeak, heapUsedMb());
    const passport = buildProfessionalWorkPassport(templateId);
    passportsBuilt += passport ? 1 : 0;
    if (!passport) {
      const missingRows = SCENARIOS.map((scenario): RuntimeReplayLedgerRow => ({
        schema: AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA,
        case_id: `${templateId}:${scenario}`,
        template_id: templateId,
        work_key: "",
        family_id: "",
        scenario,
        selected_work_key: null,
        selected_category: null,
        complexity_level: null,
        minimum_rows: 0,
        actual_rows: 0,
        row_count: 0,
        material_rows: 0,
        labor_rows: 0,
        equipment_rows: 0,
        delivery_rows: 0,
        payload_hash: null,
        heap_used_mb: heapUsedMb(),
        duration_ms: 0,
        failure_codes: ["passport_missing"],
        passed: false,
      }));
      for (const row of missingRows) {
        casesCompleted += 1;
        scenarioCounts[row.scenario] += 1;
        if (failureSamples.length < 50) failureSamples.push(row);
        writeLedgerRow(row);
      }
      continue;
    }

    for (const testCase of casesForPassport(passport)) {
      corpusHasher.update(`${JSON.stringify({
        case_id: testCase.case_id,
        template_id: testCase.template_id,
        work_key: testCase.work_key,
        family_id: testCase.family_id,
        scenario: testCase.scenario,
        input_hash: hashJson(testCase.input),
      })}\n`);
      const row = replayOne(testCase);
      casesCompleted += 1;
      scenarioCounts[row.scenario] += 1;
      if (row.passed) casesPassed += 1;
      maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
      currentShardHeapPeak = Math.max(currentShardHeapPeak, row.heap_used_mb);
      maxDurationMs = Math.max(maxDurationMs, row.duration_ms);
      if (!row.passed && failureSamples.length < 50) failureSamples.push(row);
      writeLedgerRow(row);
    }

    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  finishTelemetryShard(selectedIds.length);
  clearProfessionalWorkPassportBuildCaches();
  ledgerStream?.end();
  const ledgerSha256 = ledgerHasher.digest("hex");
  const corpusHash = corpusHasher.digest("hex");
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);

  const expectedFullCases = PROFESSIONAL_WORK_PASSPORT_TOTAL * SCENARIOS.length;
  const fullRunRequested = input.all === true && shardCount === 1 && selectedIds.length === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const heapAfterMonotonicGrowthDetected = shardTelemetry.length >= 3 && shardTelemetry
    .slice(1)
    .every((item, index) => item.heap_after_mb > shardTelemetry[index].heap_after_mb + 1);
  const memoryTelemetryPassed = !heapAfterMonotonicGrowthDetected;
  const runtimeCoreCasesPassed = fullRunRequested && casesCompleted === expectedFullCases && casesPassed === expectedFullCases;
  const runtimeCorePassed = runtimeCoreCasesPassed && memoryTelemetryPassed;
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_REPLAY_SCHEMA,
    replay_kind: AI_ESTIMATE_11610_CATALOG_EXACT_TEMPLATE_EXECUTION_REPLAY,
    final_status: runtimeCorePassed
      ? STOP_AI_ESTIMATE_11610_DEEP_BOQ_CORE_RUNTIME_PASSED_WEB_ANDROID_PDF_INCOMPLETE_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE,
    runtime_core_status: runtimeCorePassed
      ? GREEN_AI_ESTIMATE_11610_DEEP_BOQ_34830_CORE_RUNTIME_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    web_android_pdf_proven_in_this_script: false,
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    source_tree_clean: sourceTreeStatus.length === 0,
    source_tree_status: sourceTreeStatus,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    corpus_hash: corpusHash,
    ledger_sha256: ledgerSha256,
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selected_templates: selectedIds.length,
    shard_index: shardIndex,
    shard_count: shardCount,
    telemetry_shard_size: telemetryShardSize,
    scenarios: SCENARIOS,
    scenario_counts: scenarioCounts,
    expected_full_runtime_cases: expectedFullCases,
    cases_completed: casesCompleted,
    cases_passed: casesPassed,
    cases_failed: casesCompleted - casesPassed,
    full_34830_runtime_replay_completed: casesCompleted === expectedFullCases,
    full_34830_runtime_replay_cases_passed: runtimeCoreCasesPassed,
    full_34830_runtime_replay_passed: runtimeCorePassed,
    limited_smoke_only: !fullRunRequested,
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    max_case_duration_ms: Math.round(maxDurationMs * 100) / 100,
    shard_telemetry: shardTelemetry,
    shard_telemetry_count: shardTelemetry.length,
    heap_after_monotonic_growth_detected: heapAfterMonotonicGrowthDetected,
    memory_telemetry_passed: memoryTelemetryPassed,
    runtime_cache_final: getProfessionalWorkPassportRuntimeCacheStats(),
    ledger_streaming_used: Boolean(ledgerStream),
    full_results_retained_in_memory: false,
    retained_failure_samples_count: failureSamples.length,
    failure_samples: failureSamples,
    summary_path: summaryPath,
    ledger_path: ledgerPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  const result = runAiEstimate11610DeepBoqRuntimeReplay({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    shardIndex: numericArg("shard-index") ?? undefined,
    shardCount: numericArg("shard-count") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
    telemetryShardSize: numericArg("telemetry-shard-size") ?? undefined,
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    runtime_core_status: result.summary.runtime_core_status,
    selected_templates: result.summary.selected_templates,
    cases_completed: result.summary.cases_completed,
    cases_passed: result.summary.cases_passed,
    cases_failed: result.summary.cases_failed,
    full_34830_runtime_replay_cases_passed: result.summary.full_34830_runtime_replay_cases_passed,
    full_34830_runtime_replay_passed: result.summary.full_34830_runtime_replay_passed,
    limited_smoke_only: result.summary.limited_smoke_only,
    max_heap_used_mb: result.summary.max_heap_used_mb,
    shard_telemetry_count: result.summary.shard_telemetry_count,
    heap_after_monotonic_growth_detected: result.summary.heap_after_monotonic_growth_detected,
    memory_telemetry_passed: result.summary.memory_telemetry_passed,
    runtime_cache_final: result.summary.runtime_cache_final,
    failure_samples: result.summary.failure_samples.slice(0, 5),
    summary_path: result.summary.summary_path,
    ledger_path: result.summary.ledger_path,
  }, null, 2));
  if (result.summary.cases_failed > 0) process.exitCode = 1;
}
