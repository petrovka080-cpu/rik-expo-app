import { runP0GoldenPromptRemediationAudit } from "../../scripts/audit/real10000AuditP0RemediationCore";

test("Real10000 remediation closes P0 golden prompts", () => {
  const result = runP0GoldenPromptRemediationAudit();

  expect(result.p0_golden_prompts_passed).toBe(true);
  expect(result.failed).toEqual([]);
});
