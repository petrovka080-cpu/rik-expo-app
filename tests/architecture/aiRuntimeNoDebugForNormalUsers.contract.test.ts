import { normalUserRuntimeAnswer } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI runtime no debug for normal users", () => {
  it("returns permission-limited normal user answers without events", () => {
    const answer = normalUserRuntimeAnswer();
    expect(answer.answerKind).toBe("permission_limited_answer");
    expect(answer.events).toHaveLength(0);
    expect(answer.hiddenByPermission.length).toBeGreaterThan(0);
  });
});
