import { runExactPromptLookupRemediationAudit } from "../../scripts/audit/real10000AuditP0RemediationCore";

test("Real10000 remediation removes exact prompt lookup findings", () => {
  const result = runExactPromptLookupRemediationAudit();

  expect(result.exact_prompt_lookup_found_after_fix).toBe(false);
  expect(result.holes).toEqual([]);
});
