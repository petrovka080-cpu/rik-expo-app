import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";
import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI context architecture - no raw DB dump", () => {
  it("passes only structured sanitized facts through the domain gateway", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const serializedFacts = JSON.stringify(report.roleFacts);
    const source = readDomainGatewaySource();

    expect(report.sanitizer.raw_db_dump_found).toBe(false);
    expect(serializedFacts).not.toContain("rawRows");
    expect(serializedFacts).not.toContain("providerPayload");
    expect(serializedFacts).not.toContain("select(*)");
    expect(source).toContain("sanitizeAiDomainContextBundle");
    expect(source).toContain("applyAiContextBudgetToBundle");
  });
});
