import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileElectricalElecorCableChannelStandardS2723,
  electricalElecorCableChannelStandardMissingRows,
} from "../../src/lib/estimate/v4/electricalElecorCableChannelStandardS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("S27.23 IEK ELECOR 40x25 standard cable-channel profile", () => {
  test("binds an immutable official-source pack and an independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS.length,
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS.length,
      ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([22, 33, 41]);
    expect(new Set(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.length);

    const full = new Set(ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(electricalElecorCableChannelStandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(electricalElecorCableChannelStandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("shows a useful estimate from route length while preserving unknown node accessories", async () => {
    const result = await compileElectricalElecorCableChannelStandardS2723({
      route_length_m: 100,
    });
    const expectedNeeds = [
      "electrical-elecor:05:component:inner-corner-sets",
      "electrical-elecor:05:component:outer-corner-sets",
      "electrical-elecor:05:component:flat-angle-sets",
      "electrical-elecor:05:component:tee-sets",
      "electrical-elecor:05:component:end-cap-sets",
      "electrical-elecor:05:operation:inner-corners",
      "electrical-elecor:05:operation:outer-corners",
      "electrical-elecor:05:operation:flat-angles",
      "electrical-elecor:05:operation:tees",
      "electrical-elecor:05:operation:end-caps",
    ].sort();

    expect(result.rows).toHaveLength(31);
    expect(result.preliminaryNeeds.map((need) => need.row_id).sort()).toEqual(expectedNeeds);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(10);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: "electrical-elecor:02:material:channel-packs",
        quantity: "5",
      }),
      expect.objectContaining({
        row_id: "electrical-elecor:03:fastener:packages",
        quantity: "3",
      }),
      expect.objectContaining({
        row_id: "electrical-elecor:04:component:straight-connector-sets",
        quantity: "13",
      }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete nodes, packaging, order and remainder and recalculates by length", async () => {
    const complete = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
    });
    const repacked = await compileElectricalElecorCableChannelStandardS2723({
      ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
      channel_transport_pack_m: 25,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(41);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(15);
    expect(quantity(complete, "electrical-elecor:02:material:channel-packs")).toBe("5");
    expect(quantity(complete, "electrical-elecor:02:control:channel-order")).toBe("120");
    expect(quantity(complete, "electrical-elecor:02:control:channel-remainder")).toBe("15");
    expect(quantity(complete, "electrical-elecor:02:operation:cutting")).toBe("50");
    expect(quantity(complete, "electrical-elecor:03:fastener:points")).toBe("201");
    expect(quantity(complete, "electrical-elecor:03:fastener:packages")).toBe("3");
    expect(quantity(complete, "electrical-elecor:04:component:straight-connectors-net")).toBe("49");
    expect(quantity(complete, "electrical-elecor:04:component:straight-connector-sets")).toBe("13");
    expect(quantity(complete, "electrical-elecor:04:control:straight-connector-order")).toBe("52");
    expect(quantity(complete, "electrical-elecor:04:control:straight-connector-remainder")).toBe("3");
    expect(quantity(complete, "electrical-elecor:05:component:inner-corner-sets")).toBe("1");
    expect(quantity(complete, "electrical-elecor:05:component:tee-sets")).toBe("1");

    expect(quantity(changed, "electrical-elecor:02:material:channel-packs")).toBe("6");
    expect(quantity(changed, "electrical-elecor:02:control:channel-order")).toBe("144");
    expect(quantity(changed, "electrical-elecor:02:operation:cutting")).toBe("65");
    expect(quantity(changed, "electrical-elecor:03:fastener:points")).toBe("261");
    expect(quantity(changed, "electrical-elecor:04:component:straight-connector-sets")).toBe("16");
    expect(quantity(changed, "electrical-elecor:06:labor:installer-hours")).toBe("32.5");

    expect(quantity(repacked, "electrical-elecor:02:material:channel-packs")).toBe("5");
    expect(quantity(repacked, "electrical-elecor:02:control:channel-order")).toBe("125");
    expect(quantity(repacked, "electrical-elecor:04:component:straight-connectors-net")).toBe("49");
    expect(quantity(repacked, "electrical-elecor:04:component:straight-connector-sets")).toBe("13");
  });
});
