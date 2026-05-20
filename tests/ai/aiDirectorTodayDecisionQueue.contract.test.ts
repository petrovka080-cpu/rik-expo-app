import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director today decision queue", () => {
  it("returns top decision with period, risks, missing data and sources", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "что мне решить сегодня",
    });

    expect(answer.answerKind).toBe("decision_queue");
    expect(answer.period?.labelRu).toBe("19 мая 2026");
    expect(answer.topDecision?.reasonRu).toContain("missing");
    expect(answer.missingData.join(" ")).toContain("наклад");
    expect(answer.events[0]?.risks.length).toBeGreaterThan(0);
    expect(answer.sources.length).toBeGreaterThan(4);
  });
});
