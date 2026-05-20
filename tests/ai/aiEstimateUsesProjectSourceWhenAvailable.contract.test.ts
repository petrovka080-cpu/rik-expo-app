import {
  PROJECT_WINDOW_ESTIMATE_SOURCE,
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
  expectWindowEstimateAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("estimate uses project source when available", () => {
  it("uses project estimate lines instead of claiming a template as project fact", () => {
    const answer = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION, PROJECT_WINDOW_ESTIMATE_SOURCE);

    expectWindowEstimateAnswer(answer);
    expect(answer.status).toBe("data_unchanged");
    expect(answer.answerTextRu).toContain("EST-WINDOW-1");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining([
      "src:estimate:windows:line-1",
      "src:estimate:windows:line-2",
    ]));
    expect(answer.answerTextRu).not.toContain("проектных данных не найдено");
  });
});
