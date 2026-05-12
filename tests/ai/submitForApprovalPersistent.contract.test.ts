import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

describe("submit_for_approval persistent contract", () => {
  it("emits exact backend blocker instead of fake local approval when storage is missing", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "buyer-user", role: "buyer" },
        input: {
          draft_id: "draft-request-1",
          approval_target: "request",
          screen_id: "buyer.main",
          domain: "procurement",
          summary: "Submit request",
          idempotency_key: "missing-backend-key-0001",
          evidence_refs: ["draft:evidence:1"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SUBMIT_FOR_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND" },
    });
  });

  it("persists pending action with idempotency and no final execution", async () => {
    const { backend } = createContractTestActionLedgerBackend();
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "buyer-user", role: "buyer" },
        repository: createAiActionLedgerRepository(backend),
        input: {
          draft_id: "draft-request-2",
          approval_target: "request",
          screen_id: "buyer.main",
          domain: "procurement",
          summary: "Submit request",
          idempotency_key: "persisted-ledger-key-0001",
          evidence_refs: ["draft:evidence:2"],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        action_status: "pending",
        persisted: true,
        local_gate_only: false,
        mutation_count: 0,
        final_execution: 0,
        direct_execution_enabled: false,
      },
    });
  });
});
