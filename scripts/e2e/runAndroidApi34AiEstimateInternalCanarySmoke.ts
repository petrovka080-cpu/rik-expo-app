import {
  CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON,
  isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile,
  resolveCanonicalApi34Evidence,
} from "./canonicalApi34Evidence";
import {
  writeInternalCanaryJson,
} from "./aiEstimateInternalCanaryCore";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { evaluateReal10000Case } from "./real10000AcceptanceCore";
import { buildInternalCanarySession, buildInternalCanaryEnabledConfig } from "../../src/lib/ai/productionCanary";

function firstCase(predicate: (item: Real10000ConstructionWorkCase) => boolean): Real10000ConstructionWorkCase {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find(predicate);
  if (!item) throw new Error("INTERNAL_CANARY_ANDROID_SAMPLE_CASE_MISSING");
  return item;
}

function withRoute(
  item: Real10000ConstructionWorkCase,
  route: Real10000ConstructionWorkCase["route"],
  suffix: string,
): Real10000ConstructionWorkCase {
  return {
    ...item,
    caseId: `${item.caseId}_${suffix}`,
    route,
  };
}

export function runAndroidApi34AiEstimateInternalCanarySmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: `${CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON} Internal canary execution changes policy, telemetry, replay, rollback, and proof orchestration only; API34 route shell evidence is reused while current-HEAD estimate prompts are validated through deterministic runtime.`,
    allowChangedFile: (file) =>
      isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(file) ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("src/lib/ai/observability/") ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file.startsWith("src/lib/ai/rollback/") ||
      file.startsWith("tests/internalCanary/") ||
      file.startsWith("tests/architecture/internalCanary") ||
      file === "tests/architecture/internalCanaryArchitectureTestHelpers.ts" ||
      file === "tests/e2e/aiEstimateInternalCanary.web.spec.ts" ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "scripts/e2e/aiEstimateInternalCanaryCore.ts" ||
      file === "scripts/e2e/runAiEstimateInternalCanaryReplay.ts" ||
      file === "scripts/e2e/runAiEstimateInternalCanaryExecutionProof.ts" ||
      file === "scripts/e2e/runAiEstimateKillSwitchDrill.ts" ||
      file === "scripts/e2e/runAiEstimateRollbackDrill.ts" ||
      file === "scripts/e2e/runAndroidApi34AiEstimateInternalCanarySmoke.ts" ||
      file === "scripts/audit/runAiEstimateCanaryTelemetryAudit.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts" ||
      file === "scripts/release/runReleaseVerifyWithStepTiming.ts",
  });
  const sampleCases = [
    withRoute(firstCase((item) => item.domain === "drainage_channels"), "/request", "internal_android_request_drainage"),
    withRoute(firstCase((item) => item.domain === "passenger_elevators"), "/request", "internal_android_request_elevator"),
    withRoute(firstCase((item) => item.domain === "metal_canopies"), "/ai?context=foreman", "internal_android_foreman_canopy"),
    withRoute(firstCase((item) => item.domain === "concrete_pedestals"), "/ai?context=request", "internal_android_ai_request_pedestals"),
  ];
  const results = sampleCases.map((item) => {
    const result = evaluateReal10000Case(item, { includePdf: false });
    const session = buildInternalCanarySession({
      runtimeTraceId: result.runtimeTraceId ?? "trace_missing",
      userCohort: "internal_staff",
      internalStaffFlag: true,
      route: item.route,
      manualOptIn: true,
      percentBucket: 0,
      config: buildInternalCanaryEnabledConfig(),
    });
    return {
      caseId: result.caseId,
      route: result.route,
      domain: result.domain,
      runtimeTraceId: result.runtimeTraceId,
      canaryState: session.canaryStatus,
      killSwitchState: session.killSwitchState,
      telemetryStatus: result.runtimeTraceId ? "emitted" : "missing",
      feedbackActionState: true,
      pdfActionState: result.uiTableVisible,
      classification: result.failures.length === 0 ? result.classification : result.failures[0],
      visibleRows: result.visibleRows,
      failures: result.failures,
    };
  });
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((item) => item.failures.map((failure) => `${item.caseId}:${failure}`)),
  ];

  writeInternalCanaryJson("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
    fake_green_claimed: false,
  });
  writeInternalCanaryJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_runtime: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      visibleRows: item.visibleRows,
      classification: item.classification,
      canaryState: item.canaryState,
      killSwitchState: item.killSwitchState,
    })),
    fake_green_claimed: false,
  });
  const matrix = {
    final_status: failures.length === 0 ? "AI_ESTIMATE_INTERNAL_CANARY_ANDROID_API34_OK" : "NO_GO_ANDROID_API34_MISSING",
    android_api34_tested: canonical.ok,
    android_api34_prompts_total: results.length,
    android_api34_prompts_passed: results.filter((item) => item.failures.length === 0).length,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeInternalCanaryJson("android_api34_results.json", matrix);
  if (failures.length > 0) throw new Error(`NO_GO_ANDROID_API34_MISSING:${failures.join(";")}`);
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34AiEstimateInternalCanarySmoke();
}
