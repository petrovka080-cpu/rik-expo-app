import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  columnBaseLevelingPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { BELT_LEVELING_FORMULAS } from "../../src/lib/estimate/v4/beltLevelingR1";
import {
  COLUMN_BASE_LEVELING_FORMULAS,
  COLUMN_BASE_LEVELING_PARAMETERS,
  COLUMN_BASE_LEVELING_RESOURCES,
  COLUMN_BASE_LEVELING_SOURCE_ID,
  COLUMN_BASE_LEVELING_TARGETS,
  columnBaseLevelingAcceptanceInputR1,
  compileColumnBaseLevelingR1,
} from "../../src/lib/estimate/v4/columnBaseLevelingR1";

function catalog(target: (typeof COLUMN_BASE_LEVELING_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId, releaseId: "prepared-column-base-leveling-test",
    namespace: "global", domain: "concrete", workKey: target.catalogId,
    titleRu: target.titleRu, definitionVersion: 4, applicability: {}, professionalMetadata: {},
    parameterSchema: COLUMN_BASE_LEVELING_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id, ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id, titleRu: parameter.title_ru, required: parameter.required,
      defaultValue: parameter.default_value, constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
    })),
  };
}

describe("column-base concrete leveling canonical family", () => {
  it("compiles all seven exact identities without unrelated concrete components", async () => {
    for (const target of COLUMN_BASE_LEVELING_TARGETS) {
      const input = columnBaseLevelingAcceptanceInputR1(target.contextKey);
      const compiled = await compileColumnBaseLevelingR1({ ...input }, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(5);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:column-base-leveling")).toBe(true);
    }
  });

  it("reuses the accepted ACI leveling graph", () => {
    expect(COLUMN_BASE_LEVELING_FORMULAS).toBe(BELT_LEVELING_FORMULAS);
    expect(COLUMN_BASE_LEVELING_PARAMETERS).toHaveLength(20);
    expect(COLUMN_BASE_LEVELING_FORMULAS).toHaveLength(6);
    expect(COLUMN_BASE_LEVELING_RESOURCES).toHaveLength(5);
    expect(JSON.stringify({ parameters: COLUMN_BASE_LEVELING_PARAMETERS, resources: COLUMN_BASE_LEVELING_RESOURCES }))
      .toContain(COLUMN_BASE_LEVELING_SOURCE_ID);
  });

  it("allows documentary values to remain blank but exposes missing quantities", async () => {
    const target = COLUMN_BASE_LEVELING_TARGETS[1];
    const input = { ...columnBaseLevelingAcceptanceInputR1(target.contextKey) };
    for (const parameterId of ["concrete_mix_reference", "leveling_location", "target_elevation_and_slope_reference", "flatness_levelness_requirement_reference", "approved_leveling_method_designation", "leveling_method_statement_reference", "screed_guide_designation", "leveling_equipment_designation", "quality_plan_reference", "mobilization_scope_reference"]) delete input[parameterId];
    expect((await compileColumnBaseLevelingR1(input, { catalogId: target.catalogId })).preliminaryNeeds).toEqual([]);
    delete input.leveling_equipment_machine_h;
    expect((await compileColumnBaseLevelingR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([expect.objectContaining({ missing_parameter_ids: ["leveling_equipment_machine_h"] })]));
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = COLUMN_BASE_LEVELING_TARGETS[4];
    const input = columnBaseLevelingAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...columnBaseLevelingPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("leveled_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring repair identities", async () => {
    await expect(compileColumnBaseLevelingR1(columnBaseLevelingAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_standard",
    })).rejects.toThrow("COLUMN_BASE_LEVELING_CATALOG_UNSUPPORTED");
  });
});
