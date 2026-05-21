import { securityAnswer } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI security no role mutation", () => {
  it("does not mutate roles or grant/revoke permissions from AI answers", () => {
    const answer = securityAnswer("проверить роли");
    expect(answer.rolePolicyMutated).toBe(false);
    expect(answer.permissionGranted).toBe(false);
    expect(answer.permissionRevoked).toBe(false);
    expect(answer.changedData).toBe(false);
  });
});
