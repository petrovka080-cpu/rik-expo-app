import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

describe("foreman AI estimate persistence and reload contract", () => {
  it("keeps mapped drafts serializable without losing identity after reload", () => {
    const audit = buildForemanAiEstimateRoleChainAudit();

    expect(audit.foreman_draft_persists_after_reload).toBe(true);
    expect(audit.sample_results.every((sample) => sample.survives_reload)).toBe(true);
  });
});
