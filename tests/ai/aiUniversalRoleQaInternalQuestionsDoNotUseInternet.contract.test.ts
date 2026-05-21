import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: internal questions do not use internet", () => {
  it("blocks public web even when provider is connected", () => {
    const answer = answerUniversalRoleQaFixture("какие платежи без документов", "accountant", "accountant", { web: true });
    expect(answer.sourcePlan.internetAllowed).toBe(false);
    expect(answer.sourceDisclosure.externalWeb).toBe("not_allowed");
    expect(answer.externalWebResults).toHaveLength(0);
  });
});
