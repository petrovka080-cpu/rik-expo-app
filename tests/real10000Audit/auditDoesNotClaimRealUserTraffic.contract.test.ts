import { buildReal10000EstimateAuditMatrix } from "../../scripts/audit/real10000EstimateAuditCore";

test("audit matrix never claims real external user traffic", () => {
  const matrix = buildReal10000EstimateAuditMatrix([]);

  expect(matrix.governed_acceptance_cases_proven).toBe(true);
  expect(matrix.real_external_user_traffic_proven).toBe(false);
  expect(matrix.real_user_traffic_claimed).toBe(false);
});
