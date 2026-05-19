import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanNoPdfFixture, buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman PDF aggregator", () => {
  it("uses PDF aggregator for document and project questions", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "что по проекту",
    });

    expect(answer.providerTrace).toContain("aiPdfAggregatorProvider");
    expect(answer.answerRu).toContain("Проект АР.pdf");
    expect(answer.answerRu).toContain("стр. 14");
  });

  it("offers upload/select/link when PDF is absent without inventing PDF contents", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanNoPdfFixture(),
      questionRu: "что по проекту",
    });

    expect(answer.answerRu).toContain("Точный проектный источник не найден");
    expect(answer.answerRu).toContain("загрузить PDF проекта");
    expect(answer.answerRu).not.toContain("Проект АР.pdf, стр. 14");
  });
});
