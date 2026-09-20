import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pedestalVibrationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { COLUMN_BASE_VIBRATION_FORMULAS } from "../../src/lib/estimate/v4/columnBaseVibrationR1";
import {
  PEDESTAL_VIBRATION_FORMULAS,
  PEDESTAL_VIBRATION_PARAMETERS,
  PEDESTAL_VIBRATION_RESOURCES,
  PEDESTAL_VIBRATION_SOURCE_ID,
  PEDESTAL_VIBRATION_TARGETS,
  compilePedestalVibrationR1,
  pedestalVibrationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pedestalVibrationR1";

function catalog(target: (typeof PEDESTAL_VIBRATION_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pedestal-vibration-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PEDESTAL_VIBRATION_PARAMETERS.map((parameter) => ({
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

describe("pedestal concrete vibration canonical family", () => {
  it("compiles all seven exact identities through the shared core", async () => {
    for (const target of PEDESTAL_VIBRATION_TARGETS) {
      const compiled = await compilePedestalVibrationR1(
        { ...pedestalVibrationAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(4);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pedestal-vibration")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
    }
  });

  it("reuses the accepted ACI 309 vibration graph", () => {
    expect(PEDESTAL_VIBRATION_FORMULAS).toBe(COLUMN_BASE_VIBRATION_FORMULAS);
    expect(PEDESTAL_VIBRATION_PARAMETERS).toHaveLength(13);
    expect(PEDESTAL_VIBRATION_RESOURCES).toHaveLength(4);
    expect(JSON.stringify({ parameters: PEDESTAL_VIBRATION_PARAMETERS, resources: PEDESTAL_VIBRATION_RESOURCES }))
      .toContain(PEDESTAL_VIBRATION_SOURCE_ID);
  });

  it("allows documentary values to remain blank but exposes missing direct hours", async () => {
    const target = PEDESTAL_VIBRATION_TARGETS[1];
    const input = { ...pedestalVibrationAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference", "placement_location", "method_statement_reference",
      "equipment_schedule_reference", "quality_plan_reference", "mobilization_scope_reference",
    ]) delete input[parameterId];
    expect((await compilePedestalVibrationR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
    delete input.vibration_worker_h;
    expect((await compilePedestalVibrationR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ missing_parameter_ids: ["vibration_worker_h"] }),
      ]));
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PEDESTAL_VIBRATION_TARGETS[4];
    const input = pedestalVibrationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pedestalVibrationPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("consolidated_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("does not claim neighboring repair or leveling identities", async () => {
    const input = pedestalVibrationAcceptanceInputR1("standard");
    await expect(compilePedestalVibrationR1(input, {
      catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_repair_standard",
    })).rejects.toThrow("PEDESTAL_VIBRATION_CATALOG_UNSUPPORTED");
  });
});
