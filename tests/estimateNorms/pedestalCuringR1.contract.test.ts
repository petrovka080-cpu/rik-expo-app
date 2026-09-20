import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pedestalCuringPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { COLUMN_BASE_CURING_FORMULAS } from "../../src/lib/estimate/v4/columnBaseCuringR1";
import {
  PEDESTAL_CURING_FORMULAS,
  PEDESTAL_CURING_PARAMETERS,
  PEDESTAL_CURING_RESOURCES,
  PEDESTAL_CURING_SOURCE_ID,
  PEDESTAL_CURING_TARGETS,
  compilePedestalCuringR1,
  pedestalCuringAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalCuringR1";

function catalog(target: (typeof PEDESTAL_CURING_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pedestal-curing-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PEDESTAL_CURING_PARAMETERS.map((parameter) => ({
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

describe("pedestal concrete curing canonical family", () => {
  it("compiles all six exact identities through the shared core", async () => {
    for (const target of PEDESTAL_CURING_TARGETS) {
      const compiled = await compilePedestalCuringR1(
        { ...pedestalCuringAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(3);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(6);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pedestal-curing")).toBe(true);
    }
  });

  it("reuses the accepted ACI curing graph", () => {
    expect(PEDESTAL_CURING_FORMULAS).toBe(COLUMN_BASE_CURING_FORMULAS);
    expect(PEDESTAL_CURING_PARAMETERS).toHaveLength(24);
    expect(PEDESTAL_CURING_FORMULAS).toHaveLength(9);
    expect(PEDESTAL_CURING_RESOURCES).toHaveLength(8);
    expect(JSON.stringify({ parameters: PEDESTAL_CURING_PARAMETERS, resources: PEDESTAL_CURING_RESOURCES }))
      .toContain(PEDESTAL_CURING_SOURCE_ID);
  });

  it("allows unclear documentary references to remain blank", async () => {
    const target = PEDESTAL_CURING_TARGETS[0];
    const input = { ...pedestalCuringAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference", "curing_location", "curing_method_statement_reference",
      "curing_water_source_reference", "wet_covering_material_designation",
      "application_equipment_designation", "quality_plan_reference", "mobilization_scope_reference",
    ]) delete input[parameterId];
    const compiled = await compilePedestalCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id === "work:concrete:pedestal-curing")).toBe(true);
  });

  it("returns an editable need for a missing selected-method quantity", async () => {
    const target = PEDESTAL_CURING_TARGETS[0];
    const input = { ...pedestalCuringAcceptanceInputR1(target.contextKey) };
    delete input.wet_covering_area_m2;
    const compiled = await compilePedestalCuringR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["wet_covering_area_m2"] }),
    ]));
    expect(compiled.rows.some((row) => row.row_id === "material:concrete:wet-curing-covering")).toBe(false);
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PEDESTAL_CURING_TARGETS[3];
    const input = pedestalCuringAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pedestalCuringPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("cured_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring embedded-items or placement identities", async () => {
    const input = pedestalCuringAcceptanceInputR1("standard");
    await expect(compilePedestalCuringR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_standard",
    })).rejects.toThrow("PEDESTAL_CURING_CATALOG_UNSUPPORTED");
  });
});
