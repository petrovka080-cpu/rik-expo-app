import { buildAiEstimateEnterpriseFinalReadinessReport } from "../../scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";

export const verifiedFinalReadiness = {
  typecheckPassed: true,
  lintPassed: true,
  gitDiffCheckPassed: true,
  targetedTestsPassed: true,
  architectureTestsPassed: true,
  playwrightWebPassed: true,
  androidApi34SmokePassed: true,
  pdfFinalProofPassed: true,
  runtimeProofPassed: true,
  fullJestPassed: true,
  releaseVerifyPassed: true,
  commitCreated: true,
  branchPushed: true,
  finalWorktreeClean: true,
};

export function finalReadinessReport() {
  return buildAiEstimateEnterpriseFinalReadinessReport({
    verification: verifiedFinalReadiness,
    ignoreNonArtifactDirtyPaths: true,
    now: "2026-05-29T00:00:00.000Z",
  });
}

