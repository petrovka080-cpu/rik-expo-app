import {
  assertGlobalEstimateDataOpsAuditRedacted,
  createGlobalEstimateDataOpsAuditEvent,
} from "../../src/lib/ai/globalEstimate";

describe("global estimate data ops audit redaction", () => {
  it("redacts secrets, contacts and storage-like values from audit metadata", () => {
    const event = createGlobalEstimateDataOpsAuditEvent({
      event: "import_preview_created",
      actor: { userId: "data_ops_admin", role: "data_ops_admin" },
      metadata: {
        phone: "+1 214 555 0100",
        storageKey: "private/file.pdf",
        sourceLabel: "safe public label",
      },
    });

    expect(event.metadata.phone).toBe("[redacted]");
    expect(event.metadata.storageKey).toBe("[redacted]");
    expect(() => assertGlobalEstimateDataOpsAuditRedacted([event])).not.toThrow();
  });
});
