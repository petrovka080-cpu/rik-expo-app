import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

describe("foreman AI estimate idempotency contract", () => {
  it("dedupes repeated submit, approve and procurement row attempts", () => {
    const { idempotency } = buildForemanAiEstimateRoleChainAudit();

    expect(idempotency.double_submit_director_duplicates).toBe(0);
    expect(idempotency.double_approve_buyer_duplicates).toBe(0);
    expect(idempotency.duplicate_procurement_rows).toBe(0);
    expect(idempotency.duplicate_procurement_attempts_blocked).toBeGreaterThan(0);
  });
});
