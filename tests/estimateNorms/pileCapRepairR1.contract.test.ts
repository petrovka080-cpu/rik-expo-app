import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pileCapRepairPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { PEDESTAL_REPAIR_FORMULAS } from "../../src/lib/estimate/v4/pedestalRepairR1";
import {
  PILE_CAP_REPAIR_FORMULAS,
  PILE_CAP_REPAIR_PARAMETERS,
  PILE_CAP_REPAIR_RESOURCES,
  PILE_CAP_REPAIR_SOURCE_ID,
  PILE_CAP_REPAIR_TARGETS,
  compilePileCapRepairR1,
  pileCapRepairAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapRepairR1";

function catalog(target: (typeof PILE_CAP_REPAIR_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pile-cap-repair-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PILE_CAP_REPAIR_PARAMETERS.map((parameter) => ({
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

describe("pile-cap structural-concrete repair canonical family", () => {
  it("compiles all seven exact schedules through the shared repair graph", async () => {
    for (const target of PILE_CAP_REPAIR_TARGETS) {
      const compiled = await compilePileCapRepairR1(
        { ...pileCapRepairAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(7);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(16);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pile-cap-repair-placement")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("anchor-hardware"))).toBe(false);
    }
  });

  it("reuses the repair graph with mandatory technology and direct quantities", async () => {
    expect(PILE_CAP_REPAIR_FORMULAS).toBe(PEDESTAL_REPAIR_FORMULAS);
    expect(PILE_CAP_REPAIR_PARAMETERS).toHaveLength(40);
    expect(PILE_CAP_REPAIR_RESOURCES).toHaveLength(16);
    expect(JSON.stringify({ parameters: PILE_CAP_REPAIR_PARAMETERS, resources: PILE_CAP_REPAIR_RESOURCES }))
      .toContain(PILE_CAP_REPAIR_SOURCE_ID);
    const target = PILE_CAP_REPAIR_TARGETS[0];
    const input = { ...pileCapRepairAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "condition_assessment_reference", "approved_repair_design_reference",
      "repair_method_statement_reference", "quality_plan_reference",
    ]) delete input[parameterId];
    expect((await compilePileCapRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    delete input.approved_repair_method_designation;
    expect((await compilePileCapRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
  });

  it("keeps incomplete selected branches visible instead of inventing them", async () => {
    const target = PILE_CAP_REPAIR_TARGETS[1];
    const input = { ...pileCapRepairAcceptanceInputR1(target.contextKey) };
    delete input.bonding_agent_designation;
    expect((await compilePileCapRepairR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    Object.assign(input, {
      bonding_agent_designation:
        pileCapRepairAcceptanceInputR1(target.contextKey).bonding_agent_designation,
    });
    delete input.bonding_agent_quantity_kg;
    const missingQuantity = await compilePileCapRepairR1(input, { catalogId: target.catalogId });
    expect(missingQuantity.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        missing_parameter_ids: expect.arrayContaining(["bonding_agent_quantity_kg"]),
        quantity: null,
      }),
    ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PILE_CAP_REPAIR_TARGETS[4];
    const input = pileCapRepairAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pileCapRepairPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("repair_scope_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim vibration or anchor-hardware repair identities", async () => {
    await expect(compilePileCapRepairR1(pileCapRepairAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_vibrate_standard",
    })).rejects.toThrow("PILE_CAP_REPAIR_CATALOG_UNSUPPORTED");
  });
});
