import {
  AI_DOMAIN_GATEWAY_ROLE_NAMES,
  createDefaultAiDomainProviderRegistry,
  getAiDomainRoleAllowlist,
} from "../../src/lib/ai/domainDataGateway";

describe("AI domain gateway role allowlists", () => {
  it("registers one bounded provider allowlist per AI role", () => {
    const registeredDomains = createDefaultAiDomainProviderRegistry().providers.map((provider) => provider.domain);

    for (const role of AI_DOMAIN_GATEWAY_ROLE_NAMES) {
      const allowlist = getAiDomainRoleAllowlist(role);
      expect(allowlist.length).toBeGreaterThan(0);
      expect(allowlist.length).toBeLessThanOrEqual(20);
      expect(allowlist.every((domain) => registeredDomains.includes(domain))).toBe(true);
    }

    expect(getAiDomainRoleAllowlist("consumer")).toEqual(["consumer_repair", "marketplace"]);
    expect(getAiDomainRoleAllowlist("accountant")).not.toContain("field");
    expect(getAiDomainRoleAllowlist("accountant")).not.toContain("contractors");
    expect(getAiDomainRoleAllowlist("buyer")).not.toContain("finance");
  });
});
