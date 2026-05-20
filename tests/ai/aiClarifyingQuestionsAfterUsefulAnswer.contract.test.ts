import {
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("clarifying questions after useful answer", () => {
  it("lists useful estimate items before missing inputs", () => {
    const answer = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION);

    expectWindowEstimateAnswer(answer);
    const lower = answer.answerTextRu.toLowerCase();
    const estimateIndex = lower.indexOf("оконный блок");
    const missingIndex = lower.indexOf("чего не хватает");
    expect(estimateIndex).toBeGreaterThan(0);
    expect(missingIndex).toBeGreaterThan(estimateIndex);
  });
});
