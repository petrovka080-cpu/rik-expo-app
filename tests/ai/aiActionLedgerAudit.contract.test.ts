import { createAiActionLedgerAuditEvent } from "../../src/features/ai/actionLedger/aiActionLedgerAudit";

describe("AI action ledger audit contract", () => {
  it("records only redacted audit metadata", () => {
    const event = createAiActionLedgerAuditEvent({
      eventType: "ai.action.submitted_for_approval",
      actionType: "send_document",
      status: "pending",
      role: "director",
      screenId: "director.dashboard",
      domain: "documents",
      reason: "send to boss@example.test with Bearer abc.def.ghi",
      evidenceRefs: ["doc:evidence:1"],
      createdAt: "2026-05-12T00:00:00.000Z",
    });

    expect(event).toMatchObject({
      redacted: true,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });
    expect(JSON.stringify(event)).not.toContain("boss@example.test");
    expect(JSON.stringify(event)).not.toContain("abc.def.ghi");
  });
});
