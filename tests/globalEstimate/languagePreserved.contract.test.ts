import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate language preservation", () => {
  it("keeps Russian response structure for Russian request", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "дай смету на укладку ламината 100 м² в Бишкеке", language: "ru" });
    expect(result.locale.language).toBe("ru");
    expect(answer).toContain("Вот ориентировочная смета");
    expect(answer).toContain("Чтобы сделать расчет точнее");
  });
});
