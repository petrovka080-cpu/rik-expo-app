import { actionAnswer, expectReadOnly, expectSources } from "./aiSecurityRuntimeTestHelpers";

describe("security forbidden attempts", () => {
  it("reports forbidden attempts from audit sources without inventing events", () => {
    const answer = actionAnswer("forbidden_attempts_report");
    expect(answer.answerKind).toBe("forbidden_attempts_report");
    expect(answer.securityEvents).toHaveLength(1);
    expect(answer.securityEvents[0]?.status).toBe("safe_read_only");
    expect(answer.securityEvents[0]?.evidence[0]?.sourceType).toBe("audit_log");
    expectSources(answer);
    expectReadOnly(answer);
  });
});
