import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  clearInlineWorkTemplateMatchRuntimeCaches,
  getInlineWorkTemplateMatchRuntimeCacheStats,
} from "../../src/lib/ai/matchWorkTemplateFromPrompt";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { clearAiEstimateParameterSchemaCache } from "../../src/lib/estimate/aiEstimateParameterSchema";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import type { ProfessionalWorkPassport, WorkEstimateLevel, WorkPassportParameter } from "../../src/lib/estimate/workPassportContract";

export const AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA =
  "ai-estimate-11610-natural-language-user-ingress-replay-v1" as const;
export const AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND =
  "natural_language_user_ingress_replay" as const;
export const GREEN_AI_ESTIMATE_11610_NATURAL_LANGUAGE_34830_INGRESS_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_NATURAL_LANGUAGE_34830_INGRESS_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_CORE_PASSED_WEB_ANDROID_PDF_OPEN_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_CORE_PASSED_WEB_ANDROID_PDF_OPEN_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-natural-language-user-ingress-replay");
export const AI_ESTIMATE_11610_NATURAL_LANGUAGE_SCENARIOS = [
  "professional_full",
  "scaled",
  "incomplete_conflicting",
] as const;
const SCENARIOS = AI_ESTIMATE_11610_NATURAL_LANGUAGE_SCENARIOS;

export type NaturalLanguageScenario = typeof SCENARIOS[number];

type NaturalLanguageReplayCase = {
  case_id: string;
  template_id: string;
  work_key: string;
  family_id: string;
  scenario: NaturalLanguageScenario;
  prompt: string;
};

type NaturalLanguageLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA;
  replay_kind: typeof AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND;
  case_id: string;
  template_id: string;
  work_key: string;
  family_id: string;
  scenario: NaturalLanguageScenario;
  prompt_hash: string;
  explicit_template_id_used: false;
  explicit_work_key_used: false;
  selected_template_id: string | null;
  matched_family: string | null;
  revision_status: string | null;
  estimate_level: string | null;
  passport_row_count: number;
  revision_row_count: number;
  parameter_count: number;
  missing_input_count: number;
  quantity_hash: string | null;
  scale_changed_boq: boolean | null;
  duration_ms: number;
  heap_used_mb: number;
  failure_codes: string[];
  passed: boolean;
};

type NaturalLanguageShardTelemetry = {
  shard_number: number;
  template_start_index: number;
  template_end_index: number;
  templates_completed: number;
  cases_completed: number;
  heap_before_mb: number;
  heap_after_mb: number;
  heap_peak_mb: number;
  matcher_cache_size: number;
  matcher_cache_limit: number;
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

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function heapUsedMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
}

function firstParameterUnit(passport: ProfessionalWorkPassport): string | null {
  const parameters: readonly WorkPassportParameter[] = [
    ...passport.parameterSchema.required,
    ...passport.parameterSchema.optional,
  ];
  return parameters.find((parameter) => parameter.unit)?.unit ?? null;
}

function promptUnit(unit: string | null | undefined, category: string): string {
  const normalized = String(unit ?? "").trim().toLowerCase();
  if (["sq_m", "m2", "м2", "м²"].includes(normalized)) return "м2";
  if (["m3", "м3", "м³"].includes(normalized)) return "м3";
  if (["linear_m", "lm", "m", "meter", "метр"].includes(normalized)) return "м";
  if (["pcs", "piece", "шт"].includes(normalized)) return "шт";
  if (["kg", "кг"].includes(normalized)) return "кг";
  if (["ton", "t", "т"].includes(normalized)) return "т";
  if (category === "foundation" || category === "concrete") return "м3";
  if (category === "doors_windows") return "шт";
  return "м2";
}

function baseQuantityForUnit(unit: string): number {
  if (unit === "шт") return 4;
  if (unit === "м3") return 12;
  if (unit === "кг") return 1000;
  if (unit === "т") return 2;
  if (unit === "м") return 40;
  return 100;
}

function levelPhrase(level: WorkEstimateLevel): string {
  if (level === "ROM_CONCEPT") return "укрупненная концептуальная смета";
  if (level === "DETAILED_BOQ_FROM_DRAWINGS") return "детальная смета по рабочим чертежам";
  if (level === "TENDER_BOQ") return "тендерная ведомость объемов";
  if (level === "AS_BUILT_ESTIMATE") return "исполнительная смета по факту";
  if (level === "PRELIMINARY_BOQ") return "предварительная смета";
  return "профессиональная смета";
}

