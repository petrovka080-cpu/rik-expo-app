import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: core orchestrator", () => {
  it("understands the question and answers through source plan plus context graph", () => {
    const answer = answerUniversalRoleQaFixture("сколько заявок было за май", "foreman", "foreman");

    expect(answer.intent).toBe("app_data_count");
    expect(answer.entity).toBe("procurement_request");
    expect(answer.filters.period?.labelRu).toBe("май 2026");
    expect(answer.sourcePlan.boundedQueryRequired).toBe(true);
    expect(answer.sourceRefs.length).toBeGreaterThan(0);
    expect(answer.openLinks.length).toBeGreaterThan(0);
    expect(answer.shortAnswerRu).toContain("май 2026");
    expect(answer.safetyStatus.changedData).toBe(false);
    expectUniversalGuardPass(answer);
  });
});
