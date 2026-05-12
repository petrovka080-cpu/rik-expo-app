import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

describe("AI action ledger idempotency contract", () => {
  it("reuses the same pending action for the same organization idempotency key", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const repository = createAiActionLedgerRepository(backend);
    const input = {
      actionType: "draft_report" as const,
      screenId: "reports.modal",
      domain: "reports" as const,
      summary: "Submit report draft",
      redactedPayload: { reportHash: "report:1" },
      evidenceRefs: ["report:evidence:1"],
      idempotencyKey: "same-ledger-key-0001",
      requestedByUserIdHash: "user:foreman",
      organizationIdHash: "org:demo",
    };

    const first = await repository.submitForApproval(input, "foreman");
    const second = await repository.submitForApproval(input, "foreman");

    expect(first.status).toBe("pending");
    expect(second).toMatchObject({
      status: "pending",
      idempotencyReused: true,
      actionId: first.actionId,
    });
    expect(records.size).toBe(1);
  });
});
