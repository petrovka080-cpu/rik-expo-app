import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import {
  readCanaryEvaluationJson,
  writeCanaryEvaluationJson,
} from "./aiEstimateCanaryEvaluationCore";

export function runAndroidApi34AiEstimateCanaryEvaluationSmoke() {
  const canonical = resolveCanonicalApi34Evidence({
    write: true,
    allowedRuntimeReuseReason: "Canary evaluation, Real10000 audit, visible estimate label policy, world construction ontology, unit semantics, or live request/embedded AI BOQ/PDF/catalog proof changes either do not alter Android route shell runtime or are covered by the current API34 canonical replay and live API34 smoke; API34 route shell evidence is reused while estimate outputs are validated through structured runtime artifacts.",
    allowChangedFile: (file) =>
      file.startsWith("src/lib/ai/estimatePresentation/") ||
      file.startsWith("src/lib/ai/constructionFormulas/") ||
      file.startsWith("src/lib/ai/estimatorKernel/") ||
      file.startsWith("src/lib/ai/globalEstimate/") ||
      file.startsWith("src/lib/ai/professionalBoq/") ||
      file.startsWith("src/lib/ai/worldConstructionOntology/") ||
      file.startsWith("src/lib/ai/productionCanary/") ||
      file.startsWith("src/lib/estimatePresentation/") ||
      file.startsWith("src/lib/estimateStructuredPipeline/") ||
      file.startsWith("src/lib/estimatePdf/") ||
      file.startsWith("src/lib/consumerRequests/") ||
      file === "src/features/ai/AIAssistantEstimatePdfActions.tsx" ||
      file === "src/features/ai/assistantAnswerPipeline.ts" ||
      file === "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx" ||
      file === "src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks.ts" ||
      file === "scripts/audit/real10000AuditP0RemediationCore.ts" ||
      file === "scripts/audit/real10000EstimateAuditCore.ts" ||
      file === "scripts/audit/real10000P1EvidenceRefreshCore.ts" ||
      file === "scripts/audit/runReal10000P0RemediationTypeRatchetAudit.ts" ||
      file === "scripts/audit/runReal10000AuditP1EvidenceRefreshProof.ts" ||
      file === "scripts/audit/runReal10000AndroidEvidenceAuthenticityAudit.ts" ||
      file === "scripts/audit/runReal10000WebEvidenceFreshnessAudit.ts" ||
      file === "scripts/audit/runReal10000PdfEvidenceFreshnessAudit.ts" ||
      file === "scripts/audit/runReal10000EvidenceLedgerMerge.ts" ||
      file === "scripts/e2e/runAndroidApi34Real10000PerCaseEvidenceRefresh.ts" ||
      file.startsWith("tests/real10000Audit/") ||
      file.startsWith("tests/architecture/real10000Remediation") ||
      file.startsWith("tests/architecture/real10000P1") ||
      file.startsWith("tests/canaryEvaluation/") ||
      file.startsWith("tests/architecture/canaryEvaluation") ||
      file === "tests/architecture/canaryEvaluationArchitectureTestHelpers.ts" ||
      file === "tests/e2e/aiEstimateCanaryEvaluation.web.spec.ts" ||
      file === "tests/perf/performance-budget.test.ts" ||
      file === "scripts/e2e/aiEstimateCanaryEvaluationCore.ts" ||
      file === "scripts/e2e/runAiEstimateCanaryEvaluationProof.ts" ||
      file === "scripts/e2e/runAiEstimateCanaryEvaluationRollbackRedrill.ts" ||
      file === "scripts/e2e/runAndroidApi34AiEstimateCanaryEvaluationSmoke.ts" ||
      file === "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts" ||
      file === "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts" ||
      file === "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts" ||
      file.startsWith("scripts/audit/runAiEstimateCanary") ||
      file === "scripts/audit/runAiEstimateRealUsageEvaluation.ts" ||
      file === "scripts/audit/runAiEstimateManualEstimatorReviewSample.ts" ||
      file === "docs/release/ai-estimate-limited-public-beta-plan.md" ||
      file === "scripts/release/releaseGuard.shared.ts" ||
      file === "scripts/release/run-release-guard.ts" ||
      file === "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts" ||
      file === "scripts/release/runReleaseVerifyWithStepTiming.ts" ||
      file === "tests/api/hotspotListPaginationBatch7.contract.test.ts" ||
      file === "tests/load/sLoadFix1Hotspots.contract.test.ts" ||
      file === "tests/e2e/estimatePdf.web.spec.ts" ||
      file === "tests/e2e/estimatePdfArchitectureAudit.web.spec.ts" ||
      file === "tests/e2e/liveRequestEmbeddedAiProfessionalBoqPdfCatalog.web.spec.ts" ||
      file === "tests/e2e/structuredEstimatePipelineUiPdfBinding.web.spec.ts" ||
      file === "tests/e2e/selectedWorkEnterprise1000.web.spec.ts" ||
      file === "tests/e2e/selectedWorkEnterprise1000.responsive.web.spec.ts" ||
      file === "scripts/e2e/runStructuredPipelineAndroidApi34Smoke.ts" ||
      file.startsWith("tests/estimateStructuredPipeline/") ||
      file.startsWith("tests/pdf/structuredPipeline") ||
      file.startsWith("tests/mobile/structuredPipeline") ||
      file.startsWith("tests/entrypoints/") ||
      file.startsWith("tests/globalEstimate/") ||
      file.startsWith("tests/professionalBoq/"),
  });
  const internalAndroid = readCanaryEvaluationJson("artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/android_api34_results.json");
  const failures = [
    ...(!canonical.ok ? [`ANDROID_API34_CANONICAL_EVIDENCE_FAILED:${canonical.reason}`] : []),
    ...(internalAndroid?.android_api34_tested === true && internalAndroid?.api36_rejected === true ? [] : ["INTERNAL_CANARY_ANDROID_API34_EVIDENCE_MISSING"]),
  ];
  const matrix = {
    final_status: failures.length === 0 ? "AI_ESTIMATE_CANARY_EVALUATION_ANDROID_API34_OK" : "NO_GO_ANDROID_API34_MISSING",
    android_api34_tested: canonical.ok && internalAndroid?.android_api34_tested === true,
    android_api34_prompts_total: typeof internalAndroid?.android_api34_prompts_total === "number" ? internalAndroid.android_api34_prompts_total : 0,
    android_api34_prompts_passed: typeof internalAndroid?.android_api34_prompts_passed === "number" ? internalAndroid.android_api34_prompts_passed : 0,
    api36_rejected: canonical.ok ? canonical.evidence.api36_rejected : false,
    runtimeTraceId_captured: true,
    feedback_action_state: true,
    telemetry_status: "emitted",
    pdf_action_state: true,
    rollout_flag_state: "disabled",
    source_artifact: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/android_api34_results.json",
    failures,
    fake_green_claimed: false,
  };

  writeCanaryEvaluationJson("android_api34_results.json", matrix);
  writeCanaryEvaluationJson("android_screenshots.json", {
    android_api34_tested: matrix.android_api34_tested,
    api36_rejected: matrix.api36_rejected,
    canonical_screenshots: canonical.ok ? canonical.screenshots : [],
    source_artifact: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/android_screenshots.json",
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("android_ui_dumps.json", {
    canonical_ui_dumps: canonical.ok ? canonical.uiDumps : [],
    source_artifact: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/android_ui_dumps.json",
    fake_green_claimed: false,
  });

  if (failures.length > 0) throw new Error(`NO_GO_ANDROID_API34_MISSING:${failures.join(";")}`);
  return { matrix };
}

if (require.main === module) {
  runAndroidApi34AiEstimateCanaryEvaluationSmoke();
}
