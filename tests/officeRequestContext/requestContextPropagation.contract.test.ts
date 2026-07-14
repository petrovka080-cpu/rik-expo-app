import {
  buildRequestContextLines,
  buildRequestContextView,
  parseRequestContextFromNotes,
} from "../../src/features/office/requestContextView";

describe("office request context propagation", () => {
  it("keeps foreman-entered context separate from technical location codes", () => {
    const note =
      "Объект: Общежитие / вахтовый городок; Этаж / уровень: -2 этаж; Система: Весь раздел; Зона: Без детализации";
    const parsed = parseRequestContextFromNotes([note]);
    const view = buildRequestContextView(
      {
        requestId: "67a8a3a5-0000-4000-9000-abc000000001",
        requestNo: "REQ-0653/2026",
        levelCode: "LVL-M2",
        systemCode: "SYS-ALL",
        zoneCode: "ZONE-NO-DETAIL",
        status: "submitted",
        createdAt: "2026-07-01T08:00:00.000Z",
      },
      parsed,
    );
    const lines = buildRequestContextLines(view);

    expect(lines).toEqual(
      expect.arrayContaining([
        "Заявка REQ-0653/2026",
        "Объект: Общежитие / вахтовый городок",
        "Этаж / уровень: -2 этаж",
        "Система / раздел: Весь раздел",
        "Зона: Без детализации",
        "Локация: LVL-M2",
      ]),
    );
    expect(lines).not.toEqual(["Локация: LVL-M2"]);
  });

  it("normalizes legacy foreman location notes into separate context fields", () => {
    const parsed = parseRequestContextFromNotes([
      "Объект: Administrative building; Локация: 1 / All / Room 101",
      "Раздел: HVAC; Детальное место: Machine room",
    ]);
    const view = buildRequestContextView(
      {
        requestId: "REQ-ID",
        requestNo: "REQ-0701/2026",
        levelCode: "LVL-01",
        status: "submitted",
      },
      parsed,
    );

    expect(buildRequestContextLines(view)).toEqual(
      expect.arrayContaining([
        "Объект: Administrative building",
        "Этаж / уровень: 1",
        "Система / раздел: All",
        "Зона: Room 101",
        "Локация: LVL-01",
      ]),
    );
  });

  it("prefers a foreman-friendly object label over a technical object code", () => {
    const parsed = parseRequestContextFromNotes([
      "Object: Administrative building; Level: 1 floor; System: Whole section; Zone: No detail",
    ]);
    const view = buildRequestContextView(
      {
        requestId: "REQ-ID",
        requestNo: "REQ-0662/2026",
        objectName: "BLD-ADMIN",
        levelCode: "LVL-01",
        systemCode: "SYS-EL",
        zoneCode: "ZONE-101",
        status: "procurement_ready",
      },
      parsed,
    );

    expect(buildRequestContextLines(view)).toContain(
      "Объект: Administrative building",
    );
    expect(buildRequestContextLines(view)).not.toContain("Объект: BLD-ADMIN");
  });
});
