import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";

test("Real10000 P0 remediation keeps unsafe cast ratchet within threshold", () => {
  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.after.after_unsafe_cast_total_lte_allowed).toBe(true);
  expect(result.after.ratchet_errors).toEqual([]);
  expect(result.final_status).toBe("TYPE_RATCHET_REMEDIATED");
});
