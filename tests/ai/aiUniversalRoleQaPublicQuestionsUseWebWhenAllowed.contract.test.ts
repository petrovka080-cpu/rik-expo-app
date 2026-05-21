import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: public questions use web when allowed", () => {
  it("uses connected web for public construction question", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    expect(answer.sourcePlan.internetAllowed).toBe(true);
    expect(answer.sourceDisclosure.externalWeb).toBe("used");
    expect(answer.externalWebResults.length).toBeGreaterThan(0);
  });
});
