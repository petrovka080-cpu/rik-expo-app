import { answerKnownWork, UNIVERSAL_KNOWN_WORK_CASES } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("known construction work manual fallback guard", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES)("$id never falls back manually", (testCase) => {
    const answer = answerKnownWork(testCase);
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.fallbackUsed).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.expectedWorkKey);
  });
});
