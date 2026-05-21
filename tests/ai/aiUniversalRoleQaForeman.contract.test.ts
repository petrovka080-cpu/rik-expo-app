import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: foreman", () => {
  it("keeps foreman explicit procurement question as procurement, not workday summary", () => {
    const answer = answerUniversalRoleQaFixture("сколько заявок было за май", "foreman", "foreman");
    expect(answer.intent).toBe("app_data_count");
    expect(answer.entity).toBe("procurement_request");
    expect(answer.shortAnswerRu).not.toContain("работы сегодня");
    expectUniversalGuardPass(answer);
  });
});
