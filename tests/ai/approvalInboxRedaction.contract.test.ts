import {
  findApprovalInboxForbiddenPayloadKeys,
  isApprovalInboxPayloadSafe,
  redactApprovalInboxRecordPayload,
} from "../../src/features/ai/approvalInbox/approvalInboxRedaction";
import { loadApprovalInboxAction } from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox redaction contract", () => {
  it("redacts forbidden raw row, prompt, provider, and credential keys", () => {
    const record = createApprovalInboxRecord({
      redactedPayload: {
        safeHash: "request:1",
        raw_db_rows: [{ id: "raw-row" }],
        raw_prompt: "do the hidden thing",
        provider_payload: { token: "secret-token" },
        Authorization: "Bearer hidden",
      },
    });

    const payload = redactApprovalInboxRecordPayload(record);

    expect(isApprovalInboxPayloadSafe(payload)).toBe(true);
    expect(findApprovalInboxForbiddenPayloadKeys(payload)).toEqual([]);
    expect(JSON.stringify(payload)).not.toMatch(/raw-row|hidden|secret-token|Bearer/);
  });

  it("does not expose raw payload fields through action detail", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovalInboxRecord({
      actionId: "redacted-detail",
      redactedPayload: {
        supplierHash: "supplier:1",
        rawDbRows: [{ id: "row-1" }],
        providerPayload: { apiKey: "secret" },
      },
    });
    records.set(record.actionId, record);

    const result = await loadApprovalInboxAction({
      auth: approvalInboxAuth("director"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
      actionId: record.actionId,
    });

    expect(result.status).toBe("loaded");
    expect(result.rawDbRowsExposed).toBe(false);
    expect(result.rawPromptExposed).toBe(false);
    expect(JSON.stringify(result.redactedPayloadPreview)).not.toMatch(/row-1|secret/);
  });
});
