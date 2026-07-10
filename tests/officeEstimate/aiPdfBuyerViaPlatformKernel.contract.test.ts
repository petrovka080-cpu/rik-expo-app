import { createAiRuntimeKernel } from "../../src/lib/aiPlatform";

describe("PDF buyer AI flow via platform kernel", () => {
  it("keeps document generation as draft-only unless approval is requested", async () => {
    const draft = await createAiRuntimeKernel().run({
      flowId: "pdf-buyer-kernel",
      role: "office",
      surface: "document",
      intent: "build buyer handoff draft",
      userText: "prepare buyer handoff",
      mode: "draft_only",
      sourceSha: "test",
      runtimeVersion: "ai-platform-kernel-v1",
    });
    expect(draft.status).toBe("completed");
    expect(draft.toolPlan?.approvalRequired).toBe(false);

    const approval = await createAiRuntimeKernel().run({
      flowId: "pdf-buyer-approval-kernel",
      role: "office",
      surface: "document",
      intent: "submit buyer handoff",
      userText: "submit buyer handoff",
      mode: "approval_required",
      sourceSha: "test",
      runtimeVersion: "ai-platform-kernel-v1",
    });
    expect(approval.status).toBe("needs_approval");
    expect(approval.requiredApproval).toBeTruthy();
  });
});
