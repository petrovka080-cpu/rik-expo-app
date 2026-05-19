import { answerForemanAction, answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman no final submit or signing", () => {
  it("prepares drafts only and never signs, closes work, submits final or bypasses approval", () => {
    const act = answerForemanAction({
      context: buildForemanRealWorkdayFixture(),
      actionId: "act_draft",
    });
    const report = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "подготовить отчет",
    });

    for (const answer of [act, report]) {
      expect(answer.answerRu).toContain("Финальная отправка не выполнена");
      expect(answer.changedData).toBe(false);
      expect(answer.directSigningUsed).toBe(false);
      expect(answer.directFinalSubmitUsed).toBe(false);
      expect(answer.directWorkCloseUsed).toBe(false);
      expect(answer.approvalBypassUsed).toBe(false);
    }
  });
});
