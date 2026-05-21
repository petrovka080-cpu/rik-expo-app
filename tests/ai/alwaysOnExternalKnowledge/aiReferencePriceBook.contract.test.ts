import {
  REFERENCE_PRICE_BOOK,
  getReferenceUnitPrice,
  resolveReferencePriceItem,
} from "../../../src/lib/ai/externalKnowledge/referencePriceBook";

describe("AI reference price book", () => {
  it("contains configured review-required prices for estimate fallback", () => {
    expect(REFERENCE_PRICE_BOOK.length).toBeGreaterThan(8);
    expect(getReferenceUnitPrice("flooring.covering.parquet_laminate")).toBe(2800);
    expect(resolveReferencePriceItem("flooring.covering.parquet_laminate").requiresReview).toBe(true);
    expect(resolveReferencePriceItem("plaster.mix").sourceType).toBe("configured_reference");
  });
});
