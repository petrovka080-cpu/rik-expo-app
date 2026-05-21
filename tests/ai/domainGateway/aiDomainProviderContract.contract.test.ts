import { AI_DOMAIN_NAMES, getDefaultAiDomainProviders } from "../../../src/lib/ai/domainDataGateway";

describe("AI Domain Provider contract", () => {
  it("registers one provider per required domain with health checks and capabilities", async () => {
    const providers = getDefaultAiDomainProviders();
    expect(providers.map((provider) => provider.domain).sort()).toEqual([...AI_DOMAIN_NAMES].sort());

    for (const provider of providers) {
      expect(provider.capabilities.length).toBeGreaterThan(0);
      expect(await provider.healthCheck()).toMatchObject({ ready: true });
    }
  });
});
