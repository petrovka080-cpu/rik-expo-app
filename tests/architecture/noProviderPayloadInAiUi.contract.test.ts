import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI UI context architecture - no provider payload", () => {
  it("keeps provider/debug payload details out of the AI-facing context", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const serializedFacts = JSON.stringify(report.roleFacts).toLowerCase();

    expect(report.sanitizer.debug_provider_payload_visible).toBe(false);
    expect(serializedFacts).not.toContain("providerpayload");
    expect(serializedFacts).not.toContain("debug_provider");
    expect(serializedFacts).not.toContain("runtime_debug");
    expect(serializedFacts).not.toContain("storagekey");
    expect(serializedFacts).not.toContain("mediaassetid");
  });
});
