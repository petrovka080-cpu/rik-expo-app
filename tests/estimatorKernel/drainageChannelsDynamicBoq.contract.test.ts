import { requestEstimate, rowText, UNIVERSAL_PROMPTS } from "./universalEstimatorTestHelpers";

describe("drainage channels dynamic BOQ", () => {
  it("builds a length-based drainage channel BOQ", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.drainage);
    const text = rowText(estimate);
    expect(estimate.work.workKey).toBe("drainage_channel_installation");
    for (const token of ["разметка трассы", "проверка уклонов", "дренажные лотки", "решётки", "проверка проливом", "вывоз грунта"]) {
      expect(text).toContain(token);
    }
  });
});
