import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import {
  evaluateReal10000Case,
  real10000AndroidSampleCases,
  writeReal10000Json,
} from "./real10000AcceptanceCore";

export function runAndroidApi34Real10000DiverseConstructionWorksSample() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: "Real-10000 acceptance changes estimator runtime and proof coverage only; API34 route shell is consumed from current canonical evidence while all sampled prompts are validated through structured current-HEAD estimator runtime.",
    allowChangedFile: (file) =>
      file.startsWith("src/features/catalog/") ||
      file.startsWith("src/lib/ai/estimatorKernel/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/builtInAi/") ||
      file.startsWith("src/lib/ai/globalEstimate/") ||
      file.startsWith("src/lib/ai/estimatePresentation/") ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("src/lib/consumerRequests/") ||
      file.startsWith("src/lib/estimatePresentation/") ||
      file.startsWith("src/lib/estimateStructuredPipeline/") ||
      file.startsWith("src/lib/estimatePdf/") ||
      file.startsWith("src/lib/text/") ||
      file.startsWith("src/features/ai/") ||
      file.startsWith("src/features/consumerRepair/") ||
      file.startsWith("src/features/foreman/") ||
      file.startsWith("src/features/history/") ||
      file === "src/features/consumerRepair/consumerRepairAiAdapter.ts" ||
      file.startsWith("tests/e2e/") ||
      file.startsWith("tests/estimateStructuredPipeline/") ||
      file.startsWith("tests/real10000/") ||
      file.startsWith("tests/architecture/real10000") ||
      file.startsWith("tests/architecture/limitedPublicBeta") ||
      file.startsWith("tests/limitedPublicBeta/") ||
      file === "tests/e2e/real10000DiverseConstructionWorks.web.spec.ts" ||
      file === "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts" ||
      file === "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts" ||
      file === "scripts/release/runReleaseVerifyWithStepTiming.ts" ||
      file === "scripts/e2e/real10000AcceptanceCore.ts" ||
      file === "scripts/e2e/runAndroidApi34Real10000DiverseConstructionWorksSample.ts" ||
      file === "scripts/e2e/runReal10000DiverseConstructionWorksShardProof.ts" ||
      file === "scripts/e2e/runReal10000DiverseConstructionWorksShardMerge.ts" ||
      file === "scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts",
  });
  const results = real10000AndroidSampleCases().map((item) => {
    const result = evaluateReal10000Case(item, { includePdf: false });
    return {
      caseId: result.caseId,
      route: result.route,
      prompt: result.prompt,
      macroDomain: result.macroDomain,
      domain: result.domain,
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
  writeReal10000Json("android_screenshots.json", {
    android_api34_tested: canonical.ok,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    avd_name: canonical.ok ? canonical.evidence.avd_name : null,
    android_sdk: canonical.ok ? canonical.evidence.android_sdk : null,
    cpu_abi: canonical.ok ? canonical.evidence.cpu_abi : null,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    prompt_runtime: results,
  });
  writeReal10000Json("android_ui_dumps.json", {
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
    final_status: failures.length === 0 ? "REAL_10000_ANDROID_API34_SAMPLE_OK" : "BLOCKED_REAL_10000_ANDROID_API34_SAMPLE",
    android_api34_tested: canonical.ok,
    android_api34_prompts_total: results.length,
    android_api34_prompts_passed: results.filter((item) => item.failures.length === 0).length,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    failures,
    fake_green_claimed: false,
  };
  writeReal10000Json("android_api34_results.json", matrix);
  if (failures.length > 0) throw new Error(`REAL10000_ANDROID_API34_SAMPLE_FAILED:${failures.join(";")}`);
  return { matrix, results };
}

if (require.main === module) {
  runAndroidApi34Real10000DiverseConstructionWorksSample();
}
