import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  compileStairsConcreteVibrationHighLoadS2723,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  stairsConcreteVibrationHighLoadMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationHighLoadS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-high-load-s27-23.json",
);
const PREFIX = "concrete-stairs-vibration-high-load:";

function quantity(
  result: Awaited<ReturnType<typeof compileStairsConcreteVibrationHighLoadS2723>>,
  rowId: string,
): string | undefined {
  return result.rows.find((row) => row.row_id === rowId)?.quantity;
}

describe("S27.23 high-load stair-concrete vibration", () => {
  it("binds an exact project-gated source pack without a high-load multiplier", () => {
    expect(createHash("sha256").update(readFileSync(SOURCE_PACK_PATH)).digest("hex"))
      .toBe(STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256);
    expect(STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS).toHaveLength(26);
    expect(STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS).toHaveLength(18);
    expect(STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES).toHaveLength(25);
    expect(STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.every((row) =>
      row.row_id.startsWith(PREFIX))).toBe(true);
  });

  it("keeps geometry, continuity and equipment-dependent rows visible", async () => {
    const first = await compileStairsConcreteVibrationHighLoadS2723({
      ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT,
    });
    expect(first.rows).toHaveLength(2);
    expect(first.preliminaryNeeds).toHaveLength(23);
    expect(first.rows.filter((row) => row.included_in_procurement)).toHaveLength(0);
    expect(new Set(first.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids))).toEqual(
      new Set([
        "high_load_placement_continuity_plan_reference",
        "high_load_geometry_reinforcement_layout_reference",
        "high_load_equipment_selection_plan_reference",
      ]),
    );
    expect(first.preliminaryNeeds.map((need) => need.row_id)).toEqual(expect.arrayContaining([
      `${PREFIX}03:operation:internal-vibration`,
      `${PREFIX}03:equipment:active-vibrator`,
      `${PREFIX}03:equipment:backup-vibrator`,
      `${PREFIX}01:control:geometry-reinforcement-layout`,
    ]));
  });

  it("calculates the shared atomic core only after project facts", async () => {
    const complete = await compileStairsConcreteVibrationHighLoadS2723({
      ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileStairsConcreteVibrationHighLoadS2723({
      ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 30,
    });
    expect(complete.rows).toHaveLength(25);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(complete, `${PREFIX}03:labor:vibration-crew`)).toBe("30");
    expect(quantity(complete, `${PREFIX}03:equipment:active-vibrator`)).toBe("8");
    expect(quantity(complete, `${PREFIX}03:equipment:rental-shifts`)).toBe("1");
    expect(quantity(complete, `${PREFIX}03:material:electricity`)).toBe("7.04");
    expect(quantity(complete, `${PREFIX}04:labor:cleaning`)).toBe("0.25");
    expect(quantity(complete, `${PREFIX}04:consumable:cleaning-water`)).toBe("0.025");

    expect(quantity(changed, `${PREFIX}03:labor:vibration-crew`)).toBe("37.5");
    expect(quantity(changed, `${PREFIX}03:equipment:active-vibrator`)).toBe("10");
    expect(quantity(changed, `${PREFIX}03:equipment:rental-shifts`)).toBe("2");
    expect(quantity(changed, `${PREFIX}03:material:electricity`)).toBe("8.8");
    expect(quantity(changed, `${PREFIX}04:labor:cleaning`)).toBe("0.25");
    expect(quantity(changed, `${PREFIX}04:consumable:cleaning-water`)).toBe("0.025");

    const active = STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}03:equipment:active-vibrator`)!;
    const rental = STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}03:equipment:rental-shifts`)!;
    expect(active.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    expect(rental.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
    expect(complete.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id))).toBe(false);
  });

  it("does not disconnect any project gate or required row", async () => {
    const parameterIds = [
      "high_load_placement_continuity_plan_reference",
      "high_load_geometry_reinforcement_layout_reference",
      "high_load_equipment_selection_plan_reference",
    ] as const;
    for (const parameterId of parameterIds) {
      const input = { ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT };
      delete (input as Record<string, unknown>)[parameterId];
      const result = await compileStairsConcreteVibrationHighLoadS2723(input);
      expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
      expect(result.preliminaryNeeds.every((need) =>
        need.missing_parameter_ids.includes(parameterId))).toBe(true);
    }
    const allRows = new Set(
      STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.map((row) => row.row_id),
    );
    expect(stairsConcreteVibrationHighLoadMissingRows(allRows)).toEqual([]);
    for (const rowId of allRows) {
      const mutated = new Set(allRows);
      mutated.delete(rowId);
      expect(stairsConcreteVibrationHighLoadMissingRows(mutated)).toContain(rowId);
    }
  });
});
