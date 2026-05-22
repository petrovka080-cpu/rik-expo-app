import { parsePhotoGlobalEstimateInput } from "../../src/lib/ai/globalEstimate";
import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("photo input hidden damage", () => {
  it("uses default measurable assumption and states hidden defects are not confirmed", async () => {
    const input = parsePhotoGlobalEstimateInput({
      text: "photo wall issue",
      photoAnalysis: {
        detectedProblem: "paint peeling",
        detectedSurface: "wall",
        detectedWorkType: "wall painting",
        confidence: "medium",
      },
    });
    const { result, answer } = await buildGlobalEstimateFixture(input);
    expect(result.input.volume).toBe(10);
    expect(answer).toMatch(/Hidden damage|Скрытые/i);
  });
});
