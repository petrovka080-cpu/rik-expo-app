import { actionAnswer, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security Auth Admin guard", () => {
  it("does not allow Auth Admin/listUsers as a user-facing green path", () => {
    const answer = actionAnswer("auth_admin_guard_report");
    expect(answer.securityEvents.some((event) => event.eventType === "auth_admin_green_path")).toBe(true);
    expect(answer.securityEvents.every((event) => event.status === "safe_read_only")).toBe(true);
    expect(answer.permissionGranted).toBe(false);
    expectReadOnly(answer);
  });
});
