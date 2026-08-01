import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { calculateProfessionalCostForPassport } from "../../src/lib/estimate/professionalCostCalculator";

describe("professional cost calculator", () => {
  it("calculates line subtotals only from BOQ quantity and sourced unit price", () => {
    const passport = buildProfessionalWorkPassport("village_water_supply_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    const first = result.lines[0];

    expect(result.summary.costRowsCount).toBe(passport.boqRecipe.rowCount);
    expect(result.summary.pricedRequiredRowsPercent).toBeGreaterThanOrEqual(80);
    expect(result.summary.preliminaryTotalAllowed).toBe(true);
    expect(result.summary.contractTotalAllowed).toBe(false);
    expect(first.unitPrice).toBeGreaterThan(0);
    expect(first.lineSubtotal).toBeCloseTo(Number((first.quantity * (first.unitPrice ?? 0)).toFixed(2)));
    expect(first.priceSourceId).toBeTruthy();
    expect(first.trustedForContractTotal).toBe(false);

    const shiftLine = result.lines.find((line) => line.unit === "shift");
    const shiftSource = result.sources.find((source) => source.rowId === shiftLine?.rowId);
    expect(shiftLine).toMatchObject({
      unit: "shift",
      priceState: expect.not.stringMatching(/^missing_price$/),
    });
    expect(shiftSource?.priceRecord).toMatchObject({
      unit: "machine_hour",
    });
  });
});
