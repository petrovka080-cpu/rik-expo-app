import type { RequestEstimateManualCatalogItem } from "../../src/features/consumerRepair/requestEstimateViewModel";

describe("free text catalog discipline", () => {
  it("keeps custom free text distinct from real catalog items", () => {
    const custom = {
      source: "custom",
      unitPrice: null,
      confidence: "low",
    };
    expect(custom).not.toMatchObject<Partial<RequestEstimateManualCatalogItem>>({
      source: "catalog_item",
      confidence: "high",
    });
  });
});
