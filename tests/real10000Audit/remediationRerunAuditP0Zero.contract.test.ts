import { runReal10000AuditP0RemediationProof } from "../../scripts/audit/real10000AuditP0RemediationCore";

jest.setTimeout(180_000);

test("Real10000 remediation reruns audit with zero P0 holes", () => {
  const result = runReal10000AuditP0RemediationProof();
  const matrix = result.matrix as { after_p0_holes: number; final_status: string; real_external_user_traffic_proven: boolean };

  expect(matrix.after_p0_holes).toBe(0);
  expect(matrix.final_status).toBe("GREEN_REAL_10000_AUDIT_P0_HOLES_REMEDIATED_READY");
  expect(matrix.real_external_user_traffic_proven).toBe(false);
});
