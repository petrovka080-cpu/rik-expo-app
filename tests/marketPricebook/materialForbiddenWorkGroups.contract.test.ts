import { runMarketMaterialCompatibilityAudit } from "./marketPricebookTestHelpers";

describe("market material forbidden work groups", () => {
  it("does not mark a required row domain as forbidden", () => {
    expect(runMarketMaterialCompatibilityAudit().final_status).toBe("GREEN_MARKET_MATERIAL_COMPATIBILITY_READY");
  });
});
