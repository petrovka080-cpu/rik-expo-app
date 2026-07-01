import { readFileSync } from "fs";
import { join } from "path";

import {
  buildRequestContextMetaFields,
  buildRequestContextView,
  buildRequestLineItemView,
  parseRequestContextFromNotes,
} from "../../src/features/office/requestContextView";

describe("director PDF request context and units", () => {
  it("uses the shared request context view and localized units", () => {
    const note =
      "Объект: Общежитие / вахтовый городок; Этаж / уровень: -2 этаж; Система: Весь раздел; Зона: Без детализации";
    const context = buildRequestContextView(
      {
        requestId: "request-1",
        requestNo: "REQ-0653/2026",
        levelCode: "LVL-M2",
        systemCode: "SYS-ALL",
        zoneCode: "ZONE-NO-DETAIL",
        status: "submitted",
        createdAt: "2026-07-01T08:00:00.000Z",
      },
      parseRequestContextFromNotes([note]),
    );
    const meta = buildRequestContextMetaFields(context);
    const units = ["sq_m", "pcs", "linear_m", "m3", "shift", "trip", "set", "kg", "ton", "bag", "roll"]
      .map((uom) => buildRequestLineItemView({ nameHuman: "Позиция", qty: 1, uom }).uom);

    expect(meta).toEqual(
      expect.arrayContaining([
        { label: "Объект", value: "Общежитие / вахтовый городок" },
        { label: "Этаж / уровень", value: "-2 этаж" },
        { label: "Система / раздел", value: "Весь раздел" },
        { label: "Зона", value: "Без детализации" },
        { label: "Локация", value: "LVL-M2" },
      ]),
    );
    expect(units).toEqual(["м²", "шт.", "пог. м", "м³", "смена", "рейс", "компл.", "кг", "т", "меш.", "рул."]);
  });

  it("keeps director request PDF builder wired to the shared mapper", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/pdf/pdf.builder.ts"), "utf8");

    expect(source).toContain("../../features/office/requestContextView");
    expect(source).toContain("buildRequestContextView");
    expect(source).toContain("buildRequestLineItemView");
    expect(source).not.toContain("function parseContextFromNotes");
    expect(source).not.toContain("function stripContextFromNote");
  });
});
