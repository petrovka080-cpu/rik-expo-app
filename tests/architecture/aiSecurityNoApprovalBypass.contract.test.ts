import { matrixPartial, securityAnswer } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI security no approval bypass", () => {
  it("keeps approval decisions unchanged and reports no direct approve/reject path", () => {
    expect(matrixPartial().approval_bypass_found).toBe(0);
    expect(matrixPartial().direct_approve_reject_paths_found).toBe(0);
    const answer = securityAnswer("есть ли approval bypass");
    expect(answer.approvalChangedByAi).toBe(false);
  });
});
