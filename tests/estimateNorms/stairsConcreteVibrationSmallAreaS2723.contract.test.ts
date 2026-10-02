import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationSmallAreaS2723,
  stairsConcreteVibrationSmallAreaMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationSmallAreaS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-small-area-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quantity(rows: readonly Record<string, any>[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("S27.23 small-area stair concrete internal vibration", () => {
  test("keeps a distinct catalog context over the shared complete atomic technology", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256);
    expect([
      STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS.length,
      STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS.length,
      STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES.length,
    ]).toEqual([23, 18, 22]);
    const rowIds = new Set(STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(stairsConcreteVibrationSmallAreaMissingRows(rowIds)).toEqual([]);
    expect([...rowIds].every((rowId) =>
      rowId.startsWith("concrete-stairs-vibration-small-area:"))).toBe(true);
  });

  test("returns all resources immediately for the 3 m3 small-area fixture", async () => {
    const result = await compileStairsConcreteVibrationSmallAreaS2723({
      ...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT,
    });
    expect(result.rows).toHaveLength(22);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:labor:vibration-crew")).toBe(3.75);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:equipment:active-vibrator")).toBe(1);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:material:electricity")).toBe(0.88);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:04:consumable:cleaning-water")).toBe(0.025);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:04:labor:cleaning")).toBe(0.25);
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("recalculates the shared technology without collapsing the variant owner", async () => {
    const result = await compileStairsConcreteVibrationSmallAreaS2723({
      ...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 6,
    });
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:labor:vibration-crew")).toBe(7.5);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:equipment:active-vibrator")).toBe(2);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:03:material:electricity")).toBe(1.76);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-small-area:04:consumable:cleaning-water")).toBe(0.025);
  });
});
