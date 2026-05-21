import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no default screen summary", () => {
  it("does not answer explicit app-data or construction questions with foreman workday summary", () => {
    const count = answerLiveAiForContext({ context: "foreman", userText: "сколько заявок было за май" });
    const estimate = answerLiveAiForContext({ context: "foreman", userText: "дай смету на асфальт 100 м2" });

    expect(count.queryIntent).not.toBe("role_summary_query");
    expect(estimate.queryIntent).not.toBe("role_summary_query");
    expect(count.answerTextRu).not.toContain("монтаж перегородок");
    expect(estimate.answerTextRu).not.toContain("монтаж перегородок");
  });
});
