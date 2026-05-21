import { actionAnswer, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security approval bypass review", () => {
  it("keeps approve/reject/pay/order/stock/work paths read-only and ledger-scoped", () => {
    const answer = actionAnswer("approval_bypass_review");
    expect(answer.answerKind).toBe("approval_safety_review");
    expect(answer.securityEvents.some((event) => event.eventType === "approval_bypass_risk")).toBe(true);
    expect(answer.securityEvents.every((event) => event.unsafeActionsForbidden.includes("approve_directly"))).toBe(true);
    expect(answer.approvalChangedByAi).toBe(false);
    expectReadOnly(answer);
  });
});
