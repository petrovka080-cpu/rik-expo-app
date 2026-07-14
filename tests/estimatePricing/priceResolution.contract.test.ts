import { buildEstimatePriceCatalogBoqProof } from "../../src/lib/ai/estimatePricing/priceCatalogBoq";

describe("estimate price resolution contract", () => {
  it("resolves material and labor prices from quantities without invented zero totals", () => {
    const proof = buildEstimatePriceCatalogBoqProof();

    expect(proof.material_price_resolution_works).toBe(true);
    expect(proof.labor_price_resolution_works).toBe(true);
    expect(proof.price_source_visible).toBe(true);
    expect(proof.boq_prices_resolved).toBe(true);
    expect(proof.boq_total_calculated).toBe(true);
    expect(proof.totalKnownAmount).toBeGreaterThan(0);
    expect(proof.allRows.every((line) => line.unitPrice !== 0 || line.priceStatus !== "missing")).toBe(true);
  });
});
