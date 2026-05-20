import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live director summary uses company context", () => {
  it("answers company summary without selected chat", () => {
    const answer = answerLiveAiForContext({
      context: "director",
      userText: "Открыть сводка",
      forceActionId: "today_decision_queue",
    });

    expect(answer.pipelineKey).toBe("directorCompany");
    expect(answer.answerTextRu).toMatch(/finance|warehouse|documents|office|approval|склад|документ/i);
    expect(answer.answerTextRu).not.toMatch(/нет выбранного обсуждения|Проверен экран/i);
    expect(answer.status).toBe("approval_required");
    expectUsefulLiveAnswer(answer);
  });
});
