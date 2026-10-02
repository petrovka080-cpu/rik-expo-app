import { canonicalEstimateInitialParameterInputs } from "./canonicalEstimatePromptParameters";
import type { CanonicalEstimateCatalogItem } from "./contracts";

function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: "flooring_interior_carpet_installation",
    releaseId: "release",
    namespace: "global",
    domain: "interior",
    workKey: "carpet",
    titleRu: "Укладка ковролина",
    definitionVersion: 1,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: [
      {
        parameterId: "area_m2",
        ordinal: 0,
        valueType: "decimal",
        unitId: "m2",
        titleRu: "Площадь",
        required: true,
        defaultValue: null,
        constraints: { min: 0.01 },
        visibilityRole: "USER_INPUT",
        formulaConsumers: ["floor_area"],
      },
      {
        parameterId: "waste_factor",
        ordinal: 1,
        valueType: "decimal",
        unitId: "ratio",
        titleRu: "Запас",
        required: true,
        defaultValue: 1.05,
        constraints: {},
        visibilityRole: "USER_INPUT",
        formulaConsumers: ["material_waste"],
      },
      {
        parameterId: "norm_consumption",
        ordinal: 2,
        valueType: "decimal",
        unitId: "kg_m2",
        titleRu: "Норма расхода",
        required: true,
        defaultValue: 0.4,
        constraints: {},
        visibilityRole: "INTERNAL_ONLY",
      },
    ],
  };
}

describe("canonicalEstimateInitialParameterInputs", () => {
  it("maps the measured geometry from a prompt to the matching editable parameter", () => {
    expect(canonicalEstimateInitialParameterInputs({
      catalog: catalog(),
      parsedQuantity: 45,
      parsedUnit: "м²",
    })).toEqual({ area_m2: 45, waste_factor: "1.05", norm_consumption: "0.4" });
  });

  it("does not guess a quantity when the prompt unit does not match", () => {
    expect(canonicalEstimateInitialParameterInputs({
      catalog: catalog(),
      parsedQuantity: 12,
      parsedUnit: "шт",
    }).area_m2).toBe("");
  });
});
