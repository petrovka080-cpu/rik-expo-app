import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pedestalRepairPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { COLUMN_BASE_REPAIR_FORMULAS } from "../../src/lib/estimate/v4/columnBaseRepairR1";
import {
  PEDESTAL_REPAIR_FORMULAS,
  PEDESTAL_REPAIR_PARAMETERS,
  PEDESTAL_REPAIR_RESOURCES,
  PEDESTAL_REPAIR_SOURCE_ID,
  PEDESTAL_REPAIR_TARGETS,
  compilePedestalRepairR1,
  pedestalRepairAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalRepairR1";

function catalog(target: (typeof PEDESTAL_REPAIR_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pedestal-repair-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PEDESTAL_REPAIR_PARAMETERS.map((parameter) => ({
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

describe("pedestal structural-concrete repair canonical family", () => {
  it("compiles all seven exact schedules through the shared repair graph", async () => {
    for (const target of PEDESTAL_REPAIR_TARGETS) {
      const compiled = await compilePedestalRepairR1(
        { ...pedestalRepairAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(7);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(16);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pedestal-repair-placement")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("anchor-hardware"))).toBe(false);
    }
  });

  it("reuses the ACI 562/546 graph with mandatory technology and direct quantities", async () => {
    expect(PEDESTAL_REPAIR_FORMULAS).toBe(COLUMN_BASE_REPAIR_FORMULAS);
    expect(PEDESTAL_REPAIR_PARAMETERS).toHaveLength(40);
    expect(PEDESTAL_REPAIR_RESOURCES).toHaveLength(16);
    expect(JSON.stringify({ parameters: PEDESTAL_REPAIR_PARAMETERS, resources: PEDESTAL_REPAIR_RESOURCES }))
      .toContain(PEDESTAL_REPAIR_SOURCE_ID);
    const target = PEDESTAL_REPAIR_TARGETS[0];
    const input = { ...pedestalRepairAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "condition_assessment_reference", "approved_repair_design_reference",
      "repair_method_statement_reference", "quality_plan_reference",
    ]) delete input[parameterId];
    expect((await compilePedestalRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    delete input.approved_repair_method_designation;
    expect((await compilePedestalRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
  });

  it("keeps incomplete selected branches visible instead of inventing them", async () => {
    const target = PEDESTAL_REPAIR_TARGETS[1];
    const input = { ...pedestalRepairAcceptanceInputR1(target.contextKey) };
    delete input.bonding_agent_designation;
    expect((await compilePedestalRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    Object.assign(input, {
      bonding_agent_designation:
        pedestalRepairAcceptanceInputR1(target.contextKey).bonding_agent_designation,
    });
    delete input.bonding_agent_quantity_kg;
    const missingQuantity = await compilePedestalRepairR1(input, { catalogId: target.catalogId });
    expect(missingQuantity.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["bonding_agent_quantity_kg"]),
        quantity: null,
      }),
    ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PEDESTAL_REPAIR_TARGETS[4];
    const input = pedestalRepairAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pedestalRepairPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("repair_scope_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring vibration or anchor-hardware repair identities", async () => {
    const input = pedestalRepairAcceptanceInputR1("standard");
    await expect(compilePedestalRepairR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_vibrate_standard",
    })).rejects.toThrow("PEDESTAL_REPAIR_CATALOG_UNSUPPORTED");
  });
});
