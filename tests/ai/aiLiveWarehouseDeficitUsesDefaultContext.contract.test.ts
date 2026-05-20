import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live warehouse deficit uses default context", () => {
  it("answers deficit without selected material", () => {
    const answer = answerLiveAiForContext({
      context: "warehouse",
      userText: "Показать дефицит",
      forceActionId: "critical_deficits",
    });

    expect(answer.pipelineKey).toBe("warehouseStock");
    expect(answer.answerTextRu).toMatch(/ГКЛ|Stock checked|дефицит|Дефицит/i);
    expect(answer.answerTextRu).not.toMatch(/Нужен конкретный источник|нет выбранной складской позиции/i);
    expect(answer.status).toBe("data_unchanged");
    expectUsefulLiveAnswer(answer);
  });
});
