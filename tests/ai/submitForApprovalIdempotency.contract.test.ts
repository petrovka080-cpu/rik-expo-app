import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

describe("submit_for_approval idempotency", () => {
  it("reuses the same pending action for the same idempotency key", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const repository = createAiActionLedgerRepository(backend);
    const request = {
      auth: { userId: "buyer-user", role: "buyer" as const },
      repository,
      input: {
        draft_id: "draft-request-idempotent",
        approval_target: "request",
        screen_id: "buyer.main",
        domain: "procurement",
        summary: "Submit idempotent request",
        idempotency_key: "submit-approval-idempotency-0001",
        evidence_refs: ["draft:evidence:idempotency"],
      },
    };

    const first = await runSubmitForApprovalToolGate(request);
    const second = await runSubmitForApprovalToolGate(request);

    expect(first).toMatchObject({ ok: true, data: { action_status: "pending" } });
    expect(second).toMatchObject({ ok: true, data: { action_status: "pending" } });
    if (!first.ok || !second.ok) throw new Error("expected idempotent success");

    expect(second.data.action_id).toBe(first.data.action_id);
    expect(records.size).toBe(1);
    expect(second.data.audit_event_count).toBeGreaterThanOrEqual(1);
    expect(second.data.final_execution).toBe(0);
    expect(second.data.mutation_count).toBe(0);
  });
});
