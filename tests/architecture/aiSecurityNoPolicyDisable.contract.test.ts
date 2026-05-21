import { securityAnswer } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI security no policy disable", () => {
  it("does not disable policies from security review", () => {
    const answer = securityAnswer("покажи policy gaps");
    expect(answer.policyDisabled).toBe(false);
    expect(answer.changedData).toBe(false);
  });
});
