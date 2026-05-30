import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type WebFreshnessArtifact = {
  web_head_sha_current_or_superseded: boolean;
  web_live_prompts_total: number;
  web_live_prompts_passed: number;
};

test("Real10000 P1 web evidence requires fresh or superseded HEAD SHA", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<WebFreshnessArtifact>("web_evidence_freshness.json");

  expect(artifact.web_head_sha_current_or_superseded).toBe(true);
  expect(artifact.web_live_prompts_total).toBeGreaterThanOrEqual(1000);
  expect(artifact.web_live_prompts_passed).toBe(artifact.web_live_prompts_total);
});
