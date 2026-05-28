import { estimateFor, expectRows, FOREMAN_GABLE_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("gable roof professional BOQ", () => {
  it("has gable roof-specific rows", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_GABLE_PROMPT);
    expect(estimate.work.workKey).toBe("gable_roof_installation");
    expect(estimate.input.unit).toBe("sq_m");
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(18);
    expectRows(estimate, ["мауэрлат", "стропила", "коньковый прогон", "мембрана", "контробрешётка", "обрешётка", "кровельное покрытие", "доборные", "водосток", "крепёж", "антисептик", "монтаж стропильной системы", "монтаж мембраны", "монтаж кровли", "доставка", "леса", "резерв"], 14);
  });
});
