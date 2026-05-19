import { answerForemanWorkdayQuestion } from "../../src/lib/ai/foremanIntelligence";
import { buildForemanRealWorkdayFixture } from "./aiForemanRealWorkday.fixture";

describe("Foreman no selected work overblocking", () => {
  it("answers by day and objects instead of blocking on missing selected work", () => {
    const answer = answerForemanWorkdayQuestion({
      context: buildForemanRealWorkdayFixture({ selectedWorkId: undefined }),
      questionRu: "что сделано и что не сделано",
    });

    expect(answer.noSelectedWorkOverblocked).toBe(false);
    expect(answer.answerRu).toContain("Дом 1");
    expect(answer.answerRu).toContain("Дом 2, санузел");
    expect(answer.answerRu).not.toMatch(/выберите работу|нужен конкретный источник/i);
  });
});
