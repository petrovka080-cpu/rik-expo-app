import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS no unsafe mutations", () => {
  it("keeps context graph answers read-only", () => {
    const answers = [
      answerAiAppContextGraphFixture("покажи заявки по первому этажу"),
      answerAiAppContextGraphFixture("что в этом PDF", "accountant"),
      answerAiAppContextGraphFixture("куда ушёл ГКЛ"),
      answerAiAppContextGraphFixture("какие платежи без документов", "accountant"),
    ];

    expect(answers.every((answer) => answer.safetyStatus.changedData === false)).toBe(true);
    expect(answers.every((answer) => answer.safetyStatus.finalSubmit === false)).toBe(true);
    expect(answers.every((answer) => answer.safetyStatus.dangerousMutation === false)).toBe(true);
  });
});
