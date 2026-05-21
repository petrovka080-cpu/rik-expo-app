import {
  answerLiveAiForContext,
  classifyUniversalIntent,
  extractUniversalEntity,
  getUniversalQuestionBank,
} from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: core", () => {
  it("routes explicit questions through universal intent/entity understanding", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "сколько заявок было за месяц май",
    });

    expect(classifyUniversalIntent("сколько заявок было за месяц май")).toBe("app_data_count");
    expect(extractUniversalEntity("сколько заявок было за месяц май")).toBe("procurement_request");
    expect(answer.queryIntent).toBe("app_data_count");
    expect(answer.answerTextRu).toContain("май 2026");
    expect(getUniversalQuestionBank()).toHaveLength(500);
  });
});
