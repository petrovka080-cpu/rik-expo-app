import { answerKnownWork, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

describe("known work never template-gaps", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES)("$id has no manual fallback", (testCase) => {
    const answer = answerKnownWork(testCase);
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.fallbackUsed).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.expectedWorkKey);
  });
});
