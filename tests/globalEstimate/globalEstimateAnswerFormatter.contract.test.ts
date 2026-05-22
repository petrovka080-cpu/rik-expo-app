import { buildGlobalEstimateFixture, expectProfessionalBoqShape } from "./globalEstimateTestHarness";

describe("global estimate answer formatter", () => {
  it("renders a professional localized BOQ table instead of a generic paragraph", async () => {
    const { answer } = await buildGlobalEstimateFixture({ text: "дай смету на укладку ламината 100 м² в Бишкеке", language: "ru" });
    expectProfessionalBoqShape(answer);
    expect(answer).toContain("Материалы");
    expect(answer).toContain("Строительные работы");
    expect(answer).not.toMatch(/уточните всё, потом посчитаю/i);
    expect(answer).not.toMatch(/не найдено/i);
  });
});
