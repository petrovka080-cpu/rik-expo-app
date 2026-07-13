import { evaluatePricebookLookup } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate no fake suppliers", () => {
  it("never claims fake supplier identity for seeded or missing prices", () => {
    const result = evaluatePricebookLookup();

    expect(result.no_fake_suppliers).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/\b(?:fake|mock|demo)\s+(?:supplier|catalog)\b/i);
  });
});
