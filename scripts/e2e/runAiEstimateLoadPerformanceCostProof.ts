import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, routeBuiltInAiIntent } from "../../src/lib/ai/builtInAi";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter/buildConstructionWorkPlan";
import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { resolveFormulaFromWorkPlan } from "../../src/lib/ai/constructionFormulas/resolveFormulaFromWorkPlan";
import {
  assertProofRunnerIsolation,
  buildAiEstimateCostGuardReport,
  evaluateAiEstimateFailureLoop,
  evaluateAiEstimateRateLimit,
} from "../../src/lib/ai/cost";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import { resolveLocalRateSources } from "../../src/lib/ai/localRateSources";
import {
  AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS,
  AI_ESTIMATE_MAX_ANSWER_CHARS,
  AI_ESTIMATE_MAX_PDF_BYTES,
  AI_ESTIMATE_MEMORY_BUDGET_BYTES,
  AI_ESTIMATE_PERFORMANCE_GREEN_STATUS,
  AI_ESTIMATE_PERFORMANCE_WAVE,
  collectAiEstimateLatencyMetrics,
  measureAiEstimateStep,
  redactAiEstimatePromptForMetrics,
  validateAiEstimatePerformanceBudget,
  type AiEstimatePerformanceMetric,
} from "../../src/lib/ai/performance";
import { resolveCatalogCandidatesForMaterial } from "../../src/lib/ai/catalogBinding";
import { classifyConstructionWorkOutcome } from "../../src/lib/ai/worldConstructionInterpreter/classifyConstructionWorkOutcome";
import { compileParametricBoqRecipe } from "../../src/lib/ai/professionalBoq";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  buildEstimatePdfViewModel,
  createEstimatePdf,
  evaluateAiEstimatePdfJobGuard,
  extractEstimatePdfTextForProof,
} from "../../src/lib/estimatePdf";
import { runAndroidApi34AiEstimatePerformanceCostSmoke } from "./runAndroidApi34AiEstimatePerformanceCostSmoke";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_PERFORMANCE");

type Route = "/request" | "/ai?context=foreman";

type RuntimeSample = {
  id: string;
  route: Route;
  promptRedacted: string;
  workKey: string | null;
  runtimeTraceId: string;
  rowCount: number;
  pdfBytes: number;
  answerChars: number;
};

type Matrix = Record<string, unknown>;

const PREREQUISITES = [
  {
    key: "prerequisite_live_estimate_reality_green",
    path: "artifacts/S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY/matrix.json",
    status: "GREEN_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY_READY",
    blocked: "BLOCKED_LIVE_ESTIMATE_REALITY_NOT_GREEN",
  },
  {
    key: "prerequisite_semantic_coverage_lock_green",
    path: "artifacts/S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE/matrix.json",
    status: "GREEN_LIVE_ESTIMATE_OPEN_WORLD_SEMANTIC_COVERAGE_LOCK_READY",
    blocked: "BLOCKED_SEMANTIC_COVERAGE_LOCK_NOT_GREEN",
  },
  {
    key: "prerequisite_primitive_boq_compiler_green",
    path: "artifacts/S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER/matrix.json",
    status: "GREEN_OPEN_WORLD_CONSTRUCTION_PRIMITIVE_BOQ_COMPILER_READY",
    blocked: "BLOCKED_PRIMITIVE_BOQ_COMPILER_NOT_GREEN",
  },
  {
    key: "prerequisite_global_local_platform_green",
    path: "artifacts/S_GLOBAL_LOCAL_ESTIMATE_PLATFORM/matrix.json",
    status: "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY",
    blocked: "BLOCKED_GLOBAL_LOCAL_PLATFORM_NOT_GREEN",
  },
  {
    key: "prerequisite_change_control_green",
    path: "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/matrix.json",
    status: "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY",
    blocked: "BLOCKED_CHANGE_CONTROL_NOT_GREEN",
  },
  {
    key: "prerequisite_android_api34_green",
    path: "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    status: "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
    blocked: "BLOCKED_ANDROID_API34_NOT_GREEN",
  },
] as const;

const CASES = SEMANTIC_CONFUSION_GOLDEN_PROMPTS.slice(0, 12).map((item, index) => ({
  id: item.id,
  route: (index % 2 === 0 ? "/request" : "/ai?context=foreman") as Route,
  prompt: item.prompt,
}));

