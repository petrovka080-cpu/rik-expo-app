import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  concreteSlabVibrationPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "../../src/lib/estimate/ownedDomain/concretePlacementProductionBindingR1";
import {
  CONCRETE_SLAB_VIBRATION_FORMULAS,
  CONCRETE_SLAB_VIBRATION_PARAMETERS,
  CONCRETE_SLAB_VIBRATION_RESOURCES,
  CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  CONCRETE_SLAB_VIBRATION_TARGETS,
  SLAB_FOUNDATION_VIBRATION_TARGETS,
  compileConcreteSlabVibrationR1,
  concreteSlabVibrationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/concreteSlabVibrationR1";

describe("concrete slab vibration canonical family", () => {
  it("compiles all seven catalog identities through the shared canonical core", async () => {
    const fixtures = new Set<string>();
    for (const target of CONCRETE_SLAB_VIBRATION_TARGETS) {
      const input = concreteSlabVibrationAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabVibrationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBe(
        input.equipment_mobilization_pricing_mode === "SEPARATE" ? 4 : 3,
      );
      expect(compiled.totals.unpricedRowCount).toBe(compiled.totals.includedRowCount);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix"))
        .toBe(false);
      fixtures.add(JSON.stringify(input));
    }
    expect(fixtures.size).toBe(7);
  });

  it("recalculates only direct project-schedule quantities", async () => {
    const target = CONCRETE_SLAB_VIBRATION_TARGETS[0];
    const input = concreteSlabVibrationAcceptanceInputR1(target.contextKey);
    const changed = await compileConcreteSlabVibrationR1({
      ...input,
      vibration_worker_h: 19,
      internal_vibrator_machine_h: 7,
      equipment_mobilization_trip_count: 4,
    }, { catalogId: target.catalogId });
    const quantity = (rowId: string) => Number(
      changed.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(quantity("work:concrete:slab-vibration")).toBe(19);
    expect(quantity("equipment:concrete:internal-vibrator")).toBe(7);
    expect(quantity("delivery:concrete:internal-vibrator-mobilization")).toBe(4);
  });

  it("keeps the seven MASTER slab-foundation aliases on the same narrow operation owner", async () => {
    expect(SLAB_FOUNDATION_VIBRATION_TARGETS).toHaveLength(7);
    for (const target of SLAB_FOUNDATION_VIBRATION_TARGETS) {
      const input = concreteSlabVibrationAcceptanceInputR1(target.contextKey);
      const compiled = await compileConcreteSlabVibrationR1(
        { ...input },
        { catalogId: target.catalogId },
      );
      const serialized = JSON.stringify(compiled.rows).toLowerCase();
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.totals.includedRowCount).toBe(
        input.equipment_mobilization_pricing_mode === "SEPARATE" ? 4 : 3,
      );
      expect(serialized).not.toMatch(/арматур|опалуб|песчан|щебен|гидроизоляц/u);
    }
  });

  it("binds ACI 309 only as applicability guidance and excludes legacy fake factors", () => {
    const serialized = JSON.stringify({
      parameters: CONCRETE_SLAB_VIBRATION_PARAMETERS,
      formulas: CONCRETE_SLAB_VIBRATION_FORMULAS,
      resources: CONCRETE_SLAB_VIBRATION_RESOURCES,
    });
    expect(serialized).toContain(CONCRETE_SLAB_VIBRATION_SOURCE_ID);
    expect(serialized).toContain("universal_productivity_claimed");
    expect(serialized).toContain("APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE");
    expect(serialized).not.toContain("src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(serialized).not.toContain("src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1");
    expect(CONCRETE_SLAB_VIBRATION_PARAMETERS).toHaveLength(13);
    expect(CONCRETE_SLAB_VIBRATION_FORMULAS).toHaveLength(5);
    expect(CONCRETE_SLAB_VIBRATION_RESOURCES).toHaveLength(4);
  });

  it("defers only the dependent row on a missing schedule and rejects an invalid method", async () => {
    const target = CONCRETE_SLAB_VIBRATION_TARGETS[0];
    const input = concreteSlabVibrationAcceptanceInputR1(target.contextKey);
    const { equipment_schedule_reference: _missing, ...withoutSchedule } = input;
    const preliminary = await compileConcreteSlabVibrationR1(
      withoutSchedule,
      { catalogId: target.catalogId },
    );
    expect(preliminary.rows.map((row) => row.row_id)).not.toContain(
      "equipment:concrete:internal-vibrator",
    );
    expect(preliminary.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: "equipment:concrete:internal-vibrator",
        missing_parameter_ids: expect.arrayContaining(["equipment_schedule_reference"]),
      }),
    ]));
    await expect(compileConcreteSlabVibrationR1({
      ...input,
      approved_consolidation_method: "SURFACE_VIBRATION",
    }, { catalogId: target.catalogId })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });

  it("round-trips through the ordinary consumer binding and baseline builder", () => {
    const target = CONCRETE_SLAB_VIBRATION_TARGETS[0];
    const fixture = concreteSlabVibrationAcceptanceInputR1(target.contextKey);
    const prompt = [target.titleRu, ...concreteSlabVibrationPromptDetailsR1(fixture)].join("\n");
    expect(extractConcretePlacementCanonicalParametersR1({
      catalogId: target.catalogId,
      text: prompt,
    })).toEqual(fixture);
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: target.catalogId,
      releaseId: "prepared-concrete-slab-vibration-test",
      namespace: "global",
      domain: "concrete",
      workKey: target.catalogId,
      titleRu: target.titleRu,
      definitionVersion: 4,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: CONCRETE_SLAB_VIBRATION_PARAMETERS.map((parameter) => ({
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
    const plan = buildCanonicalBaselinePlan({ catalog, prompt });
    expect(plan.primaryMeasureParameterId).toBe("consolidated_concrete_volume_m3");
    expect(plan.parameters).toEqual(fixture);
  });
});
