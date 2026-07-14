import { selectDirectorRequestHeaderLines } from "../../src/features/office/directorRequestHeader";

describe("director request header context", () => {
  it("shows request number and full foreman context instead of only location", () => {
    const lines = selectDirectorRequestHeaderLines(
      {
        request_id: "request-1",
        items: [
          {
            note:
              "Объект: Общежитие / вахтовый городок; Этаж / уровень: -2 этаж; Система: Весь раздел; Зона: Без детализации",
          },
        ],
      },
      {
        request_no: "REQ-0653/2026",
        object_name: null,
        level_code: "LVL-M2",
        system_code: "SYS-ALL",
        zone_code: "ZONE-NO-DETAIL",
        status: "submitted",
        created_at: "2026-07-01T08:00:00.000Z",
      },
    );

    expect(lines[0]).toBe("Заявка REQ-0653/2026");
    expect(lines).toContain("Объект: Общежитие / вахтовый городок");
    expect(lines).toContain("Этаж / уровень: -2 этаж");
    expect(lines).toContain("Система / раздел: Весь раздел");
    expect(lines).toContain("Зона: Без детализации");
    expect(lines).toContain("Локация: LVL-M2");
  });
});