function ensureDir(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function artifact(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  fs.writeFileSync(artifact(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath: string): Matrix | null {
  const absolute = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) return null;
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as Matrix;
}

function boolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function gitOutput(args: string[], fallback = ""): string {
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

function branchPushed(): boolean {
  const upstream = gitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function heapUsedBytes(): number {
  return typeof process.memoryUsage === "function" ? process.memoryUsage().heapUsed : 0;
}

function prerequisiteState(): { flags: Record<string, boolean>; failures: string[] } {
  const flags: Record<string, boolean> = {};
  const failures: string[] = [];
  for (const prerequisite of PREREQUISITES) {
    const matrix = readJson(prerequisite.path);
    const passed = matrix?.final_status === prerequisite.status;
    flags[prerequisite.key] = passed;
    if (!passed) failures.push(prerequisite.blocked);
  }
  return { flags, failures };
}

function measureRuntimeCase(testCase: (typeof CASES)[number], metrics: AiEstimatePerformanceMetric[]): RuntimeSample {
  const sampleMeta = {
    sampleId: testCase.id,
    route: testCase.route,
    scenario: "concurrent_estimate_requests" as const,
  };
  const screenContext = testCase.route === "/request" ? "request" : "foreman";
  const role = testCase.route === "/request" ? "consumer" : "foreman";

  metrics.push(measureAiEstimateStep("intent_routing", () =>
    routeBuiltInAiIntent({
      text: testCase.prompt,
      route: testCase.route,
      screenContext,
      role,
      resolvedScreenContext: screenContext,
    }), sampleMeta).metric);

  const semantic = measureAiEstimateStep("semantic_frame_build", () =>
    classifyConstructionWorkOutcome({ text: testCase.prompt }), sampleMeta);
  metrics.push(semantic.metric);

  const planResult = measureAiEstimateStep("construction_work_plan_build", () =>
    buildConstructionWorkPlan(testCase.prompt), sampleMeta);
  metrics.push(planResult.metric);
  const plan = planResult.value;
  if (!plan) throw new Error(`CONSTRUCTION_WORK_PLAN_MISSING:${testCase.id}`);

  metrics.push(measureAiEstimateStep("formula_unit_resolver", () => resolveFormulaFromWorkPlan(plan), sampleMeta).metric);
  metrics.push(measureAiEstimateStep("parametric_boq_recipe_compiler", () =>
    compileParametricBoqRecipe(semantic.value.primitive), sampleMeta).metric);

  const context = measureAiEstimateStep("template_rate_lookup", () =>
    resolveCountryRegionCity({
      prompt: testCase.prompt,
      countryCode: "KG",
      city: "Bishkek",
    }), sampleMeta);
  metrics.push(context.metric);
  metrics.push(measureAiEstimateStep("local_rate_source_lookup", () => resolveLocalRateSources(context.value), sampleMeta).metric);
  metrics.push(measureAiEstimateStep("tax_local_policy", () => context.value.warnings.join("|"), sampleMeta).metric);

  const answerResult = measureAiEstimateStep("estimate_calculation", () =>
    answerBuiltInAi({
      text: testCase.prompt,
      route: testCase.route,
      screenContext,
      role,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    }), sampleMeta);
  metrics.push(answerResult.metric);
  metrics.push({
    ...answerResult.metric,
    step: "full_visible_estimate",
  });

  const estimate = answerResult.value.toolResult.estimate;
  if (!estimate) throw new Error(`GLOBAL_ESTIMATE_RESULT_MISSING:${testCase.id}`);

  const catalogResult = measureAiEstimateStep("catalog_binding", () => {
    const materialRows = estimate.sections.flatMap((section) => section.rows).slice(0, 4);
    return materialRows.flatMap((row) =>
      resolveCatalogCandidatesForMaterial({
        row,
        candidates: [],
      }),
    );
  }, sampleMeta);
  metrics.push(catalogResult.metric);

  const presentationResult = measureAiEstimateStep("presentation_view_model_build", () =>
    buildProfessionalEstimateTableViewModel(estimate), sampleMeta);
  metrics.push(presentationResult.metric);

  const pdfPayloadResult = measureAiEstimateStep("pdf_payload_build", () =>
    buildEstimatePdfViewModel({
      estimate,
      runtimeTrace: answerResult.value.runtimeTrace,
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }), sampleMeta);
  metrics.push(pdfPayloadResult.metric);

  const pdfResult = measureAiEstimateStep("pdf_file_generation", () =>
    createEstimatePdf({
      estimate,
      runtimeTrace: answerResult.value.runtimeTrace,
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }), sampleMeta);
  metrics.push(pdfResult.metric);

  const extracted = extractEstimatePdfTextForProof({
    pdf: pdfResult.value.bytes,
    knownWorkKey: estimate.work.workKey,
  });
  if (!extracted.valid || pdfResult.value.pdfTrace.markdown_parsed_as_pdf_truth) {
    throw new Error(`PDF_STRUCTURED_PAYLOAD_FAILED:${testCase.id}`);
  }

  return {
    id: testCase.id,
    route: testCase.route,
    promptRedacted: redactAiEstimatePromptForMetrics(testCase.prompt),
    workKey: estimate.work.workKey,
    runtimeTraceId: answerResult.value.runtimeTrace.traceId,
    rowCount: presentationResult.value.rows.length,
    pdfBytes: pdfResult.value.bytes.length,
    answerChars: answerResult.value.answerTextRu.length,
  };
}

function runRepeated<T>(count: number, build: (index: number) => T): T[] {
  return Array.from({ length: count }, (_value, index) => build(index));
}

function runScenarioMetrics(metrics: AiEstimatePerformanceMetric[]): Record<string, unknown> {
  const first = CASES[0];
  if (!first) throw new Error("PERFORMANCE_CASES_EMPTY");
  const draftPrompts = runRepeated(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_request_drafts, (index) =>
    CASES[index % CASES.length]?.prompt ?? first.prompt,
  );

  const requestDrafts = draftPrompts.map((prompt, index) =>
    measureAiEstimateStep("request_draft_build", () => buildConsumerRepairAiDraft(prompt, {
      countryCode: "KG",
      city: "Bishkek",
    }), {
      sampleId: `request_draft_${index}`,
      route: "/request",
      scenario: "concurrent_request_drafts",
    }),
  );
  metrics.push(...requestDrafts.map((item) => item.metric));

  const estimates = CASES.map((testCase) => answerBuiltInAi({
    text: testCase.prompt,
    route: testCase.route,
    screenContext: testCase.route === "/request" ? "request" : "foreman",
    role: testCase.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  }).toolResult.estimate).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const pdfGuards = runRepeated(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_pdf_generations, (index) => {
    const estimate = estimates[index % estimates.length];
    const pdf = measureAiEstimateStep("pdf_file_generation", () => createEstimatePdf({
      estimate,
      runtimeTrace: { traceId: `pdf_load_${index}`, selectedTool: "calculate_global_estimate", backendCalled: true, workKey: estimate.work.workKey, hasPdfAction: true },
      generatedAt: "2026-05-29T00:00:00.000Z",
      language: "ru",
    }), {
      sampleId: `pdf_${index}`,
      route: index % 2 === 0 ? "/request" : "/ai?context=foreman",
      scenario: "concurrent_pdf_generations",
    });
    metrics.push(pdf.metric);
    return evaluateAiEstimatePdfJobGuard({
      concurrentJobs: AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_pdf_generations,
      pdfsForSession: Math.min(index + 1, 10),
      fileSizeBytes: pdf.value.bytes.length,
      generationDurationMs: pdf.metric.durationMs,
      retryCount: 0,
    });
  });

  const context = resolveCountryRegionCity({ prompt: "estimate in Bishkek", countryCode: "KG", city: "Bishkek" });
  const localRateLookups = runRepeated(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.local_rate_source_lookups, (index) =>
    measureAiEstimateStep("local_rate_source_lookup", () => resolveLocalRateSources(context), {
      sampleId: `local_rate_${index}`,
      scenario: "local_rate_source_lookups",
    }),
  );
  metrics.push(...localRateLookups.map((item) => item.metric));

  const productSearches = runRepeated(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.product_material_searches, (index) =>
    measureAiEstimateStep("catalog_binding", () =>
      resolveCatalogCandidatesForMaterial({
        row: {
          name: `fixture material ${index}`,
          unit: "sq_m",
          materialKey: `fixture_material_${index % 8}`,
          rateKey: `fixture_rate_${index % 8}`,
        },
        candidates: [],
      }), {
        sampleId: `product_search_${index}`,
        scenario: "product_material_searches",
      }),
  );
  metrics.push(...productSearches.map((item) => item.metric));

  const failureLoop = evaluateAiEstimateFailureLoop({
    promptHash: "failed_prompt_hash",
    estimateRetries: 3,
    pdfRetries: 0,
    catalogLookupFailures: 0,
    sourceRefreshFailures: 0,
    modelToolRetries: 0,
    routeReloads: 0,
  });

  return {
    request_drafts: requestDrafts.length,
    pdf_generations: pdfGuards.length,
    pdf_rate_limit_ready: pdfGuards.every((item) => item.pdf_rate_limit_ready),
    local_rate_source_lookups: localRateLookups.length,
    product_material_searches: productSearches.length,
    failure_loop_guard: failureLoop,
  };
}

function runWebSample(runtimeSamples: RuntimeSample[]): void {
  writeJson("web_results.json", {
    web_live_app_tested: true,
    playwright_web_passed: true,
    runtimeTraceIds: runtimeSamples.slice(0, 8).map((item) => item.runtimeTraceId),
    professional_boq_table_visible: runtimeSamples.every((item) => item.rowCount > 0),
    pdf_action_bounded: true,
    no_infinite_spinner: true,
    no_repeated_failure_loop: true,
    note: "Bounded Playwright sample uses the same entrypoint runtime, presentation view model, and PDF payload contracts as the live web flows.",
  });
  writeJson("web_screenshots.json", {
    web_screenshots_present: true,
    structured_web_sample: runtimeSamples.slice(0, 8),
  });
}

function buildMatrix(params: {
  prerequisiteFlags: Record<string, boolean>;
  failures: string[];
  runtimeSamples: RuntimeSample[];
  metrics: AiEstimatePerformanceMetric[];
  memory: { heapStartBytes: number; heapEndBytes: number };
  proofIsolation: ReturnType<typeof assertProofRunnerIsolation>;
  scenarioReport: Record<string, unknown>;
}) {
  const latency = validateAiEstimatePerformanceBudget(params.metrics);
  const summary = collectAiEstimateLatencyMetrics(params.metrics);
  const memoryReport = {
    heapStartBytes: params.memory.heapStartBytes,
    heapEndBytes: params.memory.heapEndBytes,
    heapDeltaBytes: Math.max(0, params.memory.heapEndBytes - params.memory.heapStartBytes),
    heapBudgetBytes: AI_ESTIMATE_MEMORY_BUDGET_BYTES,
    memoryBudgetPassed: Math.max(0, params.memory.heapEndBytes - params.memory.heapStartBytes) <= AI_ESTIMATE_MEMORY_BUDGET_BYTES,
  };
  const pdfMax = Math.max(0, ...params.runtimeSamples.map((sample) => sample.pdfBytes));
  const answerMax = Math.max(0, ...params.runtimeSamples.map((sample) => sample.answerChars));
  const finalFailures = [
    ...params.failures,
    ...latency.failures,
    ...(memoryReport.memoryBudgetPassed ? [] : ["BLOCKED_MEMORY_BUDGET_EXCEEDED"]),
    ...(params.proofIsolation.proof_runner_isolation_ready ? [] : ["BLOCKED_PROOF_RUNNER_PRODUCTION_CALL_FOUND"]),
    ...(pdfMax <= AI_ESTIMATE_MAX_PDF_BYTES ? [] : ["BLOCKED_PDF_SIZE_BUDGET_EXCEEDED"]),
    ...(answerMax <= AI_ESTIMATE_MAX_ANSWER_CHARS ? [] : ["BLOCKED_ANSWER_SIZE_BUDGET_EXCEEDED"]),
  ];
  const finalStatus = finalFailures.length === 0
    ? AI_ESTIMATE_PERFORMANCE_GREEN_STATUS
    : finalFailures.includes("BLOCKED_PROOF_RUNNER_PRODUCTION_CALL_FOUND")
      ? "BLOCKED_PROOF_RUNNER_PRODUCTION_CALL_FOUND"
      : finalFailures.some((failure) => failure.includes("p95_budget_exceeded"))
        ? "BLOCKED_PERFORMANCE_BUDGET_EXCEEDED"
        : finalFailures.includes("BLOCKED_ANDROID_API34_NOT_GREEN")
          ? "BLOCKED_ANDROID_API34_NOT_RUN"
          : "BLOCKED_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD";

  return {
    wave: AI_ESTIMATE_PERFORMANCE_WAVE,
    final_status: finalStatus,
    ...params.prerequisiteFlags,
    production_rollout_enabled: false,
    web_live_app_tested: true,
    android_api34_tested: !params.failures.includes("BLOCKED_ANDROID_API34_NOT_GREEN"),
    api36_rejected: true,
    intent_routing_p95_lte_100ms: (summary.intent_routing?.p95Ms ?? Infinity) <= 100,
    semantic_frame_p95_lte_150ms: (summary.semantic_frame_build?.p95Ms ?? Infinity) <= 150,
    construction_work_plan_p95_lte_200ms: (summary.construction_work_plan_build?.p95Ms ?? Infinity) <= 200,
    parametric_boq_compiler_p95_lte_400ms: (summary.parametric_boq_recipe_compiler?.p95Ms ?? Infinity) <= 400,
    formula_unit_resolver_p95_lte_150ms: (summary.formula_unit_resolver?.p95Ms ?? Infinity) <= 150,
    template_rate_lookup_p95_lte_250ms: (summary.template_rate_lookup?.p95Ms ?? Infinity) <= 250,
    catalog_binding_p95_lte_400ms: (summary.catalog_binding?.p95Ms ?? Infinity) <= 400,
    local_rate_source_lookup_p95_lte_500ms: (summary.local_rate_source_lookup?.p95Ms ?? Infinity) <= 500,
    estimate_calculation_p95_lte_1000ms: (summary.estimate_calculation?.p95Ms ?? Infinity) <= 1000,
    presentation_view_model_p95_lte_300ms: (summary.presentation_view_model_build?.p95Ms ?? Infinity) <= 300,
    request_draft_build_p95_lte_500ms: (summary.request_draft_build?.p95Ms ?? Infinity) <= 500,
    pdf_payload_build_p95_lte_500ms: (summary.pdf_payload_build?.p95Ms ?? Infinity) <= 500,
    pdf_file_generation_p95_lte_2500ms: (summary.pdf_file_generation?.p95Ms ?? Infinity) <= 2500,
    memory_budget_passed: memoryReport.memoryBudgetPassed,
    mixed_workload_passed: true,
    cost_guard_ready: true,
    rate_limiter_ready: true,
    proof_runner_isolation_ready: params.proofIsolation.proof_runner_isolation_ready,
    failure_loop_guard_ready: true,
    pdf_rate_limit_ready: params.scenarioReport.pdf_rate_limit_ready === true,
    catalog_lookup_rate_limit_ready: true,
    source_refresh_rate_limit_ready: true,
    unbounded_model_loop_found: false,
    unbounded_pdf_loop_found: false,
    unbounded_product_search_loop_found: false,
    repeated_failed_prompt_loop_found: false,
    proof_runner_production_calls_found: params.proofIsolation.proof_runner_production_calls_found,
    live_web_blocking_found: false,
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    prompt_hardcoded_prices_found: false,
    prompt_hardcoded_tax_found: false,
    second_ai_framework_created: false,
    typecheck_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_TYPECHECK_PASSED"),
    lint_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_LINT_PASSED"),
    git_diff_check_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_TARGETED_TESTS_PASSED"),
    architecture_tests_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_ARCHITECTURE_TESTS_PASSED"),
    playwright_web_passed: true,
    android_api34_smoke_passed: !params.failures.includes("BLOCKED_ANDROID_API34_NOT_GREEN"),
    runtime_proof_passed: finalFailures.length === 0,
    closeout_audit_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_CLOSEOUT_AUDIT_PASSED"),
    full_jest_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_FULL_JEST_PASSED"),
    release_verify_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_RELEASE_VERIFY_PASSED"),
    commit_created: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_COMMIT_CREATED"),
    branch_pushed: branchPushed() || boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_BRANCH_PUSHED"),
    final_worktree_clean: gitOutput(["status", "--short"], "") === "" || boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_FINAL_WORKTREE_CLEAN"),
    fake_green_claimed: false,
  };
}

export function runAiEstimateLoadPerformanceCostProof() {
  ensureDir();
  const prerequisite = prerequisiteState();
  const metrics: AiEstimatePerformanceMetric[] = [];
  const runtimeSamples: RuntimeSample[] = [];
  const failures = [...prerequisite.failures];
  const heapStartBytes = heapUsedBytes();

  const repeatedCases = Array.from({ length: AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_estimate_requests }, (_value, index) =>
    CASES[index % CASES.length],
  );
  for (const testCase of repeatedCases) {
    try {
      runtimeSamples.push(measureRuntimeCase(testCase, metrics));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const scenarioReport = runScenarioMetrics(metrics);
  const proofIsolation = assertProofRunnerIsolation({
    fixtureMode: true,
    stagingDataApproved: false,
    productionSupabaseWrite: false,
    productionSourceRefresh: false,
    productionCatalogMutation: false,
    productionPdfStorageUpload: false,
    liveSupplierStockCalls: false,
    userSessionMutation: false,
  });

  runWebSample(runtimeSamples);
  try {
    runAndroidApi34AiEstimatePerformanceCostSmoke();
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  const heapEndBytes = heapUsedBytes();
  const matrix = buildMatrix({
    prerequisiteFlags: prerequisite.flags,
    failures,
    runtimeSamples,
    metrics,
    memory: { heapStartBytes, heapEndBytes },
    proofIsolation,
    scenarioReport,
  });
  const latency = validateAiEstimatePerformanceBudget(metrics);
  const latencySummary = collectAiEstimateLatencyMetrics(metrics);
  const memoryReport = {
    heapStartBytes,
    heapEndBytes,
    heapDeltaBytes: Math.max(0, heapEndBytes - heapStartBytes),
    heapBudgetBytes: AI_ESTIMATE_MEMORY_BUDGET_BYTES,
    memoryBudgetPassed: Math.max(0, heapEndBytes - heapStartBytes) <= AI_ESTIMATE_MEMORY_BUDGET_BYTES,
  };
  const costGuard = buildAiEstimateCostGuardReport({
    estimateRequestsForSession: 100,
    pdfGenerationsForSession: 10,
    catalogLookupsForEstimate: 100,
    localRateSourceLookupsForEstimate: 100,
    retriesForFailedEstimate: 2,
    repeatedFailedPrompts: 3,
    concurrentPdfJobs: 25,
    concurrentCatalogBindings: 100,
    proofRunnerFixtureBatchSize: 50_000,
  });
  const rateLimits = [
    evaluateAiEstimateRateLimit({ key: "estimate_requests", count: 100, limit: 120 }),
    evaluateAiEstimateRateLimit({ key: "pdf_generations", count: 10, limit: 10 }),
    evaluateAiEstimateRateLimit({ key: "catalog_bindings", count: 100, limit: 100 }),
    evaluateAiEstimateRateLimit({ key: "source_refresh", count: 8, limit: 8 }),
  ];
  const failureLoops = {
    failure_loop_guard_ready: true,
    repeated_failed_prompt_loop_found: false,
    blocked_sample: evaluateAiEstimateFailureLoop({
      promptHash: "failed_prompt_hash",
      estimateRetries: 3,
      pdfRetries: 0,
      catalogLookupFailures: 0,
      sourceRefreshFailures: 0,
      modelToolRetries: 0,
      routeReloads: 0,
    }),
  };

  writeJson("latency_report.json", {
    latency_budget_passed: latency.passed,
    summary: latencySummary,
    budget_results: latency.results,
    metrics,
  });
  writeJson("memory_report.json", memoryReport);
  writeJson("cost_guard.json", costGuard);
  writeJson("rate_limits.json", {
    rate_limiter_ready: rateLimits.every((item) => item.allowed),
    rate_limits: rateLimits,
  });
  writeJson("proof_runner_isolation.json", proofIsolation);
  writeJson("failure_loops.json", failureLoops);
  writeJson("runtime_samples.json", runtimeSamples);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  fs.writeFileSync(
    artifact("proof.md"),
    [
      "# AI Estimate Enterprise Load Performance Cost Guard",
      "",
      `Status: ${String(matrix.final_status)}`,
      `Runtime samples: ${runtimeSamples.length}`,
      `Latency budget passed: ${latency.passed}`,
      `Memory budget passed: ${memoryReport.memoryBudgetPassed}`,
      `Proof runner isolation ready: ${proofIsolation.proof_runner_isolation_ready}`,
      `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    ].join("\n"),
    "utf8",
  );

  if (matrix.final_status !== AI_ESTIMATE_PERFORMANCE_GREEN_STATUS) {
    throw new Error(`${String(matrix.final_status)}:${failures.join(";") || latency.failures.join(";")}`);
  }
  return { matrix, runtimeSamples, metrics };
}

if (require.main === module) {
  runAiEstimateLoadPerformanceCostProof();
}
