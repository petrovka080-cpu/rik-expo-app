import { scoreAllAiRoleMagicBlueprints } from "../../src/features/ai/roleMagic/aiRoleMagicOpportunityScorer";

describe("AI role magic opportunity scorer", () => {
  it("scores every role as production-ready only when empathy, prepared work, buttons, QA and safety are present", () => {
    const scores = scoreAllAiRoleMagicBlueprints();

    expect(scores).toHaveLength(12);
    expect(scores.every((score) => score.totalScore >= 95)).toBe(true);
    expect(scores.every((score) => score.topOpportunities.length > 0)).toBe(true);
    expect(scores.find((score) => score.roleId === "buyer")?.topOpportunities.join(" ")).toContain("request");
    expect(scores.find((score) => score.roleId === "accountant")?.topOpportunities.join(" ")).toContain("payment");
  });
});
