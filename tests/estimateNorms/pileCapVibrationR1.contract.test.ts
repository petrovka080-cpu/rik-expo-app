import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  extractConcretePlacementCanonicalParametersR1,
  pileCapVibrationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import { PEDESTAL_VIBRATION_FORMULAS } from "../../src/lib/estimate/v4/pedestalVibrationR1";
import {
  PILE_CAP_VIBRATION_FORMULAS,
  PILE_CAP_VIBRATION_PARAMETERS,
  PILE_CAP_VIBRATION_RESOURCES,
  PILE_CAP_VIBRATION_SOURCE_ID,
  PILE_CAP_VIBRATION_TARGETS,
  compilePileCapVibrationR1,
  pileCapVibrationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/pileCapVibrationR1";

function catalog(target: (typeof PILE_CAP_VIBRATION_TARGETS)[number]): CanonicalEstimateCatalogItem {
  return {
    catalogId: target.catalogId,
    releaseId: "prepared-pile-cap-vibration-test",
    namespace: "global",
    domain: "concrete",
    workKey: target.catalogId,
    titleRu: target.titleRu,
    definitionVersion: 4,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PILE_CAP_VIBRATION_PARAMETERS.map((parameter) => ({
      parameterId: parameter.parameter_id,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue: parameter.default_value,
      constraints: parameter.constraints_json ?? {},
      visibilityRole: "USER_INPUT",
      valueSourceRole: String(parameter.truth_metadata.value_source_role ?? "") as never,
      preliminaryCompilationAllowed:
        parameter.truth_metadata.preliminary_compilation_allowed === true,
      formulaConsumers: [],
      resourceBranchConsumers: [],
    })),
  };
}

describe("pile-cap concrete vibration canonical family", () => {
  it("compiles all seven exact identities through the shared core", async () => {
    for (const target of PILE_CAP_VIBRATION_TARGETS) {
      const compiled = await compilePileCapVibrationR1(
        { ...pileCapVibrationAcceptanceInputR1(target.contextKey) },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBeGreaterThanOrEqual(2);
      expect(compiled.totals.includedRowCount).toBeLessThanOrEqual(4);
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:pile-cap-vibration")).toBe(true);
      expect(compiled.rows.find((row) => row.row_id === "work:concrete:pile-cap-vibration"))
        .toMatchObject({ unit_id: "m3" });
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("reinforcement"))).toBe(false);
    }
  });

  it("reuses the accepted ACI 309 vibration graph", () => {
    expect(PILE_CAP_VIBRATION_FORMULAS).toEqual(
      PEDESTAL_VIBRATION_FORMULAS.filter(
        (formula) => formula.formula_id !== "slab_vibration_labor_v1",
      ),
    );
    expect(PILE_CAP_VIBRATION_FORMULAS.map((formula) => formula.formula_id))
      .toContain("slab_vibration_scope_volume_v1");
    expect(PILE_CAP_VIBRATION_PARAMETERS).toHaveLength(12);
    expect(PILE_CAP_VIBRATION_RESOURCES).toHaveLength(4);
    expect(JSON.stringify({ parameters: PILE_CAP_VIBRATION_PARAMETERS, resources: PILE_CAP_VIBRATION_RESOURCES }))
      .toContain(PILE_CAP_VIBRATION_SOURCE_ID);
  });

  it("allows documentary references to remain blank", async () => {
    const target = PILE_CAP_VIBRATION_TARGETS[1];
    const input = { ...pileCapVibrationAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "concrete_mix_reference", "method_statement_reference",
      "equipment_schedule_reference", "quality_plan_reference",
    ]) delete input[parameterId];
    expect((await compilePileCapVibrationR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual([]);
  });

  it("returns a useful volume-based first estimate before project schedules are supplied", async () => {
    const target = PILE_CAP_VIBRATION_TARGETS[0];
    const compiled = await compilePileCapVibrationR1(
      { consolidated_concrete_volume_m3: 12 },
      { catalogId: target.catalogId },
    );

    expect(compiled.rows).toHaveLength(1);
    expect(compiled.rows[0]).toMatchObject({
      row_id: "work:concrete:pile-cap-vibration",
      title_ru: "Виброуплотнение свежеуложенного бетона ростверка",
      unit_id: "m3",
      quantity: "12",
      unit_price: null,
      amount: null,
      calculation_trace: {
        titleSpecification: {
          missingParameterIds: ["placement_location", "approved_consolidation_method"],
        },
      },
    });
    expect(compiled.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual([
      "delivery:concrete:internal-vibrator-mobilization",
      "equipment:concrete:internal-vibrator",
      "service:concrete:pile-cap-vibration-quality-control",
    ]);
  });

  it("keeps title details refinable without blocking rows and numeric project data unresolved", async () => {
    const target = PILE_CAP_VIBRATION_TARGETS[1];
    const input = { ...pileCapVibrationAcceptanceInputR1(target.contextKey) };
    for (const parameterId of [
      "approved_consolidation_method", "placement_location",
      "mobilization_scope_reference", "internal_vibrator_machine_h",
      "quality_control_document_count",
    ]) delete input[parameterId];
    const compiled = await compilePileCapVibrationR1(input, { catalogId: target.catalogId });
    const needs = compiled.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids);
    expect(needs).toEqual(expect.arrayContaining([
      "internal_vibrator_machine_h", "quality_control_document_count",
    ]));
    expect(needs).not.toEqual(expect.arrayContaining([
      "approved_consolidation_method", "placement_location", "mobilization_scope_reference",
    ]));
    expect(compiled.rows.find((row) => row.row_id === "work:concrete:pile-cap-vibration"))
      .toMatchObject({
        calculation_trace: {
          titleSpecification: {
            missingParameterIds: ["placement_location", "approved_consolidation_method"],
          },
        },
      });
  });

  it("round-trips values through the ordinary consumer parameter screen", () => {
    const target = PILE_CAP_VIBRATION_TARGETS[4];
    const input = pileCapVibrationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...pileCapVibrationPromptDetailsR1(input)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({ catalogId: target.catalogId, text: prompt }))
      .toEqual(input);
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(target), prompt });
    expect(plan.primaryMeasureParameterId).toBe("consolidated_concrete_volume_m3");
    expect(plan.parameters).toEqual(input);
  });

  it("builds the ordinary first-estimate plan from only the known volume", () => {
    const target = PILE_CAP_VIBRATION_TARGETS[0];
    const plan = buildCanonicalBaselinePlan({
      catalog: catalog(target),
      prompt: `${target.titleRu} 12 м3`,
    });

    expect(plan).toMatchObject({
      primaryMeasureParameterId: "consolidated_concrete_volume_m3",
      parameters: { consolidated_concrete_volume_m3: "12" },
    });
  });

  it("does not claim neighboring repair or leveling identities", async () => {
    await expect(compilePileCapVibrationR1(pileCapVibrationAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_pile_cap_repair_standard",
    })).rejects.toThrow("PILE_CAP_VIBRATION_CATALOG_UNSUPPORTED");
  });
});
