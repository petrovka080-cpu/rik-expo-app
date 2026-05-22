import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate language preservation contract", () => {
  it("preserves requested answer language through locale resolution", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "дай смету на укладку ламината 100 м2", language: "ru" });

    expect(result.locale.language).toBe("ru");
  });
});
