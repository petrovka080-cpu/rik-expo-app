import { executeApprovedActionGateway } from "../../src/features/ai/executors/executeApprovedActionGateway";
import { createApprovedActionExecutionAuditEvent } from "../../src/features/ai/executors/executeApprovedActionAudit";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
  EXECUTOR_NOW,
} from "./approvedProcurementExecutorTestUtils";

describe("executeApprovedActionAudit contract", () => {
  it("creates redacted audit events for execution lifecycle", async () => {
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

    expect(result.auditEvents.map((event) => event.eventType)).toEqual([
      "ai.action.execute_requested",
      "ai.action.execute_requested",
      "ai.action.executed",
    ]);
    expect(auditEvents.at(-1)).toMatchObject({
      eventType: "ai.action.executed",
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });
  });

  it("redacts secret-like text in audit reasons", () => {
    const event = createApprovedActionExecutionAuditEvent({
      eventType: "ai.action.execution_blocked",
      record: createApprovedProcurementAction(),
      request: {
        actionId: "ai-action-approved-procurement-1",
        idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      reason: "Authorization: Bearer secret-token",
    });

    expect(event.reason).not.toContain("secret-token");
    expect(event.credentialsExposed).toBe(false);
  });
});
