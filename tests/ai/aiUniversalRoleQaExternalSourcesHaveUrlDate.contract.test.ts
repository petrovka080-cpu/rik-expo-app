import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: external sources URL/date", () => {
  it("requires URL and checkedAt for every used external source", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    expect(answer.externalWebResults.length).toBeGreaterThan(0);
    expect(answer.externalWebResults.every((source) => source.url && source.checkedAt && source.domain)).toBe(true);
  });
});
