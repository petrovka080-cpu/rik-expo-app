import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanNoPdfFixture, buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman estimate provider", () => {
  it("uses estimate provider and shows plan/fact/source for smeta questions", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "сверь работы со сметой",
    });

    expect(answer.intent).toBe("estimate_comparison");
    expect(answer.providerTrace).toContain("aiEstimateProvider");
    expect(answer.answerRu).toContain("Сверка со сметой");
    expect(answer.answerRu).toContain("EST-77");
    expect(answer.answerRu).toContain("план 42 м2");
    expect(answer.answerRu).toContain("факт 38 м2");
  });

  it("does not assert estimate quantities when estimate source is absent", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanNoPdfFixture(),
      questionRu: "проверь количество по смете",
    });

    expect(answer.providerTrace).toContain("aiEstimateProvider");
    expect(answer.answerRu).toContain("Смета или BOQ не привязаны");
    expect(answer.answerRu).not.toContain("estimate_dom1.pdf");
  });
});
