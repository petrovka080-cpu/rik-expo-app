import { runtimeAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("runtime exact blocker", () => {
  it("does not fake green when release verify has no fresh green artifact", () => {
    const answer = runtimeAnswer("какой exact blocker");
    const blockerText = JSON.stringify(answer.runtimeEvents.map((event) => event.exactBlockerRu ?? ""));
    expect(blockerText).toMatch(/Release verify|fake green|BLOCKED/i);
    expect(answer.changedData).toBe(false);
  });
});
