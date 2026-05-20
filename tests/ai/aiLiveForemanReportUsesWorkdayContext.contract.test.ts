import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live foreman report uses workday context", () => {
  it("answers report without selected work overblock", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "Подготовить отчёт",
      forceActionId: "daily_object_report",
    });

    expect(answer.pipelineKey).toBe("foremanIntelligence");
    expect(answer.answerTextRu).toMatch(/WRK-GKL|Монтаж|evidence|отч/i);
    expect(answer.answerTextRu).not.toMatch(/нет выбранной работы/i);
    expect(answer.status).toBe("draft_prepared");
    expectUsefulLiveAnswer(answer);
  });
});
