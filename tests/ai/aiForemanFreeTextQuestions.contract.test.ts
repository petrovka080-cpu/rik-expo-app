import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman free text questions", () => {
  it("routes typo-heavy Russian questions through the shared foreman pipeline", () => {
    const context = buildForemanRealWorkdayFixture();
    const answer = answerForemanWorkdayQuestion({
      context,
      questionRu: "чо закрыть сегодня и каких фото нехватает",
    });

    expect(answer.providerTrace).toContain("foremanWorkdayPipeline");
    expect(answer.providerTrace).toContain("aiConstructionKnowledgeProvider");
    expect(answer.answerRu).toContain("Ответ");
    expect(answer.answerRu).toContain("Период:");
    expect(answer.answerRu).toContain("Источники:");
    expect(answer.answerRu).toContain("нет фото после выполнения");
    expect(answer.changedData).toBe(false);
  });
});
