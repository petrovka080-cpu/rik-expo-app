import { convertGlobalUnit, normalizeGlobalUnitForLocale } from "../../src/lib/ai/globalEstimate";
import {
  normalizeProfessionalPricedUnitForLocale,
  professionalUnitConversionFactor,
} from "../../src/lib/estimate/professionalUnitRegistry";

describe("global unit conversion engine", () => {
  it("converts area and preserves local imperial units when required", () => {
    expect(Math.round(convertGlobalUnit(100, "sq_m", "sq_ft").value)).toBe(1076);
    const normalized = normalizeGlobalUnitForLocale({
      value: 1000,
      unit: "sq ft",
      unitSystem: "imperial",
    });
    expect(normalized.normalizedUnit).toBe("sq_ft");
    expect(normalized.displayUnit).toBe("sq ft");
  });

  it("normalizes imperial quantities to metric for Kyrgyzstan with exact factors", () => {
    const mass = normalizeGlobalUnitForLocale({
      value: 100,
      unit: "lbs",
      unitSystem: "metric",
    });
    const area = normalizeGlobalUnitForLocale({
      value: 100,
      unit: "sq_ft",
      unitSystem: "metric",
    });

    expect(mass.normalizedUnit).toBe("kg");
    expect(mass.normalizedValue).toBeCloseTo(45.359237, 8);
    expect(mass.conversion?.factor).toBe(0.45359237);
    expect(area.normalizedUnit).toBe("sq_m");
    expect(area.normalizedValue).toBeCloseTo(9.290304, 8);
    expect(area.conversion?.factor).toBe(0.09290304);
  });

  it("keeps dimensional round trips and priced totals invariant", () => {
    const poundsToKg = professionalUnitConversionFactor("lbs", "kg");
    const kgToPounds = professionalUnitConversionFactor("kg", "lbs");
    expect(poundsToKg).toBe(0.45359237);
    expect((poundsToKg ?? 0) * (kgToPounds ?? 0)).toBeCloseTo(1, 12);

    const normalized = normalizeProfessionalPricedUnitForLocale({
      quantity: 100,
      unitPrice: 3.25,
      unit: "lbs",
      jurisdiction: "KG",
      unitSystem: "metric",
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.unit).toBe("kg");
    expect(normalized?.total).toBeCloseTo(325, 10);
    expect((normalized?.quantity ?? 0) * (normalized?.unitPrice ?? 0)).toBeCloseTo(325, 10);
    expect(normalized?.provenance).toMatchObject({
      sourceUnit: "lbs",
      targetUnit: "kg",
      quantityFactor: 0.45359237,
      jurisdiction: "KG",
      unitSystem: "metric",
      converted: true,
    });

    const repeated = normalized && normalizeProfessionalPricedUnitForLocale({
      quantity: normalized.quantity,
      unitPrice: normalized.unitPrice,
      unit: normalized.unit,
      jurisdiction: "KG",
      unitSystem: "metric",
      priorProvenance: normalized.provenance,
    });
    expect(repeated).toEqual(normalized);
  });
});
