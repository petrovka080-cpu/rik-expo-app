import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live buyer uses procurement queue", () => {
  it("answers supplier options without selected request overblock", () => {
    const answer = answerLiveAiForContext({
      context: "buyer",
      userText: "Найти поставщиков / варианты",
      forceActionId: "find_5_10_suppliers",
    });

    expect(answer.pipelineKey).toBe("buyerSourcing");
    expect(answer.answerTextRu).toMatch(/СтройМаркет|supplier|marketplace|MR-GKL/i);
    expect(answer.answerTextRu).not.toMatch(/нет выбранной заявки/i);
    expectUsefulLiveAnswer(answer);
  });
});
