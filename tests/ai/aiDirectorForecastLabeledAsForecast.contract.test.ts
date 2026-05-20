import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director forecast labeling", () => {
  it("labels forecast as forecast and keeps sources", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "покажи cashflow прогноз",
    });

    expect(answer.answerKind).toBe("cashflow_risk_summary");
    expect(answer.answerRu).toContain("Это прогноз, не факт");
    expect(answer.sourceTrace).toContain("src:cashflow:CF-7");
    expect(answer.fakeDataCreated).toBe(false);
  });
});
