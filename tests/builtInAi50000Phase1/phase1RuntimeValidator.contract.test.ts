import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateBuiltInAi50000RuntimeResult } from "../../src/lib/ai/builtInAi50000";
import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 runtime validator", () => {
  it("accepts a real BuiltInAiIngress estimate trace", () => {
    const testCase = PHASE1_CASES.find((candidate) => candidate.id === "phase1_anchor_brick_masonry_74sqm");
    expect(testCase).toBeTruthy();
    const answer = answerBuiltInAi({
      text: testCase?.promptRu ?? "estimate cost for brick masonry 74 sq_m",
      route: "/chat",
      screenContext: "chat",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    expect(validateBuiltInAi50000RuntimeResult(testCase!, answer).passed).toBe(true);
  });
});
