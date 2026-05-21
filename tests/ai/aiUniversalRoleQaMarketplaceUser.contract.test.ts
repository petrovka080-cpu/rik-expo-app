import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: marketplace user", () => {
  it("prepares product card as draft only", () => {
    const answer = answerUniversalRoleQaFixture("подготовь карточку товара ГКЛ", "marketplace_user", "market");
    expect(answer.intent).toBe("marketplace_product_draft");
    expect(answer.safetyStatus.draftOnly).toBe(true);
    expect(answer.safetyStatus.finalSubmit).toBe(false);
    expectUniversalGuardPass(answer);
  });
});
