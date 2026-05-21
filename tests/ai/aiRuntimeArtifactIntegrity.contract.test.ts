import { actionAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("runtime artifact integrity", () => {
  it("surfaces artifact integrity as sourced needs-review state", () => {
    const answer = actionAnswer("artifact_integrity_report", "dev");
    expect(answer.answerKind).toBe("runtime_diagnosis");
    expect(answer.runtimeEvents.some((event) => event.eventType === "artifact_stale" || event.eventType === "artifact_missing")).toBe(true);
    expect(answer.runtimeEvents.every((event) => event.sourceRefs.length > 0)).toBe(true);
  });
});
