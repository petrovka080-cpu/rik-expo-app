import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  compileDrywallCeilingP113FullCycleS2723,
  drywallCeilingP113FullCycleMissingRows,
} from "../../src/lib/estimate/v4/drywallCeilingP113FullCycleS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json",
);

describe("S27.23 complete KNAUF P113 ceiling", () => {
  test("binds the graph to the independently authored official-source pack", () => {
    const bytes = readFileSync(SOURCE_PACK_PATH);
    const sourcePack = JSON.parse(bytes.toString("utf8")) as Record<string, any>;

    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256);
    expect(sourcePack).toMatchObject({
      authoredIndependentlyFromDefinitionRows: true,
      schemaVersion: "drywall-ceiling-p113-full-cycle-s27-23.v1",
    });
    expect(sourcePack.sources[0]).toMatchObject({
      sourceId: "KNAUF_P11_TECHNICAL_SHEET_2025_02",
      authority: "ООО КНАУФ ГИПС",
    });
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS).toHaveLength(38);
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS).toHaveLength(38);
    expect(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES).toHaveLength(54);
  });

  test("returns the useful 500 m2 estimate immediately and keeps geometry-dependent rows visible", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
    });

    expect(result.rows).toHaveLength(47);
    expect(result.preliminaryNeeds.map((need) => need.row_id)).toEqual([
      "ceiling-p113-full:02:material:pn-profile-pieces",
      "ceiling-p113-full:02:fastener:perimeter-packages",
      "ceiling-p113-full:02:consumable:sealing-tape-rolls",
      "ceiling-p113-full:02:operation:perimeter-installation",
      "ceiling-p113-full:04:material:separation-tape-rolls",
      "ceiling-p113-full:06:material:control-joint-pieces",
      "ceiling-p113-full:06:operation:control-joint-installation",
    ]);
    expect(result.preliminaryNeeds.slice(0, 5).every((need) =>
      need.missing_parameter_ids.includes("room_length_m")
      && need.missing_parameter_ids.includes("room_width_m")
    )).toBe(true);
    expect(result.preliminaryNeeds.slice(5).every((need) =>
      need.missing_parameter_ids.includes("control_joint_length_m")
    )).toBe(true);
    expect(result.rows.find((row) =>
      row.row_id === "ceiling-p113-full:02:material:pp-profile-pieces")?.quantity).toBe("508");
    expect(result.rows.find((row) =>
      row.row_id === "ceiling-p113-full:03:material:gsp-sheets")?.quantity).toBe("219");
  });

  test("calculates the complete 500 m2 procurement, operations and package residue", async () => {
    const result = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
    });
    const quantity = (rowId: string) =>
      result.rows.find((row) => row.row_id === rowId)?.quantity;

    expect(result.rows).toHaveLength(54);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(new Set(result.rows.map((row) => row.section)).size).toBe(8);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(28);
    expect(result.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
    expect(quantity("ceiling-p113-full:02:material:pp-profile-pieces")).toBe("508");
    expect(quantity("ceiling-p113-full:02:control:pp-profile-order")).toBe("1524");
    expect(quantity("ceiling-p113-full:02:control:pp-profile-remainder")).toBe("74");
    expect(quantity("ceiling-p113-full:02:material:pn-profile-pieces")).toBe("32");
    expect(quantity("ceiling-p113-full:02:fastener:perimeter-packages")).toBe("2");
    expect(quantity("ceiling-p113-full:02:consumable:sealing-tape-rolls")).toBe("4");
    expect(quantity("ceiling-p113-full:03:material:gsp-sheets")).toBe("219");
    expect(quantity("ceiling-p113-full:03:control:gsp-order")).toBe("525.6");
    expect(quantity("ceiling-p113-full:03:control:gsp-remainder")).toBe("25.6");
    expect(quantity("ceiling-p113-full:03:fastener:tn25-packages")).toBe("12");
    expect(quantity("ceiling-p113-full:04:material:joint-compound-bags")).toBe("9");
    expect(quantity("ceiling-p113-full:04:control:joint-compound-remainder")).toBe("25");
    expect(quantity("ceiling-p113-full:04:material:joint-tape-rolls")).toBe("9");
    expect(quantity("ceiling-p113-full:04:control:joint-tape-remainder")).toBe("75");
    expect(quantity("ceiling-p113-full:05:material:primer-cans")).toBe("6");
    expect(quantity("ceiling-p113-full:05:control:primer-remainder")).toBe("10");
    expect(quantity("ceiling-p113-full:06:material:control-joint-pieces")).toBe("7");
  });

  test("recalculates from changed area and detects every independently required removal", async () => {
    const changed = await compileDrywallCeilingP113FullCycleS2723({
      ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
      area_m2: 600,
    });
    expect(changed.rows.find((row) =>
      row.row_id === "ceiling-p113-full:02:material:pp-profile-pieces")?.quantity).toBe("609");
    expect(changed.rows.find((row) =>
      row.row_id === "ceiling-p113-full:03:material:gsp-sheets")?.quantity).toBe("263");

    const fullRowIds = new Set(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.map((row) => row.row_id));
    expect(drywallCeilingP113FullCycleMissingRows(fullRowIds)).toEqual([]);
    for (const component of DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries) {
      for (const requiredRowId of component.requiredRowIds) {
        const mutated = new Set(fullRowIds);
        mutated.delete(requiredRowId);
        expect(drywallCeilingP113FullCycleMissingRows(mutated)).toContain(requiredRowId);
      }
    }
  });
});
