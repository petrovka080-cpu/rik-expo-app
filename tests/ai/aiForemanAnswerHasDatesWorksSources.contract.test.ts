import { FOREMAN_ACTION_QUESTION_MAP, answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman answer data shape", () => {
  it("every visible action answer includes period, works or exact reason, sources, missing data and next step", () => {
    const context = buildForemanRealWorkdayFixture();
    for (const action of FOREMAN_ACTION_QUESTION_MAP.filter((item) => item.screenId === "foreman.main").slice(0, 8)) {
      const answer = answerForemanWorkdayQuestion({
        context,
        actionId: action.actionId,
        questionRu: action.concreteQuestionRu,
      });
      expect(answer.answerRu).toContain("Период:");
      expect(answer.answerRu).toMatch(/Монтаж перегородок|Работы за период не найдены/);
      expect(answer.answerRu).toContain("Источники:");
      expect(answer.answerRu).toContain("Что не хватает:");
      expect(answer.answerRu).toContain("Следующий шаг:");
      expect(answer.sources.length).toBeGreaterThan(0);
    }
  });
});
