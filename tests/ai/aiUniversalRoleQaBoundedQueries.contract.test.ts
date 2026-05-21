import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: bounded queries", () => {
  it("requires bounded retrieval for app-data questions", () => {
    const answer = answerUniversalRoleQaFixture("сколько заявок было за май", "director", "director");
    expect(answer.sourcePlan.boundedQueryRequired).toBe(true);
    expect(answer.sourcePlan.permissionScopeRequired).toBe(true);
    expect(answer.sourcePlan.reasonRu).toContain("app context graph");
  });
});
