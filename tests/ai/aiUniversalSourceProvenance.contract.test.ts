import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: source provenance", () => {
  it("shows provenance for universal app-data answers", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "сколько заявок было за май",
    });

    expect(answer.sourceProvenance.length).toBeGreaterThan(0);
    expect(answer.answerTextRu).toContain("Источник ответа:");
    expect(answer.answerTextRu).toContain("Интернет: не использовался");
  });
});
