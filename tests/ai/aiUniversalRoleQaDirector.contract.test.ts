import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: director", () => {
  it("answers director decision questions from internal graph", () => {
    const answer = answerUniversalRoleQaFixture("что мне решить сегодня", "director", "director");
    expect(answer.intent).toBe("director_decision_summary");
    expect(answer.sourceDisclosure.externalWeb).toBe("not_allowed");
    expect(answer.safetyStatus.changedData).toBe(false);
    expectUniversalGuardPass(answer);
  });
});
