import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no unsafe mutations", () => {
  it("keeps universal answers read-only or draft-only", () => {
    const answers = [
      answerLiveAiForContext({ context: "foreman", userText: "сколько заявок было за май" }),
      answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" }),
    ];

    expect(answers.every((answer) => answer.changedData === false)).toBe(true);
    expect(answers.every((answer) => answer.dangerousMutationsFound === 0)).toBe(true);
    expect(answers.every((answer) => answer.approvalBypassFound === 0)).toBe(true);
  });
});
