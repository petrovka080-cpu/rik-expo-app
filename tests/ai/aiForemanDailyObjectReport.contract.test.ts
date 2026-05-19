import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman daily object report", () => {
  it("contains dates, objects, works, missing data and source trace", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "подготовь отчеты по объектам что было сделано а что нет",
    });

    expect(answer.intent).toBe("daily_object_report");
    expect(answer.answerRu).toContain("19 мая 2026");
    expect(answer.answerRu).toContain("Дом 1");
    expect(answer.answerRu).toContain("Дом 2, санузел");
    expect(answer.answerRu).toContain("Монтаж перегородок");
    expect(answer.answerRu).toContain("Гидроизоляция санузла");
    expect(answer.answerRu).toContain("нет подписи ответственного");
    expect(answer.answerRu).toContain("Смета объекта");
    expect(answer.answerRu).toContain("Проект АР.pdf");
    expect(answer.status).toBe("draft_prepared");
  });
});
