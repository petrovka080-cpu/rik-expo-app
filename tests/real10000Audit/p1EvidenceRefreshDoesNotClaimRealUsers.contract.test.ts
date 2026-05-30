import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type EvidenceRefreshMatrix = {
  real_external_user_traffic_proven: boolean;
  real_user_traffic_claimed: boolean;
  fake_green_claimed: boolean;
};

test("Real10000 P1 evidence refresh does not claim real users", () => {
  runP1EvidenceRefreshForTest();
  const matrix = readAuditArtifact<EvidenceRefreshMatrix>("evidence_refresh_matrix.json");

  expect(matrix.real_external_user_traffic_proven).toBe(false);
  expect(matrix.real_user_traffic_claimed).toBe(false);
  expect(matrix.fake_green_claimed).toBe(false);
});
