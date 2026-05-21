import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: buyer", () => {
  it("checks marketplace and supplier history before web", () => {
    const answer = answerUniversalRoleQaFixture("найди поставщиков ГКЛ", "buyer", "buyer", { web: true });
    expect(answer.intent).toBe("marketplace_supplier_search");
    expect(answer.sourcePlan.sourceOrder.indexOf("internal_marketplace")).toBeLessThan(answer.sourcePlan.sourceOrder.indexOf("public_web"));
    expect(answer.sourceDisclosure.marketplace).toBe("used");
    expectUniversalGuardPass(answer);
  });
});