function promptForScenario(passport: ProfessionalWorkPassport, scenario: NaturalLanguageScenario): string {
  const unit = promptUnit(firstParameterUnit(passport), passport.category);
  const baseQuantity = baseQuantityForUnit(unit);
  const quantity = scenario === "scaled" ? baseQuantity * 10 : baseQuantity;
  const level = passport.templateKind === "expanded_complex_1610" ? `${levelPhrase(passport.estimateLevel)} ` : "";
  if (scenario === "incomplete_conflicting") {
    return `${level}${passport.localizedNameRu}. Объем не уточнен: указано 10 м2 и 100 м3, нужна предварительная смета с вопросами.`;
  }
  if (scenario === "scaled") {
    return `${level}${passport.localizedNameRu}, увеличенный масштаб ${quantity} ${unit}, город Бишкек.`;
  }
  return `${level}${passport.localizedNameRu} ${quantity} ${unit}, город Бишкек.`;
}

export function buildAiEstimate11610NaturalLanguagePromptForPassport(
  passport: ProfessionalWorkPassport,
  scenario: NaturalLanguageScenario = "professional_full",
): string {
  return promptForScenario(passport, scenario);
}

function casesForPassport(passport: ProfessionalWorkPassport): NaturalLanguageReplayCase[] {
  return SCENARIOS.map((scenario) => ({
    case_id: `${passport.templateId}:${scenario}`,
    template_id: passport.templateId,
    work_key: passport.workKey,
    family_id: passport.familyId,
    scenario,
    prompt: promptForScenario(passport, scenario),
  }));
}

function quantityHash(rows: readonly { rowId: string; quantity: number; unit: string }[]): string {
  return hashJson(rows.map((row) => ({
    rowId: row.rowId,
    quantity: row.quantity,
    unit: row.unit,
  })));
}

function runOne(
  testCase: NaturalLanguageReplayCase,
  passport: ProfessionalWorkPassport,
  baselineQuantityHash: string | null,
): NaturalLanguageLedgerRow {
  const started = performance.now();
  try {
    const revision = createEstimateDraftRevision({
      estimateDraftId: `natural-language-${testCase.template_id}-${testCase.scenario}`,
      rawInput: testCase.prompt,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-07-15T00:00:00.000Z",
    });
    const rows = revision.boq.rows;
    const rowQuantityHash = rows.length > 0 ? quantityHash(rows) : null;
    const scaleChangedBoq = testCase.scenario === "scaled" && baselineQuantityHash != null
      ? rowQuantityHash !== baselineQuantityHash
      : null;
    const usesPassportBackedIngress = rows.every((row) =>
      row.sourceParameters?.passportBackedNaturalLanguageIngress === true
    );
    const failureCodes = [
      revision.selectedTemplateId === testCase.template_id ? "" : `template_mismatch:${revision.selectedTemplateId}:${testCase.template_id}`,
      revision.matchedFamily === testCase.family_id ? "" : `family_mismatch:${revision.matchedFamily}:${testCase.family_id}`,
      revision.status !== "failed" ? "" : "revision_failed",
      rows.length === passport.boqRecipe.rowCount ? "" : `row_count_mismatch:${rows.length}:${passport.boqRecipe.rowCount}`,
      rows.length > 0 ? "" : "rows_empty",
      Object.keys(revision.params).length > 0 ? "" : "params_not_extracted",
      usesPassportBackedIngress ? "" : "not_passport_backed_natural_language_ingress",
      /dynamic|fallback|open_world/i.test(revision.selectedTemplateId) ? `generic_fallback:${revision.selectedTemplateId}` : "",
      scaleChangedBoq === false ? "scaled_prompt_did_not_change_boq_quantities" : "",
    ].filter(Boolean);
    return {
      schema: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA,
      replay_kind: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND,
      case_id: testCase.case_id,
      template_id: testCase.template_id,
      work_key: testCase.work_key,
      family_id: testCase.family_id,
      scenario: testCase.scenario,
      prompt_hash: hashJson(testCase.prompt),
      explicit_template_id_used: false,
      explicit_work_key_used: false,
      selected_template_id: revision.selectedTemplateId,
      matched_family: revision.matchedFamily,
      revision_status: revision.status,
      estimate_level: revision.estimateLevel,
      passport_row_count: passport.boqRecipe.rowCount,
      revision_row_count: rows.length,
      parameter_count: Object.keys(revision.params).length,
      missing_input_count: revision.missingInputs.length,
      quantity_hash: rowQuantityHash,
      scale_changed_boq: scaleChangedBoq,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: failureCodes,
      passed: failureCodes.length === 0,
    };
  } catch (error) {
    return {
      schema: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA,
      replay_kind: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND,
      case_id: testCase.case_id,
      template_id: testCase.template_id,
      work_key: testCase.work_key,
      family_id: testCase.family_id,
      scenario: testCase.scenario,
      prompt_hash: hashJson(testCase.prompt),
      explicit_template_id_used: false,
      explicit_work_key_used: false,
      selected_template_id: null,
      matched_family: null,
      revision_status: null,
      estimate_level: null,
      passport_row_count: passport.boqRecipe.rowCount,
      revision_row_count: 0,
      parameter_count: 0,
      missing_input_count: 0,
      quantity_hash: null,
      scale_changed_boq: null,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: [`exception:${error instanceof Error ? error.message : String(error)}`],
      passed: false,
    };
  }
}

