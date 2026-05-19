import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman cross-role finance leak guard", () => {
  it("removes payment and full cashflow sources from foreman answers", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture(),
      questionRu: "покажи движение денег и что блокирует объект",
    });

    expect(answer.sources.some((source) => source.type === "payment")).toBe(false);
    expect(answer.answerRu).not.toContain("Полный cashflow компании");
    expect(answer.answerRu).not.toContain("payment");
  });
});
