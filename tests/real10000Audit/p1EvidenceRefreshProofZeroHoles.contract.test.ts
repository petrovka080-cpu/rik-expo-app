import { runReal10000AuditP1EvidenceRefreshProof } from "../../scripts/audit/runReal10000AuditP1EvidenceRefreshProof";

test("Real10000 P1 evidence refresh stays blocked while audit holes remain", () => {
  const result = runReal10000AuditP1EvidenceRefreshProof();

  expect(result.final_status).toBe("BLOCKED_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH");
  expect(result.p0_holes).toBe(0);
  expect(result.p1_holes).toBeGreaterThan(0);
  expect(result.p2_holes).toBeGreaterThan(0);
  expect(result.real_external_user_traffic_proven).toBe(false);
  expect(result.fake_green_claimed).toBe(false);
});
