import { estimateFor, expectRows, FOREMAN_CANOPY_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("metal canopy professional BOQ", () => {
  it("has canopy-specific structural rows", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_CANOPY_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(18);
    expectRows(estimate, ["расчёт снеговой", "фундаменты под стойки", "закладные", "стойки металлические", "фермы", "прогоны", "связи", "кровельное покрытие для навеса", "водосток", "сварочные", "антикоррозионная", "монтаж стоек", "монтаж ферм", "кран", "доставка металла"], 14);
  });
});
