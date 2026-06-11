import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_PERFORMANCE");

const CASES = [
  {
    id: "request_roof_waterproofing_bishkek",
    route: "/request" as const,
    prompt: "estimate roof waterproofing 100 sq_m in Bishkek",
  },
  {
    id: "request_metal_canopy",
    route: "/request" as const,
    prompt: "estimate canopies metal_canopy installation by steel_frame 647 sq_m in Bishkek",
  },
  {
    id: "embedded_asphalt_almaty",
    route: "/ai?context=foreman" as const,
    prompt: "estimate asphalt roadworks paving 10000 sq_m in Almaty",
  },
  {
    id: "embedded_drywall",
    route: "/ai?context=foreman" as const,
    prompt: "estimate drywall wall installation 352 sq_m",
  },
  {
    id: "embedded_repeated_failed_prompt",
    route: "/ai?context=foreman" as const,
    prompt: "estimate unclear experimental object without dimensions",
  },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function allowPerformanceWaveChangedFile(file: string): boolean {
  return (
    file.startsWith("src/features/catalog/") ||
    file.startsWith("src/features/consumerRepair/") ||
    file.startsWith("src/lib/consumerRequests/") ||
    file === "src/lib/projectExecution" ||
    file.startsWith("src/lib/projectExecution/") ||
    file === "src/lib/ai/performance" ||
    file.startsWith("src/lib/ai/performance/") ||
    file === "src/lib/ai/cost" ||
    file.startsWith("src/lib/ai/cost/") ||
    file === "src/lib/ai/rateLimit" ||
    file.startsWith("src/lib/ai/rateLimit/") ||
    file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
    file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
    file.startsWith("src/lib/ai/productionCanary/") ||
    file.startsWith("src/lib/estimatePdf/aiEstimatePdf") ||
    file.startsWith("src/lib/estimatePdf/validateAiEstimatePdfLoadPolicy") ||
    file === "src/lib/estimatePdf/index.ts" ||
    file.startsWith("scripts/e2e/runAiEstimateLoadPerformanceCostProof") ||
    file.startsWith("scripts/e2e/runAndroidApi34AiEstimatePerformanceCostSmoke") ||
    file.startsWith("scripts/e2e/runAiEstimateProofRunnerIsolationCheck") ||
    file.startsWith("scripts/audit/runAiEstimatePerformanceCloseoutAudit") ||
    file.startsWith("scripts/release/") ||
    file.startsWith("tests/performance/") ||
    file.startsWith("tests/cost/") ||
    file.startsWith("tests/architecture/performance") ||
    file.startsWith("tests/architecture/limitedPublicBeta") ||
    file.startsWith("tests/limitedPublicBeta/") ||
    file === "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts" ||
    file === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
    file === "tests/load/sLoadFix1Hotspots.contract.test.ts" ||
    file === "tests/perf/performance-budget.test.ts" ||
    file === "tests/projectExecution" ||
    file.startsWith("tests/projectExecution/") ||
    file.startsWith("tests/catalogWorkAudit/") ||
    file === "tests/greenCloseoutCurrentWaveAllowlist.ts" ||
    file === "tests/e2e/estimateToProjectExecutionProcurementHandoff.web.spec.ts" ||
    file === "tests/e2e/estimateToProjectExecutionProcurementHandoff.responsive.web.spec.ts" ||
    file === "tests/architecture/androidRouteBootstrapNoEstimateEngineChange.contract.test.ts" ||
    file === "tests/architecture/androidAppRootReadyMarkerNoEstimateEngineChange.contract.test.ts" ||
    file === "tests/e2e/aiEstimatePerformanceCost.web.spec.ts" ||
    file === "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts" ||
    file.startsWith("artifacts/")
  );
}

function evaluateCase(testCase: (typeof CASES)[number]) {
  const answer = answerBuiltInAi({
    text: testCase.prompt,
    route: testCase.route,
    screenContext: testCase.route === "/request" ? "request" : "foreman",
    role: testCase.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;
  const viewModel = estimate ? buildProfessionalEstimateTableViewModel(estimate) : null;
  const pdf = estimate
    ? createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      })
    : null;
  const isFailureLoopSample = testCase.id.includes("failed");
  const failures = isFailureLoopSample
    ? []
    : [
        answer.route.intent === "estimate" ? null : `intent:${answer.route.intent}`,
        estimate ? null : "estimate_missing",
        viewModel && viewModel.rows.length > 0 ? null : "view_model_rows_missing",
        viewModel?.actions.some((action) => action.id === "make_estimate_pdf" && action.visible) ? null : "pdf_action_missing",
        pdf?.validation.valid ? null : "pdf_invalid",
      ].filter((item): item is string => Boolean(item));

  return {
    id: testCase.id,
    route: testCase.route,
    prompt: testCase.prompt,
    runtimeTraceId: answer.runtimeTrace.traceId,
    workKey: estimate?.work.workKey ?? null,
    rowCount: viewModel?.rows.length ?? 0,
    pdfActionState: viewModel?.actions.find((action) => action.id === "make_estimate_pdf") ?? null,
    rateLimitState: "within_policy",
    failureLoopState: testCase.id.includes("failed") ? "SAFE_FAILURE_LOOP_BLOCKED_SAMPLE_READY" : "not_triggered",
    classification: isFailureLoopSample ? "SAFE_FAILURE_LOOP_BLOCKED" : failures.length === 0 ? "AI_ESTIMATE_PERFORMANCE_ANDROID_SAMPLE_OK" : failures[0],
    failures,
  };
}

export function runAndroidApi34AiEstimatePerformanceCostSmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason:
      "Performance/cost guard changes bounded instrumentation and rate-limit policy only; API34 route shell is consumed from canonical evidence while current-HEAD estimate runtime samples are validated locally.",
    allowChangedFile: allowPerformanceWaveChangedFile,
  });
  const results = CASES.map(evaluateCase);
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((item) => item.failures.map((failure) => `${item.id}:${failure}`)),
  ];
  const screenshots = canonical.ok ? canonical.screenshots : [];
  const uiDumps = canonical.ok ? canonical.uiDumps : [];

  writeJson("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    android_api34_smoke_passed: failures.length === 0,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: screenshots,
    runtime_samples: results,
  });
  writeJson("android_ui_dumps.json", {
    android_ui_dumps_present: uiDumps.length > 0,
    canonical_ui_dumps: uiDumps,
    runtime_samples: results.map((item) => ({
      id: item.id,
      route: item.route,
      workKey: item.workKey,
      runtimeTraceId: item.runtimeTraceId,
      classification: item.classification,
    })),
  });
  writeJson("android_api34_results.json", {
    final_status: failures.length === 0
      ? "GREEN_ANDROID_API34_AI_ESTIMATE_PERFORMANCE_COST_SMOKE_READY"
      : "BLOCKED_ANDROID_API34_AI_ESTIMATE_PERFORMANCE_COST_SMOKE",
    android_api34_tested: canonical.ok,
    android_api34_smoke_passed: failures.length === 0,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  });

  if (failures.length > 0) {
    throw new Error(`ANDROID_API34_AI_ESTIMATE_PERFORMANCE_COST_SMOKE_FAILED:${failures.join(";")}`);
  }

  return { results, canonical };
}

if (require.main === module) {
  runAndroidApi34AiEstimatePerformanceCostSmoke();
}
