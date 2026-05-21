import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: app-data count questions", () => {
  it("answers request count questions with checked-empty app data instead of screen work summary", () => {
    const answer = answerLiveAiForContext({ context: "foreman", userText: "сколько заявок было за месяц май" });

    expect(answer.queryIntent).toBe("app_data_count");
    expect(answer.answerTextRu).toContain("заявки");
    expect(answer.answerTextRu).toContain("май 2026");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
    expect(answer.answerTextRu).not.toContain("ГКЛ");
  });
});
