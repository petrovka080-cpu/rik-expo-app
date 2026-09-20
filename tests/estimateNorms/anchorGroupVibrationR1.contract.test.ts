import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  anchorGroupVibrationPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  ANCHOR_GROUP_VIBRATION_FORMULAS,
  ANCHOR_GROUP_VIBRATION_PARAMETERS,
  ANCHOR_GROUP_VIBRATION_RESOURCES,
  ANCHOR_GROUP_VIBRATION_SOURCE_ID,
  ANCHOR_GROUP_VIBRATION_TARGETS,
  anchorGroupVibrationAcceptanceInputR1,
  compileAnchorGroupVibrationR1,
} from "../../src/lib/estimate/v4/anchorGroupVibrationR1";
import { CONCRETE_SLAB_VIBRATION_FORMULAS } from "../../src/lib/estimate/v4/concreteSlabVibrationR1";

function catalog(target: (typeof ANCHOR_GROUP_VIBRATION_TARGETS)[number]):
CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-anchor-group-vibration-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: ANCHOR_GROUP_VIBRATION_PARAMETERS.map((parameter) => ({
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

describe("anchor-group concrete vibration canonical family", () => {
  it("compiles all seven identities through the shared vibration graph", async () => {
    for (const target of ANCHOR_GROUP_VIBRATION_TARGETS) {
      const input = anchorGroupVibrationAcceptanceInputR1(target.contextKey);
      const compiled = await compileAnchorGroupVibrationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(3);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(4);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:anchor-group-vibration"))
        .toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
    }
  });

  it("reuses the accepted ACI 309 formulas", () => {
    expect(ANCHOR_GROUP_VIBRATION_FORMULAS).toBe(CONCRETE_SLAB_VIBRATION_FORMULAS);
    expect(ANCHOR_GROUP_VIBRATION_PARAMETERS).toHaveLength(13);
    expect(ANCHOR_GROUP_VIBRATION_RESOURCES).toHaveLength(4);
    expect(JSON.stringify(ANCHOR_GROUP_VIBRATION_RESOURCES))
      .toContain(ANCHOR_GROUP_VIBRATION_SOURCE_ID);
  });

  it("allows documentary references to remain blank", async () => {
    const target = ANCHOR_GROUP_VIBRATION_TARGETS[0];
    const input = { ...anchorGroupVibrationAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference",
      "placement_location",
      "method_statement_reference",
      "equipment_schedule_reference",
      "quality_plan_reference",
      "mobilization_scope_reference",
    ]) delete input[parameterId];
    const compiled = await compileAnchorGroupVibrationR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual([]);
  });

  it("returns a parameter need instead of inventing a machine quantity", async () => {
    const target = ANCHOR_GROUP_VIBRATION_TARGETS[0];
    const input = { ...anchorGroupVibrationAcceptanceInputR1(target.contextKey) };
    delete input.internal_vibrator_machine_h;
    const compiled = await compileAnchorGroupVibrationR1(input, { catalogId: target.catalogId });
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ missing_parameter_ids: ["internal_vibrator_machine_h"] }),
    ]));
    expect(compiled.rows.some((row) => row.row_id === "equipment:concrete:internal-vibrator"))
      .toBe(false);
  });

  it("round-trips through the ordinary shared parameter screen", () => {
    const target = ANCHOR_GROUP_VIBRATION_TARGETS[5];
    const input = anchorGroupVibrationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...anchorGroupVibrationPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("consolidated_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });
});
