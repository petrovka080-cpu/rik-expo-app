import { read } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not delete owner live-quality gate registration", () => {
  const guardSource = read("scripts/release/releaseGuard.shared.ts");
  const scopeSource = read("scripts/release/releaseTargetScope.ts");

  expect(guardSource).toContain("SCOPED_OWNER_RELEASE_GATES");
  expect(guardSource).toContain("runOwnerAccountLiveEstimateQualityLockProof.ts");
  expect(scopeSource).toContain("OWNER_LIVE_QUALITY_GATE_NAME");
});
