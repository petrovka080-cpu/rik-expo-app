import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director no fake company data", () => {
  it("does not invent sources when company context is empty", () => {
    const empty = {
      ...buildDirectorRealCompanyFixture(),
      approvals: [],
      works: [],
      procurementRequests: [],
      warehouse: [],
      finance: [],
      documents: [],
      reports: [],
      officeTasks: [],
      cashflowForecasts: [],
      securitySummaries: [],
      sources: [],
    };
    const answer = answerDirectorCompanyQuestion({ context: empty, questionRu: "что мне решить сегодня" });

    expect(answer.answerKind).toBe("exact_no_data_reason");
    expect(answer.events).toHaveLength(0);
    expect(answer.sourceTrace).toHaveLength(0);
    expect(answer.fakeDataCreated).toBe(false);
  });
});
