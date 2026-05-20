import {
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("window estimate draft when no project source", () => {
  it("gives a useful draft estimate with assumptions instead of a blocker", () => {
    const answer = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION);

    expectWindowEstimateAnswer(answer);
    expect(answer.status).toBe("draft_prepared");
    expect(answer.answerTextRu).toContain("чернов");
    expect(answer.answerTextRu).toContain("проектная смета по окнам: не найдена");
    expect(answer.missingDataRu).toEqual(expect.arrayContaining([
      "размер окна",
      "количество окон",
      "регион и валюта",
    ]));
  });
});
