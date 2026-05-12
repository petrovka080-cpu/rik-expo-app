import {
  AI_APPROVAL_INBOX_BFF_CONTRACT,
  getApprovalInboxBff,
  loadApprovalInbox,
} from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox runtime contract", () => {
  it("reads the persistent ledger and never fabricates local approval state", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovalInboxRecord({
      actionId: "approval-inbox-runtime-action",
      summary: "AI prepared procurement request",
    });
    records.set(record.actionId, record);

    await expect(
      loadApprovalInbox({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
      }),
    ).resolves.toMatchObject({
      status: "loaded",
      persistentLedgerUsed: true,
      fakeLocalApproval: false,
      mutationCount: 0,
      finalMutationAllowed: false,
      counts: { pending: 1 },
      actions: [
        expect.objectContaining({
          actionId: "approval-inbox-runtime-action",
          evidenceRefs: ["evidence:approval:1"],
          requiresApproval: true,
        }),
      ],
    });
  });

  it("emits an exact backend blocker instead of fake local approval when storage is missing", async () => {
    await expect(
      loadApprovalInbox({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend: null,
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      persistentLedgerUsed: false,
      fakeLocalApproval: false,
    });
  });

  it("exposes route contracts through the agent BFF envelope", async () => {
    const { backend } = createContractTestActionLedgerBackend();
    await expect(
      getApprovalInboxBff({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        contractId: AI_APPROVAL_INBOX_BFF_CONTRACT.contractId,
        documentType: "ai_approval_inbox",
        endpoint: "GET /agent/approval-inbox",
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        providerCalled: false,
      },
    });
  });
});
