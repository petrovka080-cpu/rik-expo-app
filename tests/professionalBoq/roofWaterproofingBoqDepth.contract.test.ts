import { estimateFor, expectForbiddenRowsAbsent, expectRows, FOREMAN_ROOF_WATERPROOFING_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("roof waterproofing professional BOQ", () => {
  it("has roof waterproofing rows without bathroom-only scope", () => {
    const estimate = estimateFor("/ai?context=foreman", FOREMAN_ROOF_WATERPROOFING_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
    expectRows(estimate, ["очистка кровли", "ремонт дефектов", "праймер", "гидроизоляция", "примыканий", "воронки", "герметизация", "проверка герметичности"], 8);
    expectForbiddenRowsAbsent(estimate, ["ванной", "санузла"]);
  });
});
