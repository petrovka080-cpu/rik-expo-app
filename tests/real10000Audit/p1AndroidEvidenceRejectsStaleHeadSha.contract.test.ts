import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type AndroidAuthenticityArtifact = {
  android_head_sha_current_or_superseded: boolean;
};

test("Real10000 P1 Android evidence rejects stale HEAD SHA", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<AndroidAuthenticityArtifact>("android_evidence_authenticity.json");

  expect(artifact.android_head_sha_current_or_superseded).toBe(true);
});
