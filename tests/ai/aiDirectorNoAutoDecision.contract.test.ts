import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director no auto decision", () => {
  it("never decides on behalf of director", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "согласуй главный платёж",
    });

    expect(answer.approvedByAi).toBe(false);
    expect(answer.rejectedByAi).toBe(false);
    expect(answer.answerRu).toContain("AI не принял решение");
    expect(answer.events.every((event) => event.decisionOptions.every((option) => option.unsafeDirectAction === false))).toBe(true);
  });
});
