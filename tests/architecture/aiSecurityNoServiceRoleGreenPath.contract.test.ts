import { matrixPartial, securityAnswer, expectNoRawSecrets } from "../ai/aiSecurityRuntimeTestHelpers";

describe("AI security no service role green path", () => {
  it("does not treat privileged service paths as a green path or reveal key values", () => {
    expect(matrixPartial().privileged_service_green_path_found).toBe(false);
    const answer = securityAnswer("есть ли service_role путь");
    expect(answer.securityEvents.every((event) => event.status === "safe_read_only")).toBe(true);
    expectNoRawSecrets(answer);
  });
});
