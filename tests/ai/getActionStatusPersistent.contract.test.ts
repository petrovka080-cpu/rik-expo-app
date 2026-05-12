import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { runGetActionStatusToolSafeRead } from "../../src/features/ai/tools/getActionStatusTool";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

describe("get_action_status persistent contract", () => {
  it("reads persisted ledger status when repository is mounted", async () => {
    const { backend } = createContractTestActionLedgerBackend();
    const repository = createAiActionLedgerRepository(backend);
    const submitted = await repository.submitForApproval(
      {
        actionType: "draft_act",
        screenId: "contractor.main",
        domain: "subcontracts",
        summary: "Submit act",
        redactedPayload: { actHash: "act:1" },
        evidenceRefs: ["act:evidence:1"],
        idempotencyKey: "status-ledger-key-0001",
        requestedByUserIdHash: "user:contractor",
        organizationIdHash: "org:demo",
      },
      "contractor",
    );

    await expect(
      runGetActionStatusToolSafeRead({
        auth: { userId: "contractor-user", role: "contractor" },
        repository,
        input: { action_id: submitted.actionId },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        status: "approval_required",
        action_status: "pending",
        lookup_performed: true,
        persisted: true,
        db_accessed: true,
        mutation_count: 0,
        final_execution: 0,
      },
    });
  });
});
