import { runReal10000AuditP1EvidenceRefreshProof } from "../../scripts/audit/runReal10000AuditP1EvidenceRefreshProof";

test("Real10000 P1 evidence refresh is green only with zero audit holes", () => {
  const result = runReal10000AuditP1EvidenceRefreshProof();

  expect(result.final_status).toBe("GREEN_REAL_10000_AUDIT_P1_EVIDENCE_REFRESH_READY");
  expect(result.android_api34_tested).toBe(true);
  expect(result.api36_rejected).toBe(true);
  expect(result.android_screenshots_real).toBe(true);
  expect(result.android_ui_dumps_real).toBe(true);
  expect(result.placeholder_android_artifacts_found).toBe(false);
  expect(result.p0_holes).toBe(0);
  expect(result.p1_holes).toBe(0);
  expect(result.p2_holes).toBe(0);
  expect(result.holes_total).toBe(0);
  expect(result.real_external_user_traffic_proven).toBe(false);
  expect(result.fake_green_claimed).toBe(false);
});
