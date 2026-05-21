import { expectReadOnly, expectSources, securityAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("security overview grounded", () => {
  it("returns security events with evidence and a safe next step", () => {
    const answer = securityAnswer("какие риски безопасности");
    expect(answer.answerKind).toBe("security_overview");
    expect(answer.securityEvents.length).toBeGreaterThan(0);
    expect(answer.securityEvents.every((event) => event.evidence.length > 0)).toBe(true);
    expect(answer.nextStepRu.length).toBeGreaterThan(20);
    expectSources(answer);
    expectReadOnly(answer);
  });
});
