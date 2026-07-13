import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";

describe("price ratebook policy", () => {
  it("uses explicit missing-price state instead of zero or AI-estimated prices", () => {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: "masonry_interior_gas_block_lay_standard",
      quantity: 400,
      countryCode: "KG",
    });

    expect(estimate.rows.every((row) =>
      row.priceStatus === "PRICE_MISSING" &&
      row.unitPrice === null &&
      row.total === null &&
      row.missingPriceHandledHonestly === true
    )).toBe(true);
  });
});
