import { probeAiActionLedgerRuntimeHealth } from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeHealth";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

describe("AI action ledger RPC status lifecycle", () => {
  it("persists pending, approved, and rejected lifecycle through a mounted backend repository", async () => {
    const { backend, auditEvents } = createContractTestActionLedgerBackend();
    const repository = createAiActionLedgerRepository(backend);

    const submitted = await repository.submitForApproval({
      actionType: "draft_request",
      screenId: "ai.command.center",
      domain: "procurement",
      summary: "Persist pending lifecycle",
      redactedPayload: { previewRef: "ai.knowledge.preview" },
      evidenceRefs: ["ai.lifecycle:evidence"],
      idempotencyKey: "ai-ledger-lifecycle-0001",
      requestedByUserIdHash: "user:director",
      organizationIdHash: "org:lifecycle",
    }, "director");
    expect(submitted).toMatchObject({
      status: "pending",
      persisted: true,
      fakeLocalApproval: false,
      finalExecution: false,
    });

    await expect(repository.getStatus(submitted.actionId!, "director")).resolves.toMatchObject({
      status: "pending",
      persistedLookup: true,
    });
    await expect(
      repository.approve({
        actionId: submitted.actionId!,
        approverRole: "director",
        approvedByUserIdHash: "user:director",
      }),
    ).resolves.toMatchObject({
      status: "approved",
      persisted: true,
      finalExecution: false,
    });

    const rejectedSubmit = await repository.submitForApproval({
      actionType: "draft_request",
      screenId: "ai.command.center",
      domain: "procurement",
      summary: "Persist rejected lifecycle",
      redactedPayload: { previewRef: "ai.knowledge.preview" },
      evidenceRefs: ["ai.lifecycle:evidence:reject"],
      idempotencyKey: "ai-ledger-lifecycle-0002",
      requestedByUserIdHash: "user:director",
      organizationIdHash: "org:lifecycle",
    }, "director");
    await expect(
      repository.reject({
        actionId: rejectedSubmit.actionId!,
        rejectorRole: "director",
        rejectedByUserIdHash: "user:director",
        reason: "not needed",
      }),
    ).resolves.toMatchObject({
      status: "rejected",
      persisted: true,
    });
    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "ai.action.submitted_for_approval",
        "ai.action.approved",
        "ai.action.rejected",
      ]),
    );
  });

  it("classifies missing PostgREST RPC as an exact deployment blocker", async () => {
    const transport: AiActionLedgerRpcTransport = async () => ({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.ai_action_ledger_get_status_v1 in the schema cache",
      },
    });

    await expect(
      probeAiActionLedgerRuntimeHealth({
        transport,
        probeActionId: "00000000-0000-4000-8000-000000000001",
        actorRole: "director",
      }),
    ).resolves.toMatchObject({
      status: "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
      checkedRpc: AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      rawDbRowsExposed: false,
      secretsPrinted: false,
      serviceRoleFromMobile: false,
    });
  });
});
