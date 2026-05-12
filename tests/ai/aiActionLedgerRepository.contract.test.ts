import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

const pendingInput = {
  actionType: "draft_request" as const,
  screenId: "buyer.main",
  domain: "procurement" as const,
  summary: "Submit draft request for approval",
  redactedPayload: { draftHash: "draft:1" },
  evidenceRefs: ["draft:evidence:1"],
  idempotencyKey: "ledger-idempotency-0001",
  requestedByUserIdHash: "user:buyer",
  organizationIdHash: "org:demo",
};

describe("AI action ledger repository contract", () => {
  it("emits an exact blocker when persistent backend is not mounted", async () => {
    await expect(
      createAiActionLedgerRepository(null).submitForApproval(pendingInput, "buyer"),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      persisted: false,
      fakeLocalApproval: false,
      finalExecution: false,
    });
  });

  it("persists a pending action when a backend is mounted", async () => {
    const { backend } = createContractTestActionLedgerBackend();
    const result = await createAiActionLedgerRepository(backend).submitForApproval(
      pendingInput,
      "buyer",
    );

    expect(result).toMatchObject({
      status: "pending",
      persisted: true,
      persistentBackend: true,
      idempotencyReused: false,
      fakeLocalApproval: false,
      finalExecution: false,
    });
    expect(result.record).toMatchObject({
      status: "pending",
      role: "buyer",
      evidenceRefs: ["draft:evidence:1"],
      idempotencyKey: "ledger-idempotency-0001",
    });
  });
});
