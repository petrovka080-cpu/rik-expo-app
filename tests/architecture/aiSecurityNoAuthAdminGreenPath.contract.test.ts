import { matrixPartial, securityAnswer } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI security no Auth Admin green path", () => {
  it("does not allow Auth Admin/listUsers as a release green path", () => {
    expect(matrixPartial().auth_admin_green_path_found).toBe(false);
    const answer = securityAnswer("есть ли Auth Admin путь");
    expect(answer.securityEvents.some((event) => event.eventType === "auth_admin_green_path")).toBe(true);
    expect(answer.securityEvents.every((event) => event.status === "safe_read_only")).toBe(true);
  });
});
