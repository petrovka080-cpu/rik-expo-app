import { actionAnswer, normalUserRuntimeAnswer, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security debug runtime leak review", () => {
  it("keeps normal users permission-limited and hides internal health details", () => {
    const review = actionAnswer("debug_runtime_leak_review");
    expect(review.securityEvents.some((event) => event.eventType === "normal_user_debug_visibility")).toBe(true);

    const normalUser = normalUserRuntimeAnswer();
    expect(normalUser.answerKind).toBe("permission_limited_answer");
    expect(normalUser.events).toHaveLength(0);
    expect(normalUser.hiddenByPermission.length).toBeGreaterThan(0);
    expectReadOnly(normalUser);
  });
});
