import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  beltRepairPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  BELT_REPAIR_FORMULAS,
  BELT_REPAIR_PARAMETERS,
  BELT_REPAIR_RESOURCES,
  BELT_REPAIR_SOURCE_ID,
  BELT_REPAIR_TARGETS,
  beltRepairAcceptanceInputR1,
  compileBeltRepairR1,
} from "../../src/lib/estimate/v4/beltRepairR1";
import { CONCRETE_SLAB_REPAIR_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabRepairR1";

function catalog(target: (typeof BELT_REPAIR_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-belt-repair-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: BELT_REPAIR_PARAMETERS.map((parameter) => ({
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

describe("monolithic-belt concrete repair canonical family", () => {
  it("compiles all seven exact schedules without full-placement components", async () => {
    for (const target of BELT_REPAIR_TARGETS) {
      const input = beltRepairAcceptanceInputR1(target.contextKey);
      const compiled = await compileBeltRepairR1(input, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(7);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(16);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:belt-repair-placement"))
        .toBe(true);
    }
  });

  it("reuses the accepted ACI 562/546 repair graph", () => {
    expect(BELT_REPAIR_FORMULAS).toBe(CONCRETE_SLAB_REPAIR_FORMULAS);
    expect(BELT_REPAIR_PARAMETERS).toHaveLength(40);
    expect(BELT_REPAIR_FORMULAS).toHaveLength(18);
    expect(BELT_REPAIR_RESOURCES).toHaveLength(16);
    expect(JSON.stringify({ parameters: BELT_REPAIR_PARAMETERS, resources: BELT_REPAIR_RESOURCES }))
      .toContain(BELT_REPAIR_SOURCE_ID);
  });

  it("allows unclear documentary labels to remain blank", async () => {
    const target = BELT_REPAIR_TARGETS[0];
    const input = { ...beltRepairAcceptanceInputR1(target.contextKey) };
    for (const parameter of BELT_REPAIR_PARAMETERS) {
      if (parameter.value_type === "text") delete input[parameter.parameter_id];
    }
    const compiled = await compileBeltRepairR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.some((row) => row.row_id === "work:concrete:belt-repair-placement"))
      .toBe(true);
  });

  it("keeps a missing selected calculation quantity visible", async () => {
    const target = BELT_REPAIR_TARGETS[0];
    const input = { ...beltRepairAcceptanceInputR1(target.contextKey) };
    delete input.bonding_agent_quantity_kg;
    const compiled = await compileBeltRepairR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["bonding_agent_quantity_kg"]),
        quantity: null,
      }),
    ]));
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = BELT_REPAIR_TARGETS[6];
    const input = beltRepairAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...beltRepairPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("repair_scope_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("rejects neighboring leveling identities", async () => {
    await expect(compileBeltRepairR1(beltRepairAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_standard",
    })).rejects.toThrow("BELT_REPAIR_CATALOG_UNSUPPORTED");
  });
});
