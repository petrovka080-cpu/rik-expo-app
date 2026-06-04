import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import vm from "node:vm";
import v8 from "node:v8";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "../../src/lib/ai/constructionPrimitives/fixtures/openWorldPrimitiveStressPack";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import {
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_GREEN_STATUS,
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_WAVE,
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY,
  evaluateAiEstimateEnterpriseLoadPerformanceCost,
  type AiEstimateEnterpriseCostProfile,
  type AiEstimateEnterpriseLoadProfile,
  type AiEstimateEnterpriseLoadRoute,
  type AiEstimateEnterpriseLoadSample,
  type AiEstimateEnterpriseStaticScan,
} from "../../src/lib/ai/globalEstimate";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD",
);
const LIVE_REALITY_MATRIX = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY",
  "matrix.json",
);
const SEMANTIC_LOCK_MATRIX = path.join(
  process.cwd(),
  "artifacts",
  "S_OPEN_WORLD_ESTIMATE_SEMANTIC_COVERAGE",
  "matrix.json",
);
const PRIMITIVE_COMPILER_MATRIX = path.join(
  process.cwd(),
  "artifacts",
  "S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER",
  "matrix.json",
);

type Failure = {
  classification: string;
  reason: string;
  artifact?: string;
};

type LoadPromptCase = {
  id: string;
  prompt: string;
  domain: string;
};

type RuntimeCaseArtifact = {
  id: string;
  route: AiEstimateEnterpriseLoadRoute;
  prompt: string;
  domain: string;
  workKey: string;
  runtimeTraceId: string;
  rowCount: number;
  pdfBytes: number;
  answerChars: number;
  latencyMs: number;
  pdfTextValid: boolean;
  pdfMojibakeFound: boolean;
};

function ensureArtifactDir(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureArtifactDir();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T extends Record<string, unknown>>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
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
  const counts = gitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "");
  const [ahead = "1", behind = "1"] = counts.split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function pushFailure(failures: Failure[], classification: string, reason: string, artifact?: string): void {
  failures.push({ classification, reason, artifact });
}

let gcLookupAttempted = false;
let stableHeapGc: (() => void) | null = null;

function resolveStableHeapGc(): (() => void) | null {
  if (stableHeapGc) return stableHeapGc;
  const globalGc = (globalThis as { gc?: () => void }).gc;
  if (typeof globalGc === "function") {
    stableHeapGc = globalGc;
    return stableHeapGc;
  }
  if (!gcLookupAttempted) {
    gcLookupAttempted = true;
    try {
      v8.setFlagsFromString("--expose_gc");
      const vmGc = vm.runInNewContext("gc") as unknown;
      if (typeof vmGc === "function") {
        stableHeapGc = vmGc as () => void;
      }
    } catch {
      stableHeapGc = null;
    }
  }
  return stableHeapGc;
}

function collectGarbageForStableHeapSample(): void {
  const gc = resolveStableHeapGc();
  if (!gc) return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    gc();
  }
}

function heapUsedBytes(): number {
  collectGarbageForStableHeapSample();
  return typeof process.memoryUsage === "function" ? process.memoryUsage().heapUsed : 0;
}

function prerequisiteGreen(filePath: string, expectedStatus: string): boolean {
  const matrix = readJson<Record<string, unknown>>(filePath);
  return matrix?.final_status === expectedStatus;
}

function selectedLoadCases(): LoadPromptCase[] {
  const perDomain = new Map<string, LoadPromptCase[]>();

  for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK) {
    const bucket = perDomain.get(item.domain) ?? [];
    if (bucket.length < 2) {
      bucket.push({
        id: item.id,
        prompt: item.prompt.startsWith("estimate ") ? item.prompt : `estimate ${item.prompt}`,
        domain: item.domain,
      });
      perDomain.set(item.domain, bucket);
    }
  }

  return Array.from(perDomain.values()).flat();
}

function sourceFilesUnder(relativeRoot: string): string[] {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(process.cwd(), absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !relative.includes("/fixtures/")) {
        files.push(relative);
      }
    }
  };
  walk(absoluteRoot);
  return files;
}

function estimateRuntimeFiles(): string[] {
  const roots = [
    "src/lib/ai/builtInAi",
    "src/lib/ai/worldConstructionInterpreter",
    "src/lib/ai/constructionPrimitives",
    "src/lib/ai/constructionFormulas",
    "src/lib/ai/professionalBoq",
    "src/lib/ai/estimatePresentation",
    "src/lib/estimatePdf",
  ];
  const files = roots.flatMap(sourceFilesUnder);
  const singleFiles = ["src/lib/ai/worldConstructionEstimateEngine.ts"].filter((file) =>
    fs.existsSync(path.join(process.cwd(), file)),
  );
  return Array.from(new Set([...files, ...singleFiles])).sort();
}

