import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationWetZoneS2723,
  stairsConcreteVibrationWetZoneMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationWetZoneS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-wet-zone-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quantity(rows: readonly Record<string, any>[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("S27.23 wet-zone stair concrete internal vibration", () => {
  test("adds independently sourced wet-zone electrical controls", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256);
    expect([
      STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS.length,
      STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS.length,
      STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES.length,
    ]).toEqual([24, 18, 26]);
    const rowIds = new Set(STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(stairsConcreteVibrationWetZoneMissingRows(rowIds)).toEqual([]);
    expect([...rowIds].filter((rowId) =>
      /ip67|bodyguard|project-electrical-plan/u.test(rowId))).toHaveLength(4);
  });

  test("returns the estimate immediately and exposes two electrical-plan needs", async () => {
    const result = await compileStairsConcreteVibrationWetZoneS2723({
      ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT,
    });
    expect(result.rows).toHaveLength(24);
    expect(result.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual([
      "concrete-stairs-vibration-wet-zone:02:equipment:electrical-protection",
      "concrete-stairs-vibration-wet-zone:02:equipment:extension-cable",
    ]);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(9);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:labor:vibration-crew")).toBe(18.75);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:equipment:active-vibrator")).toBe(5);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:material:electricity")).toBe(4.4);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:04:consumable:cleaning-water")).toBe(0.025);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:04:labor:cleaning")).toBe(0.25);
  });

  test("restores all rows after plan clarification and recalculates at 20 m3", async () => {
    const result = await compileStairsConcreteVibrationWetZoneS2723({
      ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 20,
    });
    expect(result.rows).toHaveLength(26);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:labor:vibration-crew")).toBe(25);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:equipment:active-vibrator")).toBe(6.666666667);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:03:material:electricity")).toBe(5.866666667);
    expect(quantity(result.rows,
      "concrete-stairs-vibration-wet-zone:04:consumable:cleaning-water")).toBe(0.025);
  });
});
