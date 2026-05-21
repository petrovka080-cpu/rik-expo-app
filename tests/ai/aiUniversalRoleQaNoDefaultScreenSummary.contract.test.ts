import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: no default screen summary", () => {
  it("does not answer foreman screen summary for explicit request-count question", () => {
    const answer = answerUniversalRoleQaFixture("сколько заявок было за май", "foreman", "foreman");
    expect(answer.intent).toBe("app_data_count");
    expect(answer.shortAnswerRu).toContain("заяв");
    expect(answer.shortAnswerRu).not.toContain("работы сегодня");
  });
});
