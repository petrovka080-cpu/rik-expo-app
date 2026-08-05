import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate";
import {
  getProfessionalUnitDefinition,
  normalizeProfessionalPricedUnitForLocale,
  resolveProfessionalUnitDefinition,
} from "../../src/lib/estimate/professionalUnitRegistry";
import { resolveEngineeringUnitV4 } from "../../src/lib/estimate/v4/engineeringUnitRegistryV4";

describe("shared professional unit registry", () => {
  it("preserves semantic count units through validation, V4, UI, and PDF labels", () => {
    for (const [unit, label] of [["circuit", "контур"], ["zone", "зона"]] as const) {
      expect(resolveProfessionalUnitDefinition(unit)).toMatchObject({
        code: unit,
        dimension: "count",
        canonicalSiUnit: "pcs",
        precision: 0,
        discrete: true,
      });
      expect(resolveEngineeringUnitV4(unit)).toMatchObject({
        unit_id: unit,
        dimension: "count",
        precision: 0,
      });
      expect(formatEstimateUnitLabel(unit)).toBe(label);
    }
  });

  it("owns exact imperial factors and rejects cross-dimensional conversion", () => {
    expect(getProfessionalUnitDefinition("lbs")).toMatchObject({
      canonicalSiUnit: "kg",
      conversionFactorToSi: 0.45359237,
      dimension: "mass",
    });
    expect(getProfessionalUnitDefinition("sq_ft")).toMatchObject({
      canonicalSiUnit: "m2",
      conversionFactorToSi: 0.09290304,
      dimension: "area",
    });
    expect(normalizeProfessionalPricedUnitForLocale({
      quantity: 10,
      unitPrice: 2,
      unit: "lbs",
      jurisdiction: "KG",
      unitSystem: "metric",
      priorProvenance: {
        registryVersion: "professional-unit-registry:2026-07.v1",
        sourceUnit: "sq_ft",
        sourceQuantity: 10,
        sourceUnitPrice: 2,
        targetUnit: "m2",
        quantityFactor: 0.09290304,
        jurisdiction: "US",
        unitSystem: "imperial",
        converted: true,
      },
    })).toBeNull();
  });
});
