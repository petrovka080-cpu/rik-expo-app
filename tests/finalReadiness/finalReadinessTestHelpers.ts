import { buildAiEstimateEnterpriseFinalReadinessReport } from "../../scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";
import {
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

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

export type FinalReadinessMatrix = ReturnType<typeof finalReadinessReport>["matrix"];

export function expectFinalReadinessScopedOutForCurrentIosTestFlight(
  matrix: FinalReadinessMatrix,
): boolean {
  if (!isIosTestFlightInternalQaScopedRun()) {
    return false;
  }

  expectIosTestFlightScopedOutNoFakeGreen({
    wave: matrix.wave,
    fakeGreenClaimed: matrix.fake_green_claimed,
    productionRolloutEnabled: matrix.production_rollout_enabled,
  });
  expect(matrix.go_no_go_decision).toBe("NO_GO");
  expect(matrix.all_prerequisites_green).toBe(false);
  expect(matrix.matrix_ledger_passed).toBe(false);
  expect(matrix.blockers.length).toBeGreaterThan(0);
  return true;
}
