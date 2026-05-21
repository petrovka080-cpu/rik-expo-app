import { actionAnswer, expectReadOnly, expectSources } from "./aiSecurityRuntimeTestHelpers";

describe("security report draft", () => {
  it("prepares a draft report without changing roles, policies, or approvals", () => {
    const answer = actionAnswer("security_report_draft");
    expect(answer.answerKind).toBe("security_report_draft");
    expect(answer.status).toBe("draft_prepared");
    expect(answer.shortAnswerRu).toContain("Черновик");
    expectSources(answer);
    expectReadOnly(answer);
  });
});
