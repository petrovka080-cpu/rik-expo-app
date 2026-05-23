import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("dangerous work estimate boundary", () => {
  it("marks safety-sensitive construction as review-required estimate output", () => {
    const roof = P0_UNFINISHED_AI_ESTIMATE_CASES.find((item) => item.expectedWorkKey === "gable_roof_installation");
    expect(roof).toBeTruthy();
    const answer = expectCaseValid(roof!);
    expect(answer.toolResult.estimate?.requiresReview).toBe(true);
    expect(answer.answerTextRu).toMatch(/DIY-инструкции не выдаются|проверка специалистом/i);
    expect(answer.answerTextRu).not.toMatch(/сделайте сами/i);
  });
});
