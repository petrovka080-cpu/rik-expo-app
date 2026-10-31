import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationStandardS2723,
  stairsConcreteVibrationStandardMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationStandardS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quantity(rows: readonly Record<string, any>[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("S27.23 stair concrete internal vibration", () => {
  test("binds immutable official-source evidence and an independent atomic completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS.length,
      STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS.length,
      STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([23, 18, 22]);

    const rowIds = new Set(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(rowIds.size).toBe(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.length);
    expect(stairsConcreteVibrationStandardMissingRows(rowIds)).toEqual([]);
    for (const rowId of rowIds) {
      const mutated = new Set(rowIds);
      mutated.delete(rowId);
      expect(stairsConcreteVibrationStandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("returns a complete first estimate from volume and keeps atomic scope boundaries", async () => {
    const result = await compileStairsConcreteVibrationStandardS2723({
      ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT,
    });
    expect(result.rows).toHaveLength(22);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:labor:vibration-crew"))
      .toBe(15);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:equipment:active-vibrator"))
      .toBe(4);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:equipment:rental-shifts"))
      .toBe(1);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:material:electricity"))
      .toBe(3.52);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:consumable:cleaning-water"))
      .toBe(0.025);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:labor:cleaning"))
      .toBe(0.25);
    const machineUse = STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.find(
      (row) => row.row_id === "concrete-stairs-vibration:03:equipment:active-vibrator",
    );
    const rental = STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.find(
      (row) => row.row_id === "concrete-stairs-vibration:03:equipment:rental-shifts",
    );
    expect(machineUse?.resource_graph).toEqual(expect.objectContaining({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    }));
    expect(rental?.resource_graph).toEqual(expect.objectContaining({
      costTreatment: "OWN_COST",
      payable: true,
    }));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
    expect(result.rows.some((row) => /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id)))
      .toBe(false);
  });

  test("recalculates labor, mechanism, energy and cleaning quantities after volume change", async () => {
    const result = await compileStairsConcreteVibrationStandardS2723({
      ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 18,
    });
    expect(result.rows).toHaveLength(22);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:labor:vibration-crew"))
      .toBe(22.5);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:equipment:active-vibrator"))
      .toBe(6);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:material:electricity"))
      .toBe(5.28);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:consumable:cleaning-water"))
      .toBe(0.025);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:labor:cleaning"))
      .toBe(0.25);
  });
});

describe("shared stair vibration quantities across measured volumes", () => {
  test.each([
    [3, 3.75, 1, 0.88, 1],
    [6, 7.5, 2, 1.76, 1],
    [54, 67.5, 18, 15.84, 3],
    [72, 90, 24, 21.12, 3],
  ])("%s m3 preserves labor, vibrator, electricity and cleaning quantities", async (
    volumeM3, laborHours, vibratorHours, electricityKwh, rentalShifts,
  ) => {
    const result = await compileStairsConcreteVibrationStandardS2723({
      ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: volumeM3,
    });
    expect(result.rows).toHaveLength(22);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:labor:vibration-crew"))
      .toBe(laborHours);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:equipment:active-vibrator"))
      .toBe(vibratorHours);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:equipment:rental-shifts"))
      .toBe(rentalShifts);
    expect(quantity(result.rows, "concrete-stairs-vibration:03:material:electricity"))
      .toBe(electricityKwh);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:consumable:cleaning-water"))
      .toBe(0.025);
    expect(quantity(result.rows, "concrete-stairs-vibration:04:labor:cleaning"))
      .toBe(0.25);
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test.each([
    ["stairs-concrete-vibration-small-area-s27-23.json",
      "9bb5f5d2db1809ea94e95003c73df58b10d0165e1f1707254ff157fa2f1faa9d"],
    ["stairs-concrete-vibration-large-area-s27-23.json",
      "afcd23a475fda561df676063cc25be7b32581c7c1e258ba73cc56fd0101db1c6"],
  ])("preserves historical source evidence %s", (name, expectedSha256) => {
    const path = resolve("data/estimate-benchmarks/source-packs", name);
    expect(sha256File(path)).toBe(expectedSha256);
    const historicalContext = JSON.parse(readFileSync(path, "utf8"));
    expect(historicalContext.sharedTechnologySourcePackSha256)
      .toBe(STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256);
  });
});
