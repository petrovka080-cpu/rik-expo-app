import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman architecture provider", () => {
  it("uses architecture project provider for project checks", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "сверь с архитектурой",
    });

    expect(answer.providerTrace).toContain("aiArchitectureProjectProvider");
    expect(answer.answerRu).toContain("Сверка с проектом");
    expect(answer.answerRu).toContain("Проект АР.pdf");
    expect(answer.answerRu).toContain("стр. 14");
  });
});
