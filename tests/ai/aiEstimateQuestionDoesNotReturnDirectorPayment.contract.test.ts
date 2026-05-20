import {
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("estimate question does not return director payment", () => {
  it("does not answer a window estimate request with PAY-GKL", () => {
    const answer = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION);

    expectWindowEstimateAnswer(answer);
    expect(answer.answerTextRu).not.toContain("PAY-GKL");
    expect(answer.foundRu.join("\n")).not.toContain("PAY-GKL");
    expect(answer.sourcesRu.join("\n")).not.toContain("PAY-GKL");
  });
});
