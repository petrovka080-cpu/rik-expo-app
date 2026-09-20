import { createAiRuntimeKernel } from "../../src/lib/aiPlatform";

describe("request estimate via AI platform kernel", () => {
  it("creates an estimate draft through the kernel plugin boundary", async () => {
    const kernel = createAiRuntimeKernel({
      estimatePlugin: {
        pluginId: "ai_estimate",
        async run({ runInput }) {
          return {
            flowId: runInput.flowId,
            status: "completed",
            userVisibleAnswerRu: "Черновик сметы создан.",
            draft: { backendCanonical: true, sourceText: runInput.userText },
          };
        },
      },
    });
    const result = await kernel.run({
      flowId: "request-estimate-kernel",
      role: "consumer",
      surface: "estimate",
      intent: "bathroom repair 12 m2",
      userText: "bathroom repair 12 m2",
      mode: "draft_only",
      sourceSha: "test",
      runtimeVersion: "ai-platform-kernel-v1",
    });
    expect(result.status).toBe("completed");
    expect(result.draft).toMatchObject({ backendCanonical: true, sourceText: "bathroom repair 12 m2" });
    expect(result.toolPlan?.directExecutionEnabled).toBe(false);
    expect(result.diagnostics?.ledgerRecordId).toBeTruthy();
  });
});
