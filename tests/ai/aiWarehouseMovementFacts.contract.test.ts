import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI warehouse movement facts", () => {
  it("returns structured stock and movement facts for warehouse role", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const warehouse = report.roleFacts.find((snapshot) => snapshot.role === "warehouse");

    expect(warehouse).toBeDefined();
    expect(warehouse?.returned_domains).toContain("warehouse");
    expect(warehouse?.numeric_fact_keys).toEqual(expect.arrayContaining([
      "gkl_issued",
      "gkl_remaining",
      "gkl_shortage",
    ]));
    expect(report.matrix.warehouse_movement_facts_ready).toBe(true);
  });
});
