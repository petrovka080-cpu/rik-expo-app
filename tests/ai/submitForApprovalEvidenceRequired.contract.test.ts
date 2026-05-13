import { assertSubmitForApprovalAuditPolicy } from "../../src/features/ai/approvalAudit/submitForApprovalAuditPolicy";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";

describe("submit_for_approval evidence requirement", () => {
  it("blocks audit policy without evidence refs", () => {
    expect(
      assertSubmitForApprovalAuditPolicy({
        actionType: "submit_request",
        role: "buyer",
        screenId: "buyer.main",
        domain: "procurement",
        summary: "Submit request",
        redactedPayload: { draft_id: "draft-1" },
        evidenceRefs: [],
        idempotencyKey: "submit-evidence-required-0001",
      }),
    ).toMatchObject({
      allowed: false,
      reason: "evidence_required",
    });
  });

  it("blocks the public tool before persistence when evidence refs are missing", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "buyer-user", role: "buyer" },
        input: {
          draft_id: "draft-no-evidence",
          approval_target: "request",
          screen_id: "buyer.main",
          domain: "procurement",
          summary: "Submit request without evidence",
          idempotency_key: "submit-no-evidence-0001",
          evidence_refs: [],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT",
        message: expect.stringContaining("evidence_refs"),
      },
    });
  });
});
