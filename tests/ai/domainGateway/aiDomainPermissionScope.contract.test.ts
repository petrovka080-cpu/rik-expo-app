import { buildAiDomainPermissionScope, canAiDomainScopeAccessDomain } from "../../../src/lib/ai/domainDataGateway";

describe("AI Domain permission scope", () => {
  it("limits client and contractor finance visibility without treating it as an error", () => {
    const clientScope = buildAiDomainPermissionScope({ role: "client", userId: "u", orgId: "o" });
    const contractorScope = buildAiDomainPermissionScope({ role: "contractor", userId: "u", orgId: "o" });

    expect(canAiDomainScopeAccessDomain(clientScope, "finance")).toBe(false);
    expect(canAiDomainScopeAccessDomain(contractorScope, "finance")).toBe(false);
    expect(clientScope.canSeeFinanceDetails).toBe(false);
    expect(contractorScope.canSeeOtherContractors).toBe(false);
  });
});
