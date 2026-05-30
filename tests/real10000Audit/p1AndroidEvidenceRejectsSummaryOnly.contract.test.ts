import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type AndroidAuthenticityArtifact = {
  android_summary_only_evidence_found: boolean;
  cases_total: number;
};

test("Real10000 P1 Android evidence rejects summary-only proof", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<AndroidAuthenticityArtifact>("android_evidence_authenticity.json");

  expect(artifact.android_summary_only_evidence_found).toBe(false);
  expect(artifact.cases_total).toBe(300);
});
