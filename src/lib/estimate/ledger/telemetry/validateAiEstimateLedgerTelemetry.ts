import { createAiEstimateLedgerTelemetryEvent } from "./AiEstimateLedgerTelemetry";

export function validateAiEstimateLedgerTelemetry() {
  const event = createAiEstimateLedgerTelemetryEvent({
    eventName: "ai_estimate_ledger_sync",
    estimateId: "raw-estimate-id-123",
    sourceSha: "source-sha",
    adapterKind: "in_memory",
    status: "ok",
    payload: {
      phone: "+996 555 123 456",
      prompt: "x".repeat(160),
      count: 12,
    },
  });
  const serialized = JSON.stringify(event);
  const checks = {
    estimate_id_hashed: !serialized.includes("raw-estimate-id-123") && event.estimateIdHash.startsWith("estimate:"),
    pii_redacted: !serialized.includes("+996 555 123 456") && serialized.includes("[redacted]"),
    prompt_bounded: !serialized.includes("x".repeat(120)),
    source_sha_present: event.sourceSha === "source-sha",
  };
  return {
    ok: Object.values(checks).every(Boolean),
    event,
    ...checks,
  };
}
