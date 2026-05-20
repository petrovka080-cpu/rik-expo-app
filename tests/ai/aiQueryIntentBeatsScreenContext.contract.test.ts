import {
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("query intent beats screen context", () => {
  it("answers the construction estimate question on the director screen", () => {
    const answer = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION);

    expectWindowEstimateAnswer(answer);
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "queryIntentFirst",
      "construction_estimate_request",
    ]));
    expect(answer.providerTrace).toContain("directorCompany");
  });
});
