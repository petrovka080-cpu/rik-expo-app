import { createAiRuntimeKernel } from "../../src/lib/aiPlatform";

describe("consumer repair AI flow via platform kernel", () => {
  it("keeps consumer estimate flow in draft-only mode", async () => {
    const result = await createAiRuntimeKernel({
      estimatePlugin: {
        pluginId: "ai_estimate",
        async run({ runInput }) {
          return {
            flowId: runInput.flowId,
            status: "completed",
            userVisibleAnswerRu: "Черновик сметы создан через kernel plugin boundary.",
            draft: { backendCanonical: true },
          };
        },
      },
    }).run({
      flowId: "consumer-repair-kernel",
      role: "consumer",
      surface: "estimate",
      intent: "apartment repair",
      userText: "apartment repair 48 m2",
      mode: "draft_only",
      sourceSha: "test",
      runtimeVersion: "ai-platform-kernel-v1",
    });
    expect(result.status).toBe("completed");
    expect(result.toolPlan?.mode).toBe("draft_only");
    expect(result.toolPlan?.mutationAllowed).toBe(false);
    expect(result.draft).toMatchObject({ backendCanonical: true });
    expect(result.diagnostics?.ledgerRecordId).toBeTruthy();
  });
});
