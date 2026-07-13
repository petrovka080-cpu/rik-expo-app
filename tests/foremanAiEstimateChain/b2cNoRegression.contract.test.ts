import { buildForemanAiEstimateLegacyCleanupAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateLegacyCleanupAudit";

describe("foreman AI estimate B2C separation", () => {
  it("does not wire consumer request estimate state into foreman drafts", () => {
    const audit = buildForemanAiEstimateLegacyCleanupAudit();

    expect(audit.b2c_request_still_separate).toBe(true);
    expect(audit.b2c_writes_foreman_draft).toBe(false);
    expect(audit.foreman_writes_b2c_history).toBe(false);
    expect(audit.consumer_uses_foreman_adapter).toBe(false);
  });
});