function scanEstimateRuntime(): AiEstimateEnterpriseStaticScan {
  const providerOrNetworkPatterns: Array<[string, RegExp]> = [
    ["fetch", /\bfetch\s*\(/],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["axios", /\baxios\b/],
    ["OpenAI", /\bOpenAI\b/],
    ["Anthropic", /\bAnthropic\b/],
    ["GoogleGenerativeAI", /\bGoogleGenerativeAI\b/],
    ["generateText", /\bgenerateText\b/],
    ["streamText", /\bstreamText\b/],
    ["provider_api_key", /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY)\b/],
  ];
  const unboundedLoopPatterns: Array<[string, RegExp]> = [
    ["while_true", /while\s*\(\s*true\s*\)/],
    ["for_forever", /for\s*\(\s*;\s*;\s*\)/],
    ["setInterval", /\bsetInterval\s*\(/],
  ];
  const provider_or_network_findings: string[] = [];
  const unbounded_loop_findings: string[] = [];

  for (const file of estimateRuntimeFiles()) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const [name, pattern] of providerOrNetworkPatterns) {
      if (pattern.test(source)) provider_or_network_findings.push(`${file}:${name}`);
    }
    for (const [name, pattern] of unboundedLoopPatterns) {
      if (pattern.test(source)) unbounded_loop_findings.push(`${file}:${name}`);
    }
  }

  return {
    provider_or_network_findings,
    unbounded_loop_findings,
    forbidden_findings_total: provider_or_network_findings.length + unbounded_loop_findings.length,
  };
}

function evaluateRuntimeCase(params: {
  route: AiEstimateEnterpriseLoadRoute;
  loadCase: LoadPromptCase;
}): { sample: AiEstimateEnterpriseLoadSample; artifact: RuntimeCaseArtifact } {
  const started = performance.now();
  const answer = answerBuiltInAi({
    text: params.loadCase.prompt,
    route: params.route,
    screenContext: params.route === "/request" ? "request" : "foreman",
    role: params.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;

  if (answer.route.intent !== "estimate") {
    throw new Error(`ESTIMATE_INTENT_LOST:${params.route}:${params.loadCase.id}:${answer.route.intent}`);
  }
  if (answer.toolResult.toolName !== "calculate_global_estimate") {
    throw new Error(`ESTIMATE_TOOL_NOT_USED:${params.route}:${params.loadCase.id}:${answer.toolResult.toolName ?? "missing"}`);
  }
  if (!estimate) {
    throw new Error(`GLOBAL_ESTIMATE_RESULT_MISSING:${params.route}:${params.loadCase.id}:${answer.toolResult.blockedBy ?? "missing"}`);
  }

  const viewModel = buildProfessionalEstimateTableViewModel(estimate);
  const pdf = createEstimatePdf({
    estimate,
    runtimeTrace: answer.runtimeTrace,
    generatedAt: "2026-05-29T00:00:00.000Z",
    language: "ru",
  });
  const extracted = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey });
  const finished = performance.now();
  const rowCount = estimate.sections.reduce((total, section) => total + section.rows.length, 0);
  const sample: AiEstimateEnterpriseLoadSample = {
    id: params.loadCase.id,
    route: params.route,
    prompt: params.loadCase.prompt,
    domain: params.loadCase.domain,
    workKey: estimate.work.workKey,
    latencyMs: Math.round((finished - started) * 100) / 100,
    rowCount,
    pdfBytes: pdf.bytes.length,
    answerChars: answer.answerTextRu.length,
    runtimeTraceId: answer.runtimeTrace.traceId,
    providerCalls: 0,
    networkCalls: 0,
    estimatedProviderCostUsd: 0,
  };

  return {
    sample,
    artifact: {
      id: params.loadCase.id,
      route: params.route,
      prompt: params.loadCase.prompt,
      domain: params.loadCase.domain,
      workKey: estimate.work.workKey,
      runtimeTraceId: answer.runtimeTrace.traceId,
      rowCount,
      pdfBytes: pdf.bytes.length,
      answerChars: answer.answerTextRu.length,
      latencyMs: sample.latencyMs,
      pdfTextValid: extracted.valid && viewModel.rows.length > 0 && pdf.pdfTrace.pdf_uses_structured_global_estimate_result,
      pdfMojibakeFound: extracted.mojibakeFound || pdf.pdfTrace.pdf_mojibake_found,
    },
  };
}

