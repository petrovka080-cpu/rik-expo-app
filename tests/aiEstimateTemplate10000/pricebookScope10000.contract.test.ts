import { runProductionTemplate10000PricebookScopeAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("pricebook scope 10000", () => {
  it("binds every template and row to material recipe and pricebook scope policy", () => {
    const audit = runProductionTemplate10000PricebookScopeAudit();

    expect(audit.passed).toBe(true);
    expect(audit.templatesWithMaterialRecipeScope).toBe(10000);
    expect(audit.templatesWithPricebookScope).toBe(10000);
    expect(audit.failures).toHaveLength(0);
  });
});
