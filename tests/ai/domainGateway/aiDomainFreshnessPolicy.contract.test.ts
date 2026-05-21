import { AI_DOMAIN_FRESHNESS_POLICIES, getAiDomainFreshness } from "../../../src/lib/ai/domainDataGateway";

describe("AI Domain freshness policy", () => {
  it("marks each domain with bounded freshness behavior", () => {
    expect(AI_DOMAIN_FRESHNESS_POLICIES.warehouse.maxStalenessMs).toBeGreaterThan(0);
    expect(AI_DOMAIN_FRESHNESS_POLICIES.approvals.staleBehavior).toBe("require_refresh");
    expect(getAiDomainFreshness("warehouse")).toMatchObject({ stale: false });
  });
});
