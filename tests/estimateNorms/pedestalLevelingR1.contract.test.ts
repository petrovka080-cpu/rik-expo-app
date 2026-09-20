import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pedestalLevelingPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { COLUMN_BASE_LEVELING_FORMULAS } from "../../src/lib/estimate/v4/columnBaseLevelingR1";
import {
  PEDESTAL_LEVELING_FORMULAS,
  PEDESTAL_LEVELING_PARAMETERS,
  PEDESTAL_LEVELING_RESOURCES,
  PEDESTAL_LEVELING_SOURCE_ID,
  PEDESTAL_LEVELING_TARGETS,
  compilePedestalLevelingR1,
  pedestalLevelingAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalLevelingR1";

function catalog(target: (typeof PEDESTAL_LEVELING_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pedestal-leveling-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PEDESTAL_LEVELING_PARAMETERS.map((parameter) => ({
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

describe("pedestal concrete leveling canonical family", () => {
  it("compiles all seven exact identities through the shared core", async () => {
    for (const target of PEDESTAL_LEVELING_TARGETS) {
      const compiled = await compilePedestalLevelingR1(
        { ...pedestalLevelingAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(5);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pedestal-leveling")).toBe(true);
    }
  });

  it("reuses the accepted ACI 302 leveling graph", () => {
    expect(PEDESTAL_LEVELING_FORMULAS).toBe(COLUMN_BASE_LEVELING_FORMULAS);
    expect(PEDESTAL_LEVELING_PARAMETERS).toHaveLength(20);
    expect(PEDESTAL_LEVELING_FORMULAS).toHaveLength(6);
    expect(PEDESTAL_LEVELING_RESOURCES).toHaveLength(5);
    expect(JSON.stringify({ parameters: PEDESTAL_LEVELING_PARAMETERS, resources: PEDESTAL_LEVELING_RESOURCES }))
      .toContain(PEDESTAL_LEVELING_SOURCE_ID);
  });

  it("allows documentary values to remain blank but exposes missing quantities", async () => {
    const target = PEDESTAL_LEVELING_TARGETS[1];
    const input = { ...pedestalLevelingAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference", "leveling_location", "target_elevation_and_slope_reference",
      "flatness_levelness_requirement_reference", "approved_leveling_method_designation",
      "leveling_method_statement_reference", "screed_guide_designation",
      "leveling_equipment_designation", "quality_plan_reference", "mobilization_scope_reference",
    ]) delete input[parameterId];
    expect((await compilePedestalLevelingR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    delete input.leveling_equipment_machine_h;
    expect((await compilePedestalLevelingR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ missing_parameter_ids: ["leveling_equipment_machine_h"] }),
      ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PEDESTAL_LEVELING_TARGETS[4];
    const input = pedestalLevelingAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pedestalLevelingPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("leveled_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring repair or curing identities", async () => {
    const input = pedestalLevelingAcceptanceInputR1("standard");
    await expect(compilePedestalLevelingR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_repair_standard",
    })).rejects.toThrow("PEDESTAL_LEVELING_CATALOG_UNSUPPORTED");
  });
});
