import {
  S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS,
  S2723_BULKHEAD_FULL_CYCLE_ROWS,
  compileS2723BulkheadFullCycleProfile,
} from "../../scripts/estimate/r5/s2723BulkheadFullCycleProfile";

function quantity(
  rows: Awaited<ReturnType<typeof compileS2723BulkheadFullCycleProfile>>["rows"],
  suffix: string,
): string | undefined {
  return rows.find((row) => row.row_id.endsWith(`:${suffix}`))?.quantity;
}

describe("S27.23 complete 50 m2 drywall bulkhead", () => {
  it("combines the detailed frame with cladding, corners, joints and surface completion", async () => {
    const result = await compileS2723BulkheadFullCycleProfile({
      submittedParameters: { area_m2: 50 },
    });
    const rowIds = new Set(result.rows.map((row) => row.row_id));

    expect(S2723_BULKHEAD_FULL_CYCLE_ROWS.parameterDefinitions).toHaveLength(49);
    expect(S2723_BULKHEAD_FULL_CYCLE_ROWS.formulaDefinitions).toHaveLength(55);
    expect(S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions).toHaveLength(55);
    expect(result.rows).toHaveLength(53);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(28);
    for (const requiredRows of Object.values(S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS)) {
      for (const rowId of requiredRows) expect(rowIds).toContain(rowId);
    }
  });

  it("calculates the frame, boards, fasteners, corners, packages and remainders", async () => {
    const result = await compileS2723BulkheadFullCycleProfile({
      submittedParameters: { area_m2: 50 },
    });

    expect(quantity(result.rows, "longitudinal_profile_packages")).toBe("28");
    expect(quantity(result.rows, "horizontal_profile_packages")).toBe("22");
    expect(quantity(result.rows, "vertical_profile_packages")).toBe("15");
    expect(quantity(result.rows, "profile_intersection_connectors")).toBe("164");
    expect(quantity(result.rows, "structural_support_anchors")).toBe("96");
    expect(quantity(result.rows, "board_sheets")).toBe("22");
    expect(quantity(result.rows, "board_net_m2")).toBe("50");
    expect(quantity(result.rows, "board_order_m2")).toBe("52.8");
    expect(quantity(result.rows, "board_remainder_m2")).toBe("2.8");
    expect(quantity(result.rows, "board_screw_packages")).toBe("2");
    expect(quantity(result.rows, "external_corner_profiles")).toBe("14");
    expect(quantity(result.rows, "external_corner_installation")).toBe("40");
    expect(quantity(result.rows, "joint_compound_bags")).toBe("1");
    expect(quantity(result.rows, "joint_tape_rolls")).toBe("1");
    expect(quantity(result.rows, "separation_tape_rolls")).toBe("1");
    expect(quantity(result.rows, "primer_cans")).toBe("1");
    expect(quantity(result.rows, "abrasive_items")).toBe("2");
  });

  it("recalculates the related frame and finish quantities after geometry changes", async () => {
    const changed = await compileS2723BulkheadFullCycleProfile({
      submittedParameters: { area_m2: 60, bulkhead_length_m: 24 },
    });

    expect(quantity(changed.rows, "longitudinal_profile_packages")).toBe("34");
    expect(quantity(changed.rows, "board_sheets")).toBe("27");
    expect(quantity(changed.rows, "external_corner_profiles")).toBe("17");
    expect(quantity(changed.rows, "joint_compound_bags")).toBe("2");
    expect(quantity(changed.rows, "joint_tape_rolls")).toBe("2");
  });

  it("keeps reinforcement conditional and owns shared logistics only once", async () => {
    const baseline = await compileS2723BulkheadFullCycleProfile({
      submittedParameters: { area_m2: 50 },
    });
    const reinforced = await compileS2723BulkheadFullCycleProfile({
      submittedParameters: { area_m2: 50, reinforcement_profile_length_m: 6 },
    });

    expect(quantity(baseline.rows, "opening_reinforcement_profile_packages")).toBeUndefined();
    expect(quantity(reinforced.rows, "opening_reinforcement_profile_packages")).toBe("3");
    expect(quantity(reinforced.rows, "opening_reinforcement_installation")).toBe("6");
    expect(baseline.rows.filter((row) => row.row_id.endsWith(":material_delivery"))).toHaveLength(1);
    expect(baseline.rows.filter((row) => row.row_id.endsWith(":waste_removal"))).toHaveLength(1);
  });

  it("has unique parameter, formula and resource identities", () => {
    for (const values of [
      S2723_BULKHEAD_FULL_CYCLE_ROWS.parameterDefinitions.map((row) => row.parameter_id),
      S2723_BULKHEAD_FULL_CYCLE_ROWS.formulaDefinitions.map((row) => row.formula_id),
      S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions.map((row) => row.row_id),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
