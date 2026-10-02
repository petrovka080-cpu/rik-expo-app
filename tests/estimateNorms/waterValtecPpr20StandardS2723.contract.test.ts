import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
  WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileWaterValtecPpr20StandardS2723,
  waterValtecPpr20StandardMissingRows,
} from "../../src/lib/estimate/v4/waterValtecPpr20StandardS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("S27.23 VALTEC PP-R 20 standard internal water route", () => {
  test("binds the restored official-source pack and independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS.length,
      WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS.length,
      WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([35, 38, 52]);
    expect(new Set(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.length);

    const full = new Set(WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(waterValtecPpr20StandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(waterValtecPpr20StandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("emits useful pipe, supports, labor, test and flushing rows from route length", async () => {
    const result = await compileWaterValtecPpr20StandardS2723({ route_length_m: 100 });
    const expectedNeeds = [
      "water-ppr20:04:component:straight-couplings",
      "water-ppr20:04:operation:socket-fusion",
      "water-ppr20:04:equipment:fusion-machine",
      "water-ppr20:04:consumable:cleaning-wipes",
      "water-ppr20:04:control:fusion-cycles",
      "water-ppr20:05:component:elbows",
      "water-ppr20:05:component:tees",
      "water-ppr20:05:component:threaded-transitions",
      "water-ppr20:05:component:terminal-caps",
      "water-ppr20:05:operation:elbows",
      "water-ppr20:05:operation:tees",
      "water-ppr20:05:operation:threaded-transitions",
      "water-ppr20:05:operation:terminal-caps",
      "water-ppr20:05:consumable:cleaning-wipes",
      "water-ppr20:05:consumable:thread-seal",
      "water-ppr20:05:labor:node-installation",
      "water-ppr20:05:control:total-fusion-sockets",
      "water-ppr20:06:labor:straight-fusion",
    ].sort();

    expect(result.rows).toHaveLength(34);
    expect(result.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual(expectedNeeds);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(12);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "water-ppr20:02:material:pipe-sections", quantity: "27" }),
      expect.objectContaining({ row_id: "water-ppr20:02:control:pipe-order", quantity: "108" }),
      expect.objectContaining({ row_id: "water-ppr20:03:fastener:support-packages", quantity: "3" }),
      expect.objectContaining({ row_id: "water-ppr20:06:labor:route-installation", quantity: "25" }),
      expect.objectContaining({ row_id: "water-ppr20:07:control:test-pressure", quantity: "6" }),
      expect.objectContaining({ row_id: "water-ppr20:07:material:flushing-water", quantity: "0.0411" }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete fittings, consumables and procurement and recalculates by length", async () => {
    const complete = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const changedNodes = await compileWaterValtecPpr20StandardS2723({
      ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
      elbow_count: 10,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(52);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(21);
    expect(quantity(complete, "water-ppr20:02:material:pipe-sections")).toBe("27");
    expect(quantity(complete, "water-ppr20:02:control:pipe-order")).toBe("108");
    expect(quantity(complete, "water-ppr20:02:control:pipe-remainder")).toBe("3");
    expect(quantity(complete, "water-ppr20:02:control:pipe-mass")).toBe("17.928");
    expect(quantity(complete, "water-ppr20:03:fastener:support-points")).toBe("201");
    expect(quantity(complete, "water-ppr20:04:component:straight-couplings")).toBe("24");
    expect(quantity(complete, "water-ppr20:04:operation:socket-fusion")).toBe("48");
    expect(quantity(complete, "water-ppr20:04:equipment:fusion-machine")).toBe("3.223333333");
    expect(quantity(complete, "water-ppr20:04:consumable:cleaning-wipes")).toBe("48");
    expect(quantity(complete, "water-ppr20:05:consumable:cleaning-wipes")).toBe("28");
    expect(quantity(complete, "water-ppr20:05:consumable:thread-seal")).toBe("1");
    expect(quantity(complete, "water-ppr20:05:control:total-fusion-sockets")).toBe("76");
    expect(quantity(complete, "water-ppr20:06:labor:straight-fusion")).toBe("4");
    expect(quantity(complete, "water-ppr20:05:labor:node-installation")).toBe("1.6");
    expect(quantity(complete, "water-ppr20:07:material:test-water")).toBe("0.0137");
    expect(quantity(complete, "water-ppr20:07:material:flushing-water")).toBe("0.0411");

    expect(quantity(changed, "water-ppr20:02:material:pipe-sections")).toBe("35");
    expect(quantity(changed, "water-ppr20:02:control:pipe-order")).toBe("140");
    expect(quantity(changed, "water-ppr20:02:control:pipe-remainder")).toBe("3.5");
    expect(quantity(changed, "water-ppr20:02:control:pipe-mass")).toBe("23.24");
    expect(quantity(changed, "water-ppr20:03:fastener:support-points")).toBe("261");
    expect(quantity(changed, "water-ppr20:06:labor:route-installation")).toBe("32.5");
    expect(quantity(changed, "water-ppr20:07:operation:pressure-test")).toBe("2");
    expect(quantity(changed, "water-ppr20:07:material:flushing-water")).toBe("0.05343");

    expect(quantity(changedNodes, "water-ppr20:02:control:pipe-order")).toBe("108");
    expect(quantity(changedNodes, "water-ppr20:05:control:total-fusion-sockets")).toBe("80");
    expect(quantity(changedNodes, "water-ppr20:04:equipment:fusion-machine")).toBe("3.366666667");
    expect(quantity(changedNodes, "water-ppr20:05:consumable:cleaning-wipes")).toBe("32");
    expect(quantity(changedNodes, "water-ppr20:05:labor:node-installation")).toBe("1.8");
  });
});
