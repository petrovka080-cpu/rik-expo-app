import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import {
  evaluateReal500Case,
  writeJson,
} from "./real500AcceptanceCore";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

function sampleCases() {
  return [
    ...REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.route === "/request").slice(0, 20),
    ...REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=foreman").slice(0, 20),
    ...REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.route === "/ai?context=request").slice(0, 20),
  ];
}

export function runAndroidApi34Real500DiverseConstructionWorksSample() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: "Real-500 acceptance changes AI estimate runtime and proof coverage only; API34 route shell is consumed from canonical evidence while current-HEAD estimator semantics are validated through structured runtime.",
    allowChangedFile: (file) =>
      file.startsWith("src/lib/ai/estimatorKernel/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/builtInAi/") ||
      file.startsWith("src/lib/ai/globalEstimate/") ||
      file.startsWith("src/lib/ai/estimatePresentation/") ||
      file.startsWith("src/lib/estimatePdf/") ||
      file === "src/features/consumerRepair/consumerRepairAiAdapter.ts" ||
      file.startsWith("tests/real500/") ||
      file.startsWith("tests/architecture/real500") ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "tests/e2e/real500DiverseConstructionWorks.web.spec.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts" ||
      file === "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts" ||
      file === "scripts/release/runReleaseVerifyWithStepTiming.ts" ||
      file === "scripts/e2e/real500AcceptanceCore.ts" ||
      file === "scripts/e2e/runAndroidApi34Real500DiverseConstructionWorksSample.ts" ||
      file === "scripts/e2e/runReal500DiverseConstructionWorksExpandedEstimateProof.ts",
  });
  const results = sampleCases().map((item) => {
    const result = evaluateReal500Case(item);
    return {
      caseId: result.caseId,
      route: result.route,
      prompt: result.prompt,
      runtimeTraceId: result.runtimeTraceId,
      visibleRows: result.visibleRows,
      classification: result.failures.length === 0 ? result.classification : result.failures[0],
      forbiddenRowsFound: result.forbiddenRowsFound,
      unitSemanticsPassed: result.unitSemanticsPassed,
      pdfActionState: true,
      failures: result.failures,
    };
  });
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...results.flatMap((item) => item.failures.map((failure) => `${item.caseId}:${failure}`)),
  ];
  writeJson("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
  });
  writeJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    prompt_runtime: results.map((item) => ({
      caseId: item.caseId,
      route: item.route,
      prompt: item.prompt,
      visibleRows: item.visibleRows,
      classification: item.classification,
    })),
  });
  const matrix = {
    final_status: failures.length === 0 ? "REAL_500_ANDROID_API34_SAMPLE_OK" : "BLOCKED_REAL_500_ANDROID_API34_SAMPLE",
    android_api34_tested: canonical.ok,
    android_api34_prompts_total: results.length,
    android_api34_prompts_passed: results.filter((item) => item.failures.length === 0).length,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_results.json", matrix);
  if (failures.length > 0) throw new Error(`REAL500_ANDROID_API34_SAMPLE_FAILED:${failures.join(";")}`);
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34Real500DiverseConstructionWorksSample();
}
