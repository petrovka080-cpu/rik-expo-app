import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";

test("Real10000 P0 remediation does not introduce test any-cast regression", () => {
  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.after.test_as_any_regression_found).toBe(false);
  expect(result.after.test_as_any_total).toBeLessThanOrEqual(result.after.allowed_total);
});
