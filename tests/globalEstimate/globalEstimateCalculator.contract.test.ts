import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate calculator", () => {
  it("calculates quantities, prices, tax status, totals, and sources in backend result", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "дай смету на укладку ламината 100 м² в Бишкеке", language: "ru" });
    expect(result.work.workKey).toBe("laminate_laying");
    expect(result.sections.find((section) => section.type === "materials")?.rows[0]).toMatchObject({
      rowNumber: "1.1",
      quantity: 110,
      currency: "KGS",
    });
    expect(result.totals.grandTotal).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
  });
});
