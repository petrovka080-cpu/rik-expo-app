import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationLargeAreaS2723,
  stairsConcreteVibrationLargeAreaMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationLargeAreaS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-large-area-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quantity(rows: readonly Record<string, any>[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("S27.23 large-area stair concrete internal vibration", () => {
  test("uses the shared technology with a distinct complete large-area owner", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SOURCE_PACK_SHA256);
    expect([
      STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_PARAMETERS.length,
      STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_FORMULAS.length,
      STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RESOURCES.length,
    ]).toEqual([23, 18, 22]);
    const rowIds = new Set(STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(stairsConcreteVibrationLargeAreaMissingRows(rowIds)).toEqual([]);
    expect([...rowIds].every((rowId) =>
      rowId.startsWith("concrete-stairs-vibration-large-area:"))).toBe(true);
  });

  test("returns all resources immediately for the 54 m3 fixture", async () => {
    const result = await compileStairsConcreteVibrationLargeAreaS2723({
      ...STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_SHORT_INPUT,
    });
    expect(result.rows).toHaveLength(22);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:labor:vibration-crew")).toBe(67.5);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:equipment:active-vibrator")).toBe(18);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:equipment:rental-shifts")).toBe(3);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:material:electricity")).toBe(15.84);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:04:consumable:cleaning-water")).toBe(0.025);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:04:labor:cleaning")).toBe(0.25);
  });

  test("recalculates the shared technology at 72 m3", async () => {
    const result = await compileStairsConcreteVibrationLargeAreaS2723({
      ...STAIRS_CONCRETE_VIBRATION_LARGE_AREA_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 72,
    });
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:labor:vibration-crew")).toBe(90);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:equipment:active-vibrator")).toBe(24);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:equipment:rental-shifts")).toBe(3);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:03:material:electricity")).toBe(21.12);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-large-area:04:consumable:cleaning-water")).toBe(0.025);
  });
});
