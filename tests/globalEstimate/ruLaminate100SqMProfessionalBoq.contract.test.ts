import { buildGlobalEstimateFixture, expectProfessionalBoqShape } from "./globalEstimateTestHarness";

describe("RU laminate 100 sq m professional BOQ", () => {
  it("returns the laminate-style estimate document with materials, labor, unit prices and total", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "дай смету на укладку ламината 100 м² в Бишкеке", language: "ru" });
    expect(result.locale.currency).toBe("KGS");
    expect(result.sections[0].rows.find((row) => row.code === "laminate_board")?.quantity).toBe(110);
    expectProfessionalBoqShape(answer);
  });
});
