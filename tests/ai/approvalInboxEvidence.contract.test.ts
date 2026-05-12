import { loadApprovalInbox } from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import {
  buildApprovalInboxRiskFlags,
  hasApprovalInboxEvidence,
} from "../../src/features/ai/approvalInbox/approvalInboxEvidence";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox evidence contract", () => {
  it("does not render cards without evidence refs", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const withoutEvidence = createApprovalInboxRecord({
      actionId: "missing-evidence",
      evidenceRefs: [],
    });
    records.set(withoutEvidence.actionId, withoutEvidence);

    await expect(
      loadApprovalInbox({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
      }),
    ).resolves.toMatchObject({
      status: "empty",
      actions: [],
      counts: { pending: 0 },
    });
  });

  it("marks risk and evidence boundaries deterministically", () => {
    const rejected = createApprovalInboxRecord({
      actionId: "rejected-risk",
      status: "rejected",
      riskLevel: "approval_required",
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    expect(hasApprovalInboxEvidence(rejected)).toBe(true);
    expect(buildApprovalInboxRiskFlags(rejected)).toEqual(
      expect.arrayContaining([
        "approval_required",
        "rejected_blocks_execution",
        "expires_or_expired",
      ]),
    );
  });
});
