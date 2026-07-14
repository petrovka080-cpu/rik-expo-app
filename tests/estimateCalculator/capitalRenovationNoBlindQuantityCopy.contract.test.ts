import { calculateCapitalRenovationFromPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import { CAPITAL_RENOVATION_98_PROMPT } from "./capitalRenovationTestHelpers";

describe("capital renovation no blind quantity copy", () => {
  it("does not copy the apartment area into every work and material row", () => {
    const estimate = calculateCapitalRenovationFromPrompt(CAPITAL_RENOVATION_98_PROMPT);
    expect(estimate).toBeTruthy();

    const rows = estimate!.rows;
    const uniqueQuantities = new Set(rows.map((row) => row.quantity));
    const uniqueUnits = new Set(rows.map((row) => row.unit));
    const copiedAreaRows = rows.filter((row) => row.quantity === estimate!.geometry.areaM2);

    expect(rows.length).toBeGreaterThan(40);
    expect(uniqueQuantities.size).toBeGreaterThan(20);
    expect([...uniqueUnits]).toEqual(expect.arrayContaining(["sq_m", "kg", "bag", "linear_m", "pcs", "trip"]));
    expect(copiedAreaRows.length).toBeLessThan(rows.length / 4);
    expect(rows.every((row) => row.quantity > 0)).toBe(true);
  });
});
