import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  compileStairsConcreteVibrationTechnicalRoomS2723,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256,
  stairsConcreteVibrationTechnicalRoomMissingRows,
} from "../../src/lib/estimate/v4/stairsConcreteVibrationTechnicalRoomS2723";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-technical-room-s27-23.json",
);
const PREFIX = "concrete-stairs-vibration-technical-room:";

function quantity(
  result: Awaited<ReturnType<typeof compileStairsConcreteVibrationTechnicalRoomS2723>>,
  rowId: string,
): string | undefined {
  return result.rows.find((row) => row.row_id === rowId)?.quantity;
}

describe("S27.23 technical-room stair-concrete vibration", () => {
  it("binds the exact source pack and keeps a distinct atomic owner", () => {
    expect(createHash("sha256").update(readFileSync(SOURCE_PACK_PATH)).digest("hex"))
      .toBe(STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256);
    expect(STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_PARAMETERS).toHaveLength(29);
    expect(STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_FORMULAS).toHaveLength(18);
    expect(STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES).toHaveLength(28);
    expect(STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.every((row) =>
      row.row_id.startsWith(PREFIX))).toBe(true);
  });

  it("shows every condition-dependent row immediately without guessing room facts", async () => {
    const first = await compileStairsConcreteVibrationTechnicalRoomS2723({
      ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SHORT_INPUT,
    });

    expect(first.rows).toHaveLength(3);
    expect(first.preliminaryNeeds).toHaveLength(25);
    expect(first.rows.filter((row) => row.included_in_procurement)).toHaveLength(0);
    expect(new Set(first.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids))).toEqual(
      new Set([
        "technical_room_method_statement_reference",
        "technical_room_access_ventilation_plan_reference",
        "technical_room_power_route_reference",
        "technical_room_hazardous_area_classification_reference",
        "technical_room_continuity_standby_decision_reference",
        "technical_room_wash_water_plan_reference",
      ]),
    );
    expect(first.preliminaryNeeds.map((need) => need.row_id)).toEqual(expect.arrayContaining([
      `${PREFIX}03:operation:internal-vibration`,
      `${PREFIX}03:equipment:active-vibrator`,
      `${PREFIX}03:equipment:backup-vibrator`,
      `${PREFIX}04:consumable:cleaning-water`,
      `${PREFIX}06:delivery:mobilization`,
      `${PREFIX}01:control:hazardous-area-classification`,
    ]));
  });

  it("restores the full graph after project conditions and recalculates volume only", async () => {
    const complete = await compileStairsConcreteVibrationTechnicalRoomS2723({
      ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
    });
    const changed = await compileStairsConcreteVibrationTechnicalRoomS2723({
      ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
      consolidated_concrete_volume_m3: 18,
    });

    expect(complete.rows).toHaveLength(28);
    expect(complete.preliminaryNeeds).toEqual([]);
    expect(complete.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(quantity(complete, `${PREFIX}03:labor:vibration-crew`)).toBe("15");
    expect(quantity(complete, `${PREFIX}03:equipment:active-vibrator`)).toBe("4");
    expect(quantity(complete, `${PREFIX}03:equipment:rental-shifts`)).toBe("1");
    expect(quantity(complete, `${PREFIX}03:material:electricity`)).toBe("3.52");
    expect(quantity(complete, `${PREFIX}04:labor:cleaning`)).toBe("0.25");
    expect(quantity(complete, `${PREFIX}04:consumable:cleaning-water`)).toBe("0.025");

    expect(quantity(changed, `${PREFIX}03:labor:vibration-crew`)).toBe("22.5");
    expect(quantity(changed, `${PREFIX}03:equipment:active-vibrator`)).toBe("6");
    expect(quantity(changed, `${PREFIX}03:material:electricity`)).toBe("5.28");
    expect(quantity(changed, `${PREFIX}04:labor:cleaning`)).toBe("0.25");
    expect(quantity(changed, `${PREFIX}04:consumable:cleaning-water`)).toBe("0.025");

    const active = STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}03:equipment:active-vibrator`)!;
    const rental = STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}03:equipment:rental-shifts`)!;
    const cleaningOperation = STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}04:operation:cleaning`)!;
    const cleaningLabor = STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.find((row) =>
      row.row_id === `${PREFIX}04:labor:cleaning`)!;
    expect(active.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    expect(rental.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
    expect(cleaningOperation.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    expect(cleaningLabor.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
    expect(complete.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id))).toBe(false);
  });

  it("keeps every project reference attached to its dependent rows", async () => {
    const parameterIds = [
      "technical_room_method_statement_reference",
      "technical_room_access_ventilation_plan_reference",
      "technical_room_power_route_reference",
      "technical_room_hazardous_area_classification_reference",
      "technical_room_continuity_standby_decision_reference",
      "technical_room_wash_water_plan_reference",
    ] as const;
    for (const parameterId of parameterIds) {
      const input = { ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT };
      delete (input as Record<string, unknown>)[parameterId];
      const result = await compileStairsConcreteVibrationTechnicalRoomS2723(input);
      expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
      expect(result.preliminaryNeeds.every((need) =>
        need.missing_parameter_ids.includes(parameterId))).toBe(true);
    }
  });

  it("detects every removed required row", () => {
    const allRows = new Set(
      STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.map((row) => row.row_id),
    );
    expect(stairsConcreteVibrationTechnicalRoomMissingRows(allRows)).toEqual([]);
    for (const rowId of allRows) {
      const mutated = new Set(allRows);
      mutated.delete(rowId);
      expect(stairsConcreteVibrationTechnicalRoomMissingRows(mutated)).toContain(rowId);
    }
  });
});
