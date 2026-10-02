import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_SUMMARY,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID,
  compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2,
  validateAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2";
import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1";

describe("KRER 46-04-011-13 signed 5 mm thickness adjustment for rate 12", () => {
  test("enhances the same four catalog identities without a standalone rate-13 work", () => {
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SOURCE_SUMMARY)
      .toMatchObject({ exactRates: ["46-04-011-12", "46-04-011-13"], standaloneRate13WorkCreated: false });
  });

  test("owns one visible optional signed integer parameter and keeps the 4/5/5 shape", () => {
    expect(validateAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46Completeness()).toBe(true);
    expect([
      AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS.length,
      AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_FORMULAS.length,
      AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES.length,
    ]).toEqual([4, 5, 5]);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_PARAMETERS[3])
      .toMatchObject({
        parameter_id: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID,
        value_type: "integer",
        required: false,
        default_value: null,
        constraints_json: { min: -4 },
        truth_metadata: { visibility_role: "USER_INPUT", hidden_default_forbidden: false },
      });
  });

  test("omitted or zero adjustment preserves the exact 25 mm base rate", async () => {
    const omitted = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
    });
    const explicitZero = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
    });
    expect(omitted.rows.map((row) => row.quantity)).toEqual(["100", "28.54", "5.58", "5.58", "11.16"]);
    expect(explicitZero.rows.map((row) => row.quantity)).toEqual(omitted.rows.map((row) => row.quantity));
    expect(omitted.parameters[AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]).toBe(0);
  });

  test("one positive step applies the exact 30 mm resource rates", async () => {
    const compiled = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: 1,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["100", "32.04", "6.68", "6.68", "13.36"]);
  });

  test("one negative step applies the exact 20 mm resource rates", async () => {
    const compiled = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: -1,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["100", "25.04", "4.48", "4.48", "8.96"]);
  });

  test("acceptance fixture applies +5 mm once to 35.5 m2", async () => {
    const compiled = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["35.5", "11.3742", "2.3714", "2.3714", "4.7428"]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS))(
    "%s variant applies the same official modifier",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2(
        { ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_ACCEPTANCE_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual(["35.5", "11.3742", "2.3714", "2.3714", "4.7428"]);
    },
  );

  test("rejects fractional steps and thickness below 5 mm", async () => {
    await expect(compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: 0.5,
    })).rejects.toThrow(/invalid integer/u);
    await expect(compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_SHORT_INPUT,
      [AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_STEPS_PARAMETER_ID]: -5,
    })).rejects.toThrow(/below minimum/u);
  });

  test("keeps missing applicability preliminary rather than inventing it", async () => {
    const incomplete = await compileAggressiveEnvironmentCementOrConcreteFloorThicknessAdjustmentKrer46R2({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
  });

  test("records rate 13 as an included modifier and no duplicate row", () => {
    const modifier = AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries
      .find((entry) => entry.operationId === "thickness_adjustment_rate_13");
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(9);
    expect(modifier).toMatchObject({
      detailPrinciple: "NORMATIVE_MODIFIER_INCLUDED_IN_EXISTING_RESOURCE_ROWS",
      priceRelation: "INCLUDED_IN_PARENT",
      resolution: { kind: "INCLUDED_IN_PARENT" },
    });
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES).toHaveLength(5);
  });

  test("binds every adjusted resource to both exact official rate columns", () => {
    for (const resource of AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_THICKNESS_ADJUSTMENT_KRER46_RESOURCES.slice(1)) {
      expect(resource.resource_graph.quantityBasis).toBe(
        "CONFIRMED_AREA_TIMES_BASE_RATE_12_PLUS_SIGNED_RATE_13_PER_5_MM_STEP_PER_100_M2",
      );
      expect(resource.source_metadata).toMatchObject({
        thicknessAdjustmentSourceRate: "46-04-011-13",
        normativeRateExpression: "46-04-011-12 + signed_steps_5mm * 46-04-011-13",
      });
      expect(JSON.stringify(resource.source_metadata)).toMatch(/46-04-011-12.*46-04-011-13|46-04-011-13.*46-04-011-12/u);
    }
  });
});
