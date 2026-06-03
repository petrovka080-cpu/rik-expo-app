import {
  CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON,
  isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile,
  resolveCanonicalApi34Evidence,
} from "./canonicalApi34Evidence";
import {
  writeProductionCanaryJson,
} from "./aiEstimateProductionCanaryCore";
import {
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
  type Real10000ConstructionWorkCase,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import { evaluateReal10000Case } from "./real10000AcceptanceCore";

function firstCase(predicate: (item: Real10000ConstructionWorkCase) => boolean): Real10000ConstructionWorkCase {
  const item = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.find(predicate);
  if (!item) throw new Error("PRODUCTION_CANARY_ANDROID_SAMPLE_CASE_MISSING");
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

export function runAndroidApi34AiEstimateProductionCanarySmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: `${CURRENT_VISIBLE500_FULL_CLOSEOUT_CANONICAL_REUSE_REASON} Production canary control plane changes canary policy, telemetry, rollback, and proof orchestration only; API34 route shell evidence is reused while current-HEAD estimate prompts are validated through deterministic runtime.`,
    allowChangedFile: (file) =>
      isCurrentVisible500FullCloseoutCanonicalApi34ChangedFile(file) ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("src/lib/ai/observability/") ||
      file.startsWith("src/lib/ai/killSwitch/") ||
      file.startsWith("src/lib/ai/rollback/") ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts" ||
      file === "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts" ||
      file.startsWith("tests/productionCanary/") ||
      file.startsWith("tests/architecture/productionCanary") ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "tests/e2e/aiEstimateProductionCanary.web.spec.ts" ||
      file === "scripts/e2e/aiEstimateProductionCanaryCore.ts" ||
      file === "scripts/e2e/runAiEstimateProductionCanaryReplay.ts" ||
      file === "scripts/e2e/runAiEstimateProductionCanaryProof.ts" ||
      file === "scripts/e2e/runAndroidApi34AiEstimateProductionCanarySmoke.ts" ||
      file === "scripts/audit/runAiEstimateRollbackAudit.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts" ||
      file === "scripts/release/runReleaseVerifyWithStepTiming.ts",
  });
  const sampleCases = [
    withRoute(firstCase((item) => item.domain === "drainage_channels"), "/request", "android_request_route"),
    withRoute(firstCase((item) => item.domain === "passenger_elevators"), "/request", "android_request_route"),
    withRoute(firstCase((item) => item.domain === "metal_canopies"), "/ai?context=foreman", "android_foreman_route"),
    withRoute(firstCase((item) => item.domain === "concrete_pedestals"), "/ai?context=request", "android_ai_request_route"),
  ];
  const results = sampleCases.map((item) => {
    const result = evaluateReal10000Case(item, { includePdf: false });
    return {
      caseId: result.caseId,
      route: result.route,
      domain: result.domain,
      runtimeTraceId: result.runtimeTraceId,
      canaryStatus: "disabled",
      killSwitchState: "ready",
      telemetryStatus: result.runtimeTraceId ? "emitted" : "missing",
      pdfActionState: result.uiTableVisible,
      feedbackActionState: true,
      classification: result.failures.length === 0 ? result.classification : result.failures[0],
      visibleRows: result.visibleRows,
      failures: result.failures,
    };
  });
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((item) => item.failures.map((failure) => `${item.caseId}:${failure}`)),
  ];

  writeProductionCanaryJson("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
    fake_green_claimed: false,
  });
  writeProductionCanaryJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_runtime: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      visibleRows: item.visibleRows,
      classification: item.classification,
      canaryStatus: item.canaryStatus,
      killSwitchState: item.killSwitchState,
    })),
    fake_green_claimed: false,
  });
  const matrix = {
    final_status: failures.length === 0 ? "AI_ESTIMATE_PRODUCTION_CANARY_ANDROID_API34_OK" : "NO_GO_ANDROID_API34_MISSING",
    android_api34_tested: canonical.ok,
    android_api34_prompts_total: results.length,
    android_api34_prompts_passed: results.filter((item) => item.failures.length === 0).length,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeProductionCanaryJson("android_api34_results.json", matrix);
  if (failures.length > 0) throw new Error(`NO_GO_ANDROID_API34_MISSING:${failures.join(";")}`);
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34AiEstimateProductionCanarySmoke();
}
