import { executeApprovedActionGateway } from "../../src/features/ai/executors/executeApprovedActionGateway";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
  EXECUTOR_NOW,
} from "./approvedProcurementExecutorTestUtils";

describe("approved procurement execution audit runtime", () => {
  it("records redacted audit evidence for execute-approved and never exposes raw rows or provider payloads", async () => {
    const { backend, records, auditEvents } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction();
    records.set(record.actionId, record);

    const result = await executeApprovedActionGateway({
      backend,
      request: {
        actionId: record.actionId,
        idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      executors: { procurement: createCountingProcurementExecutor().executor },
      nowIso: EXECUTOR_NOW,
    });

    expect(result.status).toBe("executed");
    expect(result.auditEvents.map((event) => event.eventType)).toEqual([
      "ai.action.execute_requested",
      "ai.action.execute_requested",
      "ai.action.executed",
    ]);
    expect(auditEvents.at(-1)).toMatchObject({
      eventType: "ai.action.executed",
      evidenceRefs: ["evidence:procurement:request:1"],
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      credentialsExposed: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/raw_prompt|provider_payload|Authorization:\s*Bearer|secret-token/i);
  });
});
