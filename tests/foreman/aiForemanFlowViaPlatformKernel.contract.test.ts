import { createAiRuntimeKernel } from "../../src/lib/aiPlatform";

describe("foreman AI flow via platform kernel", () => {
  it("routes foreman document draft through draft policy and ledger", async () => {
    const result = await createAiRuntimeKernel().run({
      flowId: "foreman-kernel",
      role: "foreman",
      surface: "foreman",
      intent: "draft report",
      userText: "prepare daily field report",
      mode: "draft_only",
      sourceSha: "test",
      runtimeVersion: "ai-platform-kernel-v1",
    });
    expect(result.status).toBe("completed");
    expect(result.toolPlan?.mode).toBe("draft_only");
    expect(result.diagnostics?.redactionPassed).toBe(true);
  });
});
