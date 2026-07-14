import { evaluateMissingPrice } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate honest missing prices", () => {
  it("keeps missing prices null and marks estimate partial", () => {
    const result = evaluateMissingPrice();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_MISSING_PRICE_READY");
    expect(result.total_status).toBe("PARTIAL_PRICE_MISSING");
    expect(result.missing_rows.length).toBeGreaterThan(0);
    expect(result.missing_rows.every((row) => row.price_value === null && row.line_total === null)).toBe(true);
    expect(result.failures).toEqual([]);
  });
});
