import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: contractor", () => {
  it("keeps contractor scope limited and blocks finance visibility", () => {
    const answer = answerUniversalRoleQaFixture("что мешает закрыть мои работы", "contractor", "contractor");
    expect(answer.intent).toBe("contractor_acceptance_review");
    expect(answer.role).toBe("contractor");
    expect(answer.permissionLimits.some((limit) => limit.reasonRu.includes("finance"))).toBe(true);
    expect(answer.openLinks.some((link) => link.enabled && link.sourceRefId.includes(":payment:"))).toBe(false);
    expectUniversalGuardPass(answer);
  });
});
