import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanNoPdfFixture, buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

const forbiddenCopy = [
  "нужен конкретный источник",
  "Выберите работу",
  "проверен экран",
  "safe_read",
  "draft_only",
  "approval_required",
  "exact_blocker",
  "provider",
  "runtime",
  "transport",
  "mutation",
  "generic fallback",
];

describe("Foreman no generic blocker", () => {
  it("does not show generic or technical blocker copy in useful answers", () => {
    const answers = [
      answerForemanWorkdayQuestion({
        context: buildForemanRealWorkdayFixture(),
        questionRu: "подготовь отчеты по объектам что было сделано а что нет",
      }),
      answerForemanWorkdayQuestion({
        context: buildForemanNoPdfFixture(),
        questionRu: "что по проекту",
      }),
    ];

    for (const answer of answers) {
      for (const copy of forbiddenCopy) {
        expect(answer.answerRu).not.toContain(copy);
      }
      expect(answer.genericBlockerUsed).toBe(false);
    }
  });
});
