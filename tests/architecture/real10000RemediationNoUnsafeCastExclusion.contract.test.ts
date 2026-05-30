import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";

test("Real10000 P0 remediation does not add unsafe cast scanner exclusions", () => {
  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.after.allowlist_entries).toBe(0);
  expect(result.after.allowlisted_findings).toBe(0);
  expect(result.after.scanner_exclusion_added).toBe(false);
  expect(result.scanner_exclusion_added).toBe(false);
  expect(result.scanner_exclusions_added).toBe(false);
});
