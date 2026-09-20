import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  columnBaseCuringPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { BELT_CURING_FORMULAS } from "../../src/lib/estimate/v4/beltCuringR1";
import {
  COLUMN_BASE_CURING_FORMULAS,
  COLUMN_BASE_CURING_PARAMETERS,
  COLUMN_BASE_CURING_RESOURCES,
  COLUMN_BASE_CURING_SOURCE_ID,
  COLUMN_BASE_CURING_TARGETS,
  columnBaseCuringAcceptanceInputR1,
  compileColumnBaseCuringR1,
} from "../../src/lib/estimate/v4/columnBaseCuringR1";

function catalog(target: (typeof COLUMN_BASE_CURING_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-column-base-curing-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: COLUMN_BASE_CURING_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: parameter.default_value,
      constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
    })),
  };
}

describe("column-base concrete curing canonical family", () => {
  it("compiles all six exact curing identities through the shared core", async () => {
    for (const target of COLUMN_BASE_CURING_TARGETS) {
      const input = columnBaseCuringAcceptanceInputR1(target.contextKey);
      const compiled = await compileColumnBaseCuringR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(3);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(6);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:column-base-curing"))
        .toBe(true);
    }
  });

  it("reuses the accepted ACI curing graph instead of adding a calculator", () => {
    expect(COLUMN_BASE_CURING_FORMULAS).toBe(BELT_CURING_FORMULAS);
    expect(COLUMN_BASE_CURING_PARAMETERS).toHaveLength(24);
    expect(COLUMN_BASE_CURING_FORMULAS).toHaveLength(9);
    expect(COLUMN_BASE_CURING_RESOURCES).toHaveLength(8);
    expect(JSON.stringify({
      parameters: COLUMN_BASE_CURING_PARAMETERS,
      resources: COLUMN_BASE_CURING_RESOURCES,
    })).toContain(COLUMN_BASE_CURING_SOURCE_ID);
  });

  it("allows unclear documentary references to remain blank", async () => {
    const target = COLUMN_BASE_CURING_TARGETS[0];
    const input = { ...columnBaseCuringAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference",
      "curing_location",
      "curing_method_statement_reference",
      "curing_water_source_reference",
      "wet_covering_material_designation",
      "application_equipment_designation",
      "quality_plan_reference",
      "mobilization_scope_reference",
    ]) delete input[parameterId];
    const compiled = await compileColumnBaseCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id === "work:concrete:column-base-curing"))
      .toBe(true);
  });

  it("returns an editable calculation need for a missing selected-method quantity", async () => {
    const target = COLUMN_BASE_CURING_TARGETS[0];
    const input = { ...columnBaseCuringAcceptanceInputR1(target.contextKey) };
    delete input.wet_covering_area_m2;
    const compiled = await compileColumnBaseCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["wet_covering_area_m2"] }),
    ]));
    expect(compiled.rows.some((row) => row.row_id === "material:concrete:wet-curing-covering"))
      .toBe(false);
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = COLUMN_BASE_CURING_TARGETS[3];
    const input = columnBaseCuringAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...columnBaseCuringPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("cured_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring installation or concrete-placement identities", async () => {
    const input = columnBaseCuringAcceptanceInputR1("standard");
    await expect(compileColumnBaseCuringR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_standard",
    })).rejects.toThrow("COLUMN_BASE_CURING_CATALOG_UNSUPPORTED");
  });
});
