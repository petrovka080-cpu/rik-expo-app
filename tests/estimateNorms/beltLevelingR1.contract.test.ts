import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  beltLevelingPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  BELT_LEVELING_FORMULAS,
  BELT_LEVELING_PARAMETERS,
  BELT_LEVELING_RESOURCES,
  BELT_LEVELING_SOURCE_ID,
  BELT_LEVELING_TARGETS,
  beltLevelingAcceptanceInputR1,
  compileBeltLevelingR1,
} from "../../src/lib/estimate/v4/beltLevelingR1";
import { CONCRETE_SLAB_LEVELING_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabLevelingR1";

function catalog(target: (typeof BELT_LEVELING_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-belt-leveling-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: BELT_LEVELING_PARAMETERS.map((parameter) => ({
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

describe("monolithic-belt concrete leveling canonical family", () => {
  it("compiles all seven exact identities without unrelated concrete components", async () => {
    for (const target of BELT_LEVELING_TARGETS) {
      const input = beltLevelingAcceptanceInputR1(target.contextKey);
      const compiled = await compileBeltLevelingR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(5);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:belt-leveling"))
        .toBe(true);
    }
  });

  it("reuses the accepted ACI leveling graph", () => {
    expect(BELT_LEVELING_FORMULAS).toBe(CONCRETE_SLAB_LEVELING_FORMULAS);
    expect(BELT_LEVELING_PARAMETERS).toHaveLength(20);
    expect(BELT_LEVELING_FORMULAS).toHaveLength(6);
    expect(BELT_LEVELING_RESOURCES).toHaveLength(5);
    expect(JSON.stringify({
      parameters: BELT_LEVELING_PARAMETERS,
      resources: BELT_LEVELING_RESOURCES,
    })).toContain(BELT_LEVELING_SOURCE_ID);
  });

  it("allows unclear documentary references and designations to remain blank", async () => {
    const target = BELT_LEVELING_TARGETS[1];
    const input = { ...beltLevelingAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference",
      "leveling_location",
      "target_elevation_and_slope_reference",
      "flatness_levelness_requirement_reference",
      "approved_leveling_method_designation",
      "leveling_method_statement_reference",
      "screed_guide_designation",
      "leveling_equipment_designation",
      "quality_plan_reference",
      "mobilization_scope_reference",
    ]) delete input[parameterId];
    const compiled = await compileBeltLevelingR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
  });

  it("keeps a missing calculation quantity editable and out of completed rows", async () => {
    const target = BELT_LEVELING_TARGETS[1];
    const input = { ...beltLevelingAcceptanceInputR1(target.contextKey) };
    delete input.leveling_equipment_machine_h;
    const compiled = await compileBeltLevelingR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["leveling_equipment_machine_h"] }),
    ]));
    expect(compiled.rows.some((row) => row.row_id === "equipment:concrete:belt-leveling"))
      .toBe(false);
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = BELT_LEVELING_TARGETS[4];
    const input = beltLevelingAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...beltLevelingPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("leveled_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring embedded-item identities", async () => {
    await expect(compileBeltLevelingR1(
      beltLevelingAcceptanceInputR1("standard"),
      { catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_standard" },
    )).rejects.toThrow("BELT_LEVELING_CATALOG_UNSUPPORTED");
  });
});
