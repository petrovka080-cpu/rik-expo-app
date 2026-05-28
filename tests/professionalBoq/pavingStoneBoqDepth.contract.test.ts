import { estimateFor, expectForbiddenRowsAbsent, expectRows, FOREMAN_PAVING_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("paving stone professional BOQ", () => {
  it("has paving rows and no masonry rows", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_PAVING_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(18);
    expectRows(estimate, ["разметка", "планировка", "выемка", "геотекстиль", "песок", "щебень", "отсев", "бордюр", "бетон под бордюр", "брусчатка", "резка", "виброуплотнение", "заполнение швов", "доставка"], 10);
    expectForbiddenRowsAbsent(estimate, ["кирпич", "раствор", "кладочная сетка", "кирпичная кладка"]);
  });
});
