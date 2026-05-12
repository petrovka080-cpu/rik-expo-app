import { loadApprovalInbox } from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox role scope contract", () => {
  it("allows director/control to see cross-domain pending actions", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    for (const record of [
      createApprovalInboxRecord({ actionId: "procurement-action", domain: "procurement" }),
      createApprovalInboxRecord({
        actionId: "finance-action",
        actionType: "change_payment_status",
        domain: "finance",
        screenId: "accountant.main",
        riskLevel: "approval_required",
        role: "accountant",
      }),
    ]) {
      records.set(record.actionId, record);
    }

    const result = await loadApprovalInbox({
      auth: approvalInboxAuth("director"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
    });

    expect(result.actions.map((action) => action.actionId).sort()).toEqual([
      "finance-action",
      "procurement-action",
    ]);
  });

  it("keeps contractor scope to own actions only", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    records.set(
      "own-action",
      createApprovalInboxRecord({
        actionId: "own-action",
        role: "contractor",
        domain: "documents",
        screenId: "contractor.main",
        requestedByUserId: "contractor-user",
      }),
    );
    records.set(
      "other-action",
      createApprovalInboxRecord({
        actionId: "other-action",
        role: "contractor",
        domain: "documents",
        screenId: "contractor.main",
        requestedByUserId: "another-contractor",
      }),
    );

    const result = await loadApprovalInbox({
      auth: approvalInboxAuth("contractor"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
    });

    expect(result.actions.map((action) => action.actionId)).toEqual(["own-action"]);
  });

  it("does not expose finance approvals to buyer role", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const finance = createApprovalInboxRecord({
      actionId: "finance-not-for-buyer",
      actionType: "change_payment_status",
      domain: "finance",
      screenId: "accountant.main",
      role: "accountant",
      riskLevel: "approval_required",
    });
    records.set(finance.actionId, finance);

    const result = await loadApprovalInbox({
      auth: approvalInboxAuth("buyer"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
    });

    expect(result.status).toBe("empty");
    expect(result.actions).toHaveLength(0);
  });
});
