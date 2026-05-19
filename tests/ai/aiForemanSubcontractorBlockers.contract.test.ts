import { answerForemanAction } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman subcontractor blockers", () => {
  it("shows what the contractor must submit without closing subcontract status", () => {
    const answer = answerForemanAction({
      context: buildForemanRealWorkdayFixture({ screenId: "foreman.subcontract" }),
      actionId: "subcontractor_blockers",
    });

    expect(answer.intent).toBe("subcontractor_blockers");
    expect(answer.answerRu).toContain("Бригада ГКЛ");
    expect(answer.answerRu).toContain("нет фото после выполнения");
    expect(answer.answerRu).toContain("открыто замечание");
    expect(answer.directWorkCloseUsed).toBe(false);
    expect(answer.changedData).toBe(false);
  });
});
