import { estimateFor, expectRows, REQUEST_APARTMENT_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("apartment renovation professional BOQ", () => {
  it("has complex renovation depth", () => {
    const estimate = estimateFor("/request", REQUEST_APARTMENT_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(30);
    expectRows(estimate, ["обмеры", "демонтаж", "вывоз мусора", "электрика", "сантехника", "гидроизоляция мокрых зон", "штукатурка", "шпаклёвка", "грунтовка", "потолки", "стяжка", "напольное покрытие", "плитка", "двери", "розетки", "расходники", "уборка", "резерв"], 18);
  });
});
