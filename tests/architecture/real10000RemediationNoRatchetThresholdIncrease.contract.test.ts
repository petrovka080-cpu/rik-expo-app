import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";

test("Real10000 P0 remediation does not raise the unsafe cast ratchet threshold", () => {
  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.before.allowed_total).toBe(result.after.allowed_total);
  expect(result.ratchet_threshold_increased).toBe(false);
});
