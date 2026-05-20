import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director security summary no raw leak", () => {
  it("shows safe security summary while hiding runtime/provider/secrets", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "покажи security summary",
    });

    expect(answer.answerKind).toBe("decision_queue");
    expect(answer.hiddenTechnicalData.length).toBeGreaterThan(0);
    expect(answer.answerRu).not.toContain("service_role");
    expect(answer.answerRu).not.toContain("provider payload");
    expect(answer.answerRu).not.toContain("runtime dump");
  });
});
