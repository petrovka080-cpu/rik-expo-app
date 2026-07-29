import {
  buildElectricalCanonicalParameterSession,
} from "../../src/lib/estimate/v4/electrical/electricalCanonicalV1";
import {
  buildElectricalCircuitScheduleV1,
  ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID,
} from "../../src/lib/estimate/v4/electrical/electricalCircuitScheduleV1";
import {
  assertElectricalDimensionSources,
} from "../../src/lib/estimate/v4/electrical/electricalDimensionalContractV1";

function session(text: string) {
  return buildElectricalCanonicalParameterSession({
    text,
    draftId: "electrical-circuit-schedule-test",
    revisionId: "revision-1",
    changedAt: "2026-07-29T00:00:00+06:00",
  });
}

describe("ElectricalCircuitSchedule V1", () => {
  it("is versioned and blocking without a confirmed dimensional basis", () => {
    const schedule = buildElectricalCircuitScheduleV1(
      session("электрика под ключ 100 кв метров площадь"),
    );

    expect(schedule.schemaId).toBe(ELECTRICAL_CIRCUIT_SCHEDULE_SCHEMA_ID);
    expect(schedule.status).toBe("BLOCKING_REQUIRED");
    expect(schedule.source).toBe("BLOCKING_REQUIRED");
    expect(schedule.missingParameterIds.length).toBeGreaterThan(0);
    expect(schedule.lines).toHaveLength(0);
    expect(schedule.assumptions).toHaveLength(0);
  });

  it("builds distinct visible-assumption outlet and lighting circuits from full confirmed quantities", () => {
    const schedule = buildElectricalCircuitScheduleV1(
      session(
        "электромонтаж под ключ, площадь 87 м², трасса 154 м, " +
        "10 розеток, 10 выключателей, 8 точек освещения",
      ),
    );

    expect(schedule.status).toBe("ASSUMPTION_REQUIRES_CONFIRMATION");
    expect(schedule.source).toBe("VISIBLE_ASSUMPTION");
    expect(schedule.assumptions.length).toBeGreaterThan(0);
    expect(schedule.lines).toHaveLength(4);
    expect(
      schedule.lines.reduce((sum, line) => sum + line.routeLengthM, 0),
    ).toBeCloseTo(154, 3);
    expect(
      schedule.lines.reduce((sum, line) => sum + line.endpointsCount, 0),
    ).toBe(28);
    expect(new Set(schedule.lines.map((line) => line.cableType))).toEqual(
      new Set(["ВВГнг-LS 3x2.5", "ВВГнг-LS 3x1.5"]),
    );
    expect(
      schedule.lines.every(
        (line) =>
          line.source === "VISIBLE_ASSUMPTION" &&
          line.status === "ASSUMPTION_REQUIRES_CONFIRMATION",
      ),
    ).toBe(true);
  });

  it("rejects an area-only source for linear and count dimensions", () => {
    expect(() =>
      assertElectricalDimensionSources({
        target: "CABLE_LENGTH",
        sourceParameterIds: ["area_m2"],
      })
    ).toThrow(/DIMENSION_SOURCE_INVALID/);
    expect(() =>
      assertElectricalDimensionSources({
        target: "GROUP_COUNT",
        sourceParameterIds: ["area_m2"],
      })
    ).toThrow(/DIMENSION_SOURCE_INVALID/);
    expect(() =>
      assertElectricalDimensionSources({
        target: "ROUTE_LENGTH",
        sourceParameterIds: ["route_length_m"],
      })
    ).not.toThrow();
  });
});
