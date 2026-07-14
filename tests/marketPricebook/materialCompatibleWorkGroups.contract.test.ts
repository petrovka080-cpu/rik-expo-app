import { runMarketMaterialCompatibilityAudit } from "./marketPricebookTestHelpers";

describe("market material compatible work groups", () => {
  it("allows every template row in its own work group", () => {
    expect(runMarketMaterialCompatibilityAudit().incompatible_rows).toBe(0);
  });
});
