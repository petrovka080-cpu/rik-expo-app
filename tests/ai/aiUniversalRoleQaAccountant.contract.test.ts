import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: accountant", () => {
  it("reviews payments without documents and does not post payments", () => {
    const answer = answerUniversalRoleQaFixture("какие платежи без документов", "accountant", "accountant");
    expect(answer.intent).toBe("finance_payment_review");
    expect(answer.entity).toBe("payment");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
    expect(answer.sourceDisclosure.externalWeb).toBe("not_allowed");
    expectUniversalGuardPass(answer);
  });
});
