import {
  executeApprovedApprovalInboxAction,
  loadApprovalInbox,
} from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  approvalInboxOrgHash,
} from "./approvalInboxTestUtils";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
} from "./approvedProcurementExecutorTestUtils";

describe("Approval Inbox execute-approved integration contract", () => {
  it("shows approved procurement actions as ready to execute only when executor is mounted", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction({
      organizationIdHash: approvalInboxOrgHash("director"),
    });
    records.set(record.actionId, record);

    const inbox = await loadApprovalInbox({
      auth: approvalInboxAuth("director"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
      procurementExecutor: createCountingProcurementExecutor().executor,
    });

    expect(inbox.actions[0]).toMatchObject({
      actionId: record.actionId,
      executionAvailable: true,
      executionStatus: "ready_to_execute",
    });
  });

  it("executes through the ledger BFF gateway and updates persisted status", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction({
      organizationIdHash: approvalInboxOrgHash("director"),
    });
    records.set(record.actionId, record);
    const { executor, calls } = createCountingProcurementExecutor();

    const envelope = await executeApprovedApprovalInboxAction({
      auth: approvalInboxAuth("director"),
      actionId: record.actionId,
      backend,
      procurementExecutor: executor,
    });

    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;
    expect(envelope.data.result).toMatchObject({
      status: "executed",
      idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
    });
    expect(records.get(record.actionId)?.status).toBe("executed");
    expect(calls).toHaveLength(1);
  });
});
