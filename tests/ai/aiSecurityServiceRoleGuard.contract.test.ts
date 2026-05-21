import { actionAnswer, expectNoRawSecrets, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security service role guard", () => {
  it("guards privileged service paths without exposing a key or using them as green path", () => {
    const answer = actionAnswer("privileged_service_guard_report");
    expect(answer.answerKind).toBe("privileged_service_guard_report");
    expect(answer.securityEvents.some((event) => event.eventType === "privileged_service_green_path")).toBe(true);
    expect(answer.securityEvents.every((event) => event.status === "safe_read_only")).toBe(true);
    expectNoRawSecrets(answer);
    expectReadOnly(answer);
  });
});
