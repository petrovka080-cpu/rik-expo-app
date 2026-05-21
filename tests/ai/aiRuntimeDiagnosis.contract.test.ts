import { expectReadOnly, expectSources, runtimeAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("runtime diagnosis", () => {
  it("returns sanitized dev/admin runtime diagnosis with source refs", () => {
    const answer = runtimeAnswer("runtime health");
    expect(answer.answerKind).toBe("runtime_diagnosis");
    expect(answer.runtimeEvents.length).toBeGreaterThan(0);
    expect(answer.runtimeEvents.every((event) => event.sourceRefs.length > 0)).toBe(true);
    expectSources(answer);
    expectReadOnly(answer);
  });
});
