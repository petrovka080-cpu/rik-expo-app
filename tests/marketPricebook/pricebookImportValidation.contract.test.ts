import { runMarketPricebookImportValidation } from "../../scripts/e2e/runMarketMaterialCoverageAudit";

describe("market pricebook import validation", () => {
  it("keeps fixture imports test-only", () => {
    const result = runMarketPricebookImportValidation({ writeArtifacts: false });
    expect(result.used_for_test_only).toBe(true);
    expect(result.production_price_claimed).toBe(false);
  });
});
