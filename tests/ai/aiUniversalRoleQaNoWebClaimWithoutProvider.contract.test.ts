import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: no web claim without provider", () => {
  it("marks external web as not_connected when no provider results are connected", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director");
    expect(answer.sourcePlan.internetAllowed).toBe(true);
    expect(answer.sourceDisclosure.externalWeb).toBe("not_connected");
    expect(answer.externalWebResults).toHaveLength(0);
  });
});
