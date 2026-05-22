import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI context budget", () => {
  it("keeps every role context within the 20 fact budget", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();

    expect(report.contextBudget.context_budget_enforced).toBe(true);
    expect(report.contextBudget.ai_context_p95_lte_1000ms).toBe(true);

    for (const row of report.contextBudget.roles) {
      expect(row.max_facts).toBe(20);
      expect(row.max_numeric_facts).toBe(20);
      expect(row.merged_facts).toBeLessThanOrEqual(20);
      expect(row.merged_numeric_facts).toBeLessThanOrEqual(20);
      expect(row.max_facts_in_single_domain).toBeLessThanOrEqual(20);
      expect(row.max_numeric_facts_in_single_domain).toBeLessThanOrEqual(20);
      expect(row.passed).toBe(true);
    }
  });
});
