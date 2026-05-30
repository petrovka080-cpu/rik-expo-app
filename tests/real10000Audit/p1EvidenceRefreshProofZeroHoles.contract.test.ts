import { runReal10000AuditP1EvidenceRefreshProof } from "../../scripts/audit/runReal10000AuditP1EvidenceRefreshProof";

test("Real10000 P1 evidence refresh closes all audit holes without claiming real user traffic", () => {
  const result = runReal10000AuditP1EvidenceRefreshProof();

  expect(result.matrix.final_status).toBe("GREEN_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH_READY");
  expect(result.matrix.p0_holes).toBe(0);
  expect(result.matrix.p1_holes).toBe(0);
  expect(result.matrix.p2_holes).toBe(0);
  expect(result.matrix.real_external_user_traffic_proven).toBe(false);
  expect(result.matrix.fake_green_claimed).toBe(false);
});
