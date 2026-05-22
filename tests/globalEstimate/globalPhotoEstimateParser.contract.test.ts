import { parsePhotoGlobalEstimateInput } from "../../src/lib/ai/globalEstimate";
import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global photo estimate parser", () => {
  it("uses photo signals only as uncertain input and does not invent hidden damage", async () => {
    const input = parsePhotoGlobalEstimateInput({
      countryCode: "KG",
      language: "ru",
      photoAnalysis: {
        detectedProblem: "visible wall damage",
        detectedSurface: "painted wall",
        detectedWorkType: "wall painting",
        confidence: "medium",
      },
    });
    const { result, answer } = await buildGlobalEstimateFixture(input);
    expect(result.input.photoBased).toBe(true);
    expect(result.input.volume).toBe(10);
    expect(answer).toMatch(/Скрытые|hidden/i);
  });
});
