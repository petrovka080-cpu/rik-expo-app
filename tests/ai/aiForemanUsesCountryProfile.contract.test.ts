import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanNoPdfFixture, buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman country profile and norms", () => {
  it("uses country profile and norm providers when a norm source exists", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "какие нормы нужны для закрытия",
    });

    expect(answer.providerTrace).toContain("aiCountryProfileProvider");
    expect(answer.providerTrace).toContain("aiConstructionNormsProvider");
    expect(answer.answerRu).toContain("Требования к закрытию работ.pdf");
    expect(answer.answerRu).toContain("Country profile KG");
  });

  it("labels general guidance and does not assert country norms without source", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanNoPdfFixture(),
      questionRu: "по нормам Кыргызстана что нужно закрыть",
    });

    expect(answer.answerRu).toContain("Общий строительный чек-лист");
    expect(answer.answerRu).toContain("не найден привязанный нормативный документ");
    expect(answer.answerRu).not.toContain("По нормам Кыргызстана требуется");
  });
});