export function runAiEstimate11610NaturalLanguageIngressReplay(input: {
  all?: boolean;
  limit?: number;
  startIndex?: number;
  shardIndex?: number;
  shardCount?: number;
  telemetryShardSize?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const allIds = listProfessionalWorkPassportTemplateIds();
  const shardCount = Math.max(1, Math.floor(input.shardCount ?? 1));
  const shardIndex = Math.min(shardCount, Math.max(1, Math.floor(input.shardIndex ?? 1)));
  const telemetryShardSize = Math.max(1, Math.floor(input.telemetryShardSize ?? 500));
  const shardIds = allIds.filter((_, index) => index % shardCount === shardIndex - 1);
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const rangedShardIds = shardIds.slice(startIndex);
  const selectedIds = input.all ? rangedShardIds : rangedShardIds.slice(0, Math.max(0, Math.floor(input.limit ?? 30)));
  const runId = timestampForPath();
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, runId) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  const progressPath = outDir ? path.join(outDir, "progress.json") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const ledgerHasher = crypto.createHash("sha256");
  const corpusHasher = crypto.createHash("sha256");
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: NaturalLanguageLedgerRow[] = [];
  const scenarioCounts = Object.fromEntries(SCENARIOS.map((scenario) => [scenario, 0])) as Record<NaturalLanguageScenario, number>;
  let casesCompleted = 0;
  let casesPassed = 0;
  let maxHeapUsedMb = 0;
  const shardTelemetry: NaturalLanguageShardTelemetry[] = [];
  let currentShardStarted = performance.now();
  let currentShardTemplateStart = 0;
  let currentShardCaseStart = 0;
  let currentShardPassportStart = 0;
  let currentShardHeapBefore = heapUsedMb();
  let currentShardHeapPeak = currentShardHeapBefore;
  let passportsBuilt = 0;

  const writeProgress = (currentTemplateId: string | null, processedTemplates: number) => {
    if (!progressPath) return;
    writeJson(progressPath, {
      schema: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA,
      replay_kind: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
      selected_templates: selectedIds.length,
      start_index: startIndex,
      processed_templates: processedTemplates,
      cases_completed: casesCompleted,
      cases_passed: casesPassed,
      cases_failed: casesCompleted - casesPassed,
      current_template_id: currentTemplateId,
      max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
      failure_samples_count: failureSamples.length,
    });
  };

  const writeLedgerRow = (row: NaturalLanguageLedgerRow) => {
    const serialized = JSON.stringify(row);
    ledgerHasher.update(`${serialized}\n`);
    ledgerStream?.write(`${serialized}\n`);
  };

  writeProgress(null, 0);

  const finishTelemetryShard = (templateEndExclusive: number) => {
    if (templateEndExclusive <= currentShardTemplateStart) return;
    const matcherStats = getInlineWorkTemplateMatchRuntimeCacheStats();
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
      matcher_cache_size: matcherStats.selectedTemplateCacheSize + matcherStats.workKeyToTemplateIdCacheSize,
      matcher_cache_limit: matcherStats.runtimeCacheLimit,
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
    if (!passport) continue;
    let baselineHash: string | null = null;
    for (const testCase of casesForPassport(passport)) {
      corpusHasher.update(`${JSON.stringify({
        case_id: testCase.case_id,
        template_id: testCase.template_id,
        work_key: testCase.work_key,
        family_id: testCase.family_id,
        scenario: testCase.scenario,
        prompt_hash: hashJson(testCase.prompt),
      })}\n`);
      const row = runOne(testCase, passport, baselineHash);
      if (testCase.scenario === "professional_full") baselineHash = row.quantity_hash;
      casesCompleted += 1;
      scenarioCounts[row.scenario] += 1;
      if (row.passed) casesPassed += 1;
      maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
      currentShardHeapPeak = Math.max(currentShardHeapPeak, row.heap_used_mb);
      if (!row.passed && failureSamples.length < 50) failureSamples.push(row);
      writeLedgerRow(row);
    }
    if ((index + 1) % 100 === 0 || index === selectedIds.length - 1) {
      writeProgress(templateId, index + 1);
    }
    if (index > 0 && index % 100 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearInlineWorkTemplateMatchRuntimeCaches();
      clearAiEstimateParameterSchemaCache();
    }
  }
  finishTelemetryShard(selectedIds.length);
  clearProfessionalWorkPassportBuildCaches();
  clearInlineWorkTemplateMatchRuntimeCaches();
  clearAiEstimateParameterSchemaCache();
  ledgerStream?.end();
  const ledgerSha256 = ledgerHasher.digest("hex");
  const corpusHash = corpusHasher.digest("hex");
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);

  const expectedFullCases = PROFESSIONAL_WORK_PASSPORT_TOTAL * SCENARIOS.length;
  const fullRunRequested = input.all === true && startIndex === 0 && shardCount === 1 && selectedIds.length === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const heapAfterMonotonicGrowthDetected = shardTelemetry.length >= 3 && shardTelemetry
    .slice(1)
    .every((item, index) => item.heap_after_mb > shardTelemetry[index].heap_after_mb + 1);
  const memoryTelemetryPassed = !heapAfterMonotonicGrowthDetected;
  const ingressCasesPassed = fullRunRequested && casesCompleted === expectedFullCases && casesPassed === expectedFullCases;
  const ingressPassed = ingressCasesPassed && memoryTelemetryPassed;
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_SCHEMA,
    replay_kind: AI_ESTIMATE_11610_NATURAL_LANGUAGE_USER_INGRESS_REPLAY_KIND,
    final_status: ingressPassed
      ? STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_CORE_PASSED_WEB_ANDROID_PDF_OPEN_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE,
    natural_language_ingress_status: ingressPassed
      ? GREEN_AI_ESTIMATE_11610_NATURAL_LANGUAGE_34830_INGRESS_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_NATURAL_LANGUAGE_INGRESS_BLOCKED_NO_RELEASE,
    release_started: false,
    deploy_started: false,
    eas_started: false,
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
    start_index: startIndex,
    shard_index: shardIndex,
    shard_count: shardCount,
    telemetry_shard_size: telemetryShardSize,
    scenarios: SCENARIOS,
    scenario_counts: scenarioCounts,
    expected_full_runtime_cases: expectedFullCases,
    cases_completed: casesCompleted,
    cases_passed: casesPassed,
    cases_failed: casesCompleted - casesPassed,
    full_34830_natural_language_ingress_completed: casesCompleted === expectedFullCases,
    full_34830_natural_language_ingress_cases_passed: ingressCasesPassed,
    full_34830_natural_language_ingress_passed: ingressPassed,
    limited_smoke_only: !fullRunRequested,
    explicit_template_id_used: false,
    explicit_work_key_used: false,
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    shard_telemetry: shardTelemetry,
    shard_telemetry_count: shardTelemetry.length,
    heap_after_monotonic_growth_detected: heapAfterMonotonicGrowthDetected,
    memory_telemetry_passed: memoryTelemetryPassed,
    matcher_cache_final: getInlineWorkTemplateMatchRuntimeCacheStats(),
    full_results_retained_in_memory: false,
    retained_failure_samples_count: failureSamples.length,
    failure_samples: failureSamples,
    summary_path: summaryPath,
    ledger_path: ledgerPath,
    progress_path: progressPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  const result = runAiEstimate11610NaturalLanguageIngressReplay({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    shardIndex: numericArg("shard-index") ?? undefined,
    shardCount: numericArg("shard-count") ?? undefined,
    telemetryShardSize: numericArg("telemetry-shard-size") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    natural_language_ingress_status: result.summary.natural_language_ingress_status,
    selected_templates: result.summary.selected_templates,
    start_index: result.summary.start_index,
    cases_completed: result.summary.cases_completed,
    cases_passed: result.summary.cases_passed,
    cases_failed: result.summary.cases_failed,
    full_34830_natural_language_ingress_cases_passed: result.summary.full_34830_natural_language_ingress_cases_passed,
    full_34830_natural_language_ingress_passed: result.summary.full_34830_natural_language_ingress_passed,
    limited_smoke_only: result.summary.limited_smoke_only,
    max_heap_used_mb: result.summary.max_heap_used_mb,
    shard_telemetry_count: result.summary.shard_telemetry_count,
    heap_after_monotonic_growth_detected: result.summary.heap_after_monotonic_growth_detected,
    memory_telemetry_passed: result.summary.memory_telemetry_passed,
    failure_samples: result.summary.failure_samples.slice(0, 5),
    summary_path: result.summary.summary_path,
    ledger_path: result.summary.ledger_path,
  }, null, 2));
  if (result.summary.cases_failed > 0) process.exitCode = 1;
}
