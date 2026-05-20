import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live accountant uses finance period", () => {
  it("answers critical payments without selected payment overblock", () => {
    const answer = answerLiveAiForContext({
      context: "accountant",
      userText: "Проверить критические",
      forceActionId: "critical_payments",
    });

    expect(answer.pipelineKey).toBe("accountantFinance");
    expect(answer.answerTextRu).toMatch(/INV-GKL|PAY-GKL|Payment|Invoice|оплат/i);
    expect(answer.answerTextRu).not.toMatch(/нет выбранного платежа/i);
    expect(answer.status).toBe("approval_required");
    expectUsefulLiveAnswer(answer);
  });
});
