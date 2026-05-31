import {
  estimateFor,
  expectForbiddenRowsAbsent,
  expectRows,
} from "../entrypoints/liveB2cEstimateRealityTestHelpers";

const ELECTRICAL_PROMPT =
  "смета на прокладку электрокабеля с розетками в количестве 10 штук и выключателей 10 штук площадь квартиры 100 кв метров";

describe("electrical cable outlets switches professional BOQ", () => {
  it("builds a deep electrical BOQ instead of masonry fallback rows", () => {
    const estimate = estimateFor("/request", ELECTRICAL_PROMPT);
    const rows = estimate.sections.flatMap((section) => section.rows);
    expect(estimate.work.category).toBe("electrical");
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expectRows(
      estimate,
      [
        "схема электрики",
        "кабель",
        "гофра",
        "подрозетники",
        "розетки",
        "выключатели",
        "прокладка кабельных линий",
        "проверка цепей",
        "сопротивления изоляции",
      ],
      8,
    );
    expectForbiddenRowsAbsent(estimate, ["кирпич", "кладочный", "masonry wall"]);
  });
});
