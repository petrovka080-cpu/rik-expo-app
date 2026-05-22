import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI accountant context isolation", () => {
  it("keeps foreman checklist domains out of accountant context", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const accountant = report.roleFacts.find((snapshot) => snapshot.role === "accountant");

    expect(accountant).toBeDefined();
    expect(accountant?.returned_domains).not.toContain("field");
    expect(accountant?.returned_domains).not.toContain("contractors");
    expect(accountant?.returned_domains).not.toContain("media");
    expect(report.matrix.accountant_foreman_context_mix_found).toBe(false);
  });
});