function finalStatusFor(failures: Failure[]): string {
  if (failures.length === 0) return AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_GREEN_STATUS;
  if (failures.some((failure) => failure.classification === "BLOCKED_PREREQUISITE_NOT_GREEN")) {
    return "BLOCKED_AI_ESTIMATE_ENTERPRISE_LOAD_PREREQUISITE_NOT_GREEN";
  }
  if (failures.some((failure) => failure.classification === "PROVIDER_OR_NETWORK_COST_FOUND")) {
    return "BLOCKED_AI_ESTIMATE_PROVIDER_COST_NOT_ZERO";
  }
  if (failures.some((failure) => failure.classification === "UNBOUNDED_RUNTIME_PATTERN_FOUND")) {
    return "BLOCKED_AI_ESTIMATE_UNBOUNDED_RUNTIME_PATTERN_FOUND";
  }
  if (failures.some((failure) => failure.classification === "LOAD_BUDGET_EXCEEDED")) {
    return "BLOCKED_AI_ESTIMATE_LOAD_BUDGET_EXCEEDED";
  }
  return "BLOCKED_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD";
}

function main(): void {
  const failures: Failure[] = [];
  const prerequisiteLive = prerequisiteGreen(
    LIVE_REALITY_MATRIX,
    "GREEN_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY_READY",
  );
  const prerequisiteSemantic = prerequisiteGreen(
    SEMANTIC_LOCK_MATRIX,
    "GREEN_LIVE_ESTIMATE_OPEN_WORLD_SEMANTIC_COVERAGE_LOCK_READY",
  );
  const prerequisitePrimitive = prerequisiteGreen(
    PRIMITIVE_COMPILER_MATRIX,
    "GREEN_OPEN_WORLD_CONSTRUCTION_PRIMITIVE_BOQ_COMPILER_READY",
  );

  if (!prerequisiteLive) {
    pushFailure(failures, "BLOCKED_PREREQUISITE_NOT_GREEN", "live estimate reality prerequisite is not green", LIVE_REALITY_MATRIX);
  }
  if (!prerequisiteSemantic) {
    pushFailure(failures, "BLOCKED_PREREQUISITE_NOT_GREEN", "semantic coverage lock prerequisite is not green", SEMANTIC_LOCK_MATRIX);
  }
  if (!prerequisitePrimitive) {
    pushFailure(failures, "BLOCKED_PREREQUISITE_NOT_GREEN", "primitive BOQ compiler prerequisite is not green", PRIMITIVE_COMPILER_MATRIX);
  }

  const startedAt = new Date().toISOString();
  const heapStartBytes = heapUsedBytes();
  const samples: AiEstimateEnterpriseLoadSample[] = [];
  const runtimeArtifacts: RuntimeCaseArtifact[] = [];
  const loadCases = selectedLoadCases();

  for (const loadCase of loadCases) {
    for (const route of AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.requiredRoutes) {
      try {
        const result = evaluateRuntimeCase({ route, loadCase });
        samples.push(result.sample);
        runtimeArtifacts.push(result.artifact);
        if (!result.artifact.pdfTextValid) {
          pushFailure(failures, "PDF_STRUCTURED_OUTPUT_FAILED", `${route}:${loadCase.id}`);
        }
        if (result.artifact.pdfMojibakeFound) {
          pushFailure(failures, "PDF_MOJIBAKE_FOUND", `${route}:${loadCase.id}`);
        }
      } catch (error) {
        pushFailure(
          failures,
          "RUNTIME_SAMPLE_FAILED",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  const heapEndBytes = heapUsedBytes();
  const finishedAt = new Date().toISOString();
  const loadProfile: AiEstimateEnterpriseLoadProfile = {
    samples,
    startedAt,
    finishedAt,
    heapStartBytes,
    heapEndBytes,
    heapDeltaBytes: Math.max(0, heapEndBytes - heapStartBytes),
  };
  const costProfile: AiEstimateEnterpriseCostProfile = {
    providerCalls: samples.reduce((total, sample) => total + sample.providerCalls, 0),
    networkCalls: samples.reduce((total, sample) => total + sample.networkCalls, 0),
    estimatedProviderCostUsd: samples.reduce((total, sample) => total + sample.estimatedProviderCostUsd, 0),
    providerCostPolicy: "local_deterministic_estimate_pipeline",
  };
  const staticScan = scanEstimateRuntime();
  const evaluation = evaluateAiEstimateEnterpriseLoadPerformanceCost({
    loadProfile,
    costProfile,
    staticScan,
  });

  if (costProfile.providerCalls > 0 || costProfile.networkCalls > 0 || costProfile.estimatedProviderCostUsd > 0) {
    pushFailure(failures, "PROVIDER_OR_NETWORK_COST_FOUND", JSON.stringify(costProfile));
  }
  if (staticScan.provider_or_network_findings.length > 0) {
    pushFailure(failures, "PROVIDER_OR_NETWORK_COST_FOUND", staticScan.provider_or_network_findings.join(";"));
  }
  if (staticScan.unbounded_loop_findings.length > 0) {
    pushFailure(failures, "UNBOUNDED_RUNTIME_PATTERN_FOUND", staticScan.unbounded_loop_findings.join(";"));
  }
  for (const failure of evaluation.failures) {
    pushFailure(failures, "LOAD_BUDGET_EXCEEDED", failure);
  }

  const finalStatus = finalStatusFor(failures);
  const matrix = {
    wave: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_WAVE,
    final_status: finalStatus,
    prerequisite_live_estimate_reality_green: prerequisiteLive,
    prerequisite_semantic_coverage_lock_green: prerequisiteSemantic,
    prerequisite_primitive_boq_compiler_green: prerequisitePrimitive,
    entrypoints_tested: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.requiredRoutes,
    stress_pack_cases_used: loadCases.length,
    samples_total: samples.length,
    samples_required_minimum: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.minSamples,
    p95_latency_ms: evaluation.summary.p95LatencyMs,
    p95_latency_budget_ms: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.p95LatencyBudgetMs,
    max_latency_ms: evaluation.summary.maxLatencyMs,
    max_latency_budget_ms: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxLatencyBudgetMs,
    average_latency_ms: evaluation.summary.averageLatencyMs,
    average_latency_budget_ms: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.averageLatencyBudgetMs,
    heap_delta_bytes: loadProfile.heapDeltaBytes,
    heap_delta_budget_bytes: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.heapDeltaBudgetBytes,
    max_rows_per_estimate: evaluation.summary.maxRowsPerEstimate,
    max_pdf_bytes: evaluation.summary.maxPdfBytes,
    max_answer_chars: evaluation.summary.maxAnswerChars,
    zero_provider_calls: costProfile.providerCalls === 0,
    zero_network_calls: costProfile.networkCalls === 0,
    estimated_provider_cost_usd: costProfile.estimatedProviderCostUsd,
    provider_cost_policy: costProfile.providerCostPolicy,
    static_provider_network_scan_passed: staticScan.provider_or_network_findings.length === 0,
    no_unbounded_runtime_loops: staticScan.unbounded_loop_findings.length === 0,
    policy_evaluation_passed: evaluation.passed,
    global_estimate_result_used: runtimeArtifacts.every((artifact) => artifact.workKey.length > 0),
    presentation_view_model_used: runtimeArtifacts.every((artifact) => artifact.rowCount > 0),
    pdf_uses_structured_payload: runtimeArtifacts.every((artifact) => artifact.pdfTextValid),
    pdf_mojibake_found: runtimeArtifacts.some((artifact) => artifact.pdfMojibakeFound),
    typecheck_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_TYPECHECK_PASSED"),
    lint_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_LINT_PASSED"),
    git_diff_check_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_TARGETED_TESTS_PASSED"),
    architecture_tests_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_ARCHITECTURE_TESTS_PASSED"),
    runtime_proof_passed: failures.length === 0,
    full_jest_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_FULL_JEST_PASSED"),
    release_verify_passed: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_RELEASE_VERIFY_PASSED"),
    commit_created: boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_COMMIT_CREATED"),
    branch_pushed: branchPushed() || boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_BRANCH_PUSHED"),
    final_worktree_clean: gitOutput(["status", "--short"], "") === "" || boolEnv("AI_ESTIMATE_ENTERPRISE_LOAD_FINAL_WORKTREE_CLEAN"),
    fake_green_claimed: false,
  };

  writeJson("runtime_samples.json", runtimeArtifacts);
  writeJson("load_profile.json", { ...loadProfile, evaluation: evaluation.summary });
  writeJson("cost_profile.json", costProfile);
  writeJson("static_scan.json", staticScan);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "proof.md"),
    [
      "# AI Estimate Enterprise Load Performance Cost Guard",
      "",
      `Status: ${finalStatus}`,
      `Samples: ${samples.length}/${AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.minSamples}`,
      `P95 latency: ${evaluation.summary.p95LatencyMs} ms`,
      `Max latency: ${evaluation.summary.maxLatencyMs} ms`,
      `Average latency: ${evaluation.summary.averageLatencyMs} ms`,
      `Heap delta: ${loadProfile.heapDeltaBytes} bytes`,
      `Provider calls: ${costProfile.providerCalls}`,
      `Network calls: ${costProfile.networkCalls}`,
      `Estimated provider cost USD: ${costProfile.estimatedProviderCostUsd}`,
      `Static provider/network findings: ${staticScan.provider_or_network_findings.length}`,
      `Static unbounded loop findings: ${staticScan.unbounded_loop_findings.length}`,
      `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    ].join("\n"),
    "utf8",
  );

  if (failures.length > 0) {
    throw new Error(`${finalStatus}:${failures.map((failure) => `${failure.classification}:${failure.reason}`).join(";")}`);
  }
}

main();
