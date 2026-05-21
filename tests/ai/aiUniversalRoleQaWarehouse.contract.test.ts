import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: warehouse", () => {
  it("traces material movement through warehouse issue refs", () => {
    const answer = answerUniversalRoleQaFixture("куда ушёл ГКЛ", "warehouse", "warehouse");
    expect(answer.intent).toBe("warehouse_issue_trace");
    expect(answer.entity).toBe("warehouse_issue");
    expect(answer.openLinks.some((link) => link.sourceRefId.includes("warehouse_issue"))).toBe(true);
    expectUniversalGuardPass(answer);
  });
});
