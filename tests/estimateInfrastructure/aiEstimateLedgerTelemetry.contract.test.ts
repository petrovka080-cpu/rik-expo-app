import { validateAiEstimateLedgerTelemetry } from "../../src/lib/estimate/ledger/telemetry/validateAiEstimateLedgerTelemetry";

describe("AI estimate ledger telemetry", () => {
  it("redacts PII and never emits raw estimate ids", () => {
    const proof = validateAiEstimateLedgerTelemetry();

    expect(proof.ok).toBe(true);
    expect(proof.estimate_id_hashed).toBe(true);
    expect(proof.pii_redacted).toBe(true);
    expect(proof.prompt_bounded).toBe(true);
    expect(proof.source_sha_present).toBe(true);
  });
});
