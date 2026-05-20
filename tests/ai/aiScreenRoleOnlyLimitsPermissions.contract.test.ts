import {
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("screen role only limits permissions", () => {
  it("uses warehouse screen as permission context without forcing a warehouse answer", () => {
    const answer = answerIntentFirst("warehouse", WINDOW_ESTIMATE_QUESTION);

    expectWindowEstimateAnswer(answer);
    expect(answer.pipelineKey).toBe("warehouseStock");
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "warehouseStock",
      "queryIntentFirst",
      "construction_estimate_request",
    ]));
    expect(answer.answerTextRu).not.toMatch(/остат|резерв|складский дефицит|PAY-GKL/i);
  });
});
