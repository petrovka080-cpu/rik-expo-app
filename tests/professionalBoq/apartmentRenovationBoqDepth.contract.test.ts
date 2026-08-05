import { estimateFor, expectRows, REQUEST_APARTMENT_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("apartment renovation professional BOQ", () => {
  it("has complex renovation depth", () => {
    const estimate = estimateFor("/request", REQUEST_APARTMENT_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(30);
    expectRows(estimate, ["обмер", "демонтаж", "вывоз строительного мусора", "электр", "водопровод", "гидроизоляц", "штукатур", "шпаклев", "грунтов", "потол", "стяжк", "напольн", "плитк", "двер", "розет", "расходн", "уборк", "запас"], 18);
  });
});
