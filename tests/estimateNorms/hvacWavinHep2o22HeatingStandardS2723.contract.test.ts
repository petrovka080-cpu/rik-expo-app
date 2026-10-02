import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileHvacWavinHep2o22HeatingStandardS2723,
  hvacWavinHep2o22HeatingStandardMissingRows,
} from "../../src/lib/estimate/v4/hvacWavinHep2o22HeatingStandardS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json",
);

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("S27.23 Wavin Hep2O 22 mm internal-heating route", () => {
  test("binds the restored official-source pack and independent completeness map", () => {
    expect(sha256File(SOURCE_PACK_PATH))
      .toBe(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256);
    expect([
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS.length,
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS.length,
      HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.length,
    ]).toEqual([43, 48, 68]);
    expect(new Set(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    )).size).toBe(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.length);

    const full = new Set(HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.map(
      (resource) => resource.row_id,
    ));
    expect(hvacWavinHep2o22HeatingStandardMissingRows(full)).toEqual([]);
    for (const rowId of full) {
      const mutated = new Set(full);
      mutated.delete(rowId);
      expect(hvacWavinHep2o22HeatingStandardMissingRows(mutated)).toContain(rowId);
    }
  });

  test("emits the immediate route estimate while unresolved layout resources stay visible", async () => {
    const result = await compileHvacWavinHep2o22HeatingStandardS2723({ route_length_m: 100 });

    expect(result.rows).toHaveLength(40);
    expect(result.preliminaryNeeds).toHaveLength(28);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(10);
    expect(result.preliminaryNeeds.map((need) => need.row_id)).toEqual(expect.arrayContaining([
      "hvac-hep2o22:03:fastener:supports",
      "hvac-hep2o22:04:component:smartsleeves",
      "hvac-hep2o22:05:component:straight-connectors",
      "hvac-hep2o22:05:component:elbows",
      "hvac-hep2o22:05:component:tees",
      "hvac-hep2o22:05:component:threaded-adapters",
      "hvac-hep2o22:05:component:stop-ends",
    ]));
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-expected-waste", quantity: "5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-reserve", quantity: "5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:required-sections", quantity: "19" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:material:pipe-bundles", quantity: "1" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:ordered-length", quantity: "120" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:available-before-losses", quantity: "20" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:02:control:pipe-remainder", quantity: "15" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:03:control:support-max-span", quantity: "0.5" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:06:labor:route-installation", quantity: "25" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:test-pressure", quantity: "6" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:low-test-pressure", quantity: "0.75" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:high-pressure-pump", quantity: "15" }),
      expect.objectContaining({ row_id: "hvac-hep2o22:07:control:reduced-test-pressure", quantity: "2" }),
    ]));
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("calculates complete procurement and recalculates pipe packages and tests", async () => {
    const complete = await compileHvacWavinHep2o22HeatingStandardS2723({
      ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileHvacWavinHep2o22HeatingStandardS2723({
      ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
      route_length_m: 130,
      support_count: 261,
    });
    const quantity = (result: typeof complete, rowId: string) =>
      result.rows.find((candidate) => candidate.row_id === rowId)?.quantity;

    expect(complete.rows).toHaveLength(68);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(23);
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-expected-waste")).toBe("5");
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-reserve")).toBe("5");
    expect(quantity(complete, "hvac-hep2o22:02:control:required-sections")).toBe("19");
    expect(quantity(complete, "hvac-hep2o22:02:material:pipe-bundles")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:02:control:ordered-sections")).toBe("20");
    expect(quantity(complete, "hvac-hep2o22:02:control:ordered-length")).toBe("120");
    expect(quantity(complete, "hvac-hep2o22:02:control:available-before-losses")).toBe("20");
    expect(quantity(complete, "hvac-hep2o22:02:control:pipe-remainder")).toBe("15");
    expect(quantity(complete, "hvac-hep2o22:03:fastener:supports")).toBe("201");
    expect(quantity(complete, "hvac-hep2o22:03:fastener:support-packages")).toBe("3");
    expect(quantity(complete, "hvac-hep2o22:04:component:smartsleeves")).toBe("40");
    expect(quantity(complete, "hvac-hep2o22:04:consumable:wipe-packages")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:05:component:straight-connectors")).toBe("14");
    expect(quantity(complete, "hvac-hep2o22:05:consumable:ptfe")).toBe("1");
    expect(quantity(complete, "hvac-hep2o22:05:labor:node-installation")).toBe("2");
    expect(quantity(complete, "hvac-hep2o22:07:material:test-water")).toBe("0.024605739");
    expect(quantity(complete, "hvac-hep2o22:07:material:inhibitor")).toBe("0.24605739");
    expect(quantity(complete, "hvac-hep2o22:07:control:low-test-pressure")).toBe("0.75");
    expect(quantity(complete, "hvac-hep2o22:07:control:low-test-hold")).toBe("45");
    expect(quantity(complete, "hvac-hep2o22:07:control:test-pressure")).toBe("6");
    expect(quantity(complete, "hvac-hep2o22:07:control:high-pressure-pump")).toBe("15");
    expect(quantity(complete, "hvac-hep2o22:07:control:reduced-test-pressure")).toBe("2");
    expect(quantity(complete, "hvac-hep2o22:07:control:test-record")).toBe("45");

    expect(quantity(changed, "hvac-hep2o22:02:control:required-sections")).toBe("24");
    expect(quantity(changed, "hvac-hep2o22:02:material:pipe-bundles")).toBe("2");
    expect(quantity(changed, "hvac-hep2o22:02:control:ordered-sections")).toBe("40");
    expect(quantity(changed, "hvac-hep2o22:02:control:ordered-length")).toBe("240");
    expect(quantity(changed, "hvac-hep2o22:02:control:available-before-losses")).toBe("110");
    expect(quantity(changed, "hvac-hep2o22:02:control:pipe-remainder")).toBe("103.5");
    expect(quantity(changed, "hvac-hep2o22:03:fastener:supports")).toBe("261");
    expect(quantity(changed, "hvac-hep2o22:06:labor:route-installation")).toBe("32.5");
    expect(quantity(changed, "hvac-hep2o22:07:operation:high-pressure-test")).toBe("2");
  });
});
