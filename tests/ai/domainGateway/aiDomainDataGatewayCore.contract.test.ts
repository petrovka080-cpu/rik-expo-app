import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("AI Domain Data Gateway core", () => {
  it("retrieves a gateway bundle with source refs, open links, numeric facts and cross-domain chain", async () => {
    const bundle = await getDomainGatewayTestBundle();

    expect(bundle.status).toBe("found");
    expect(bundle.domainResults).toHaveLength(11);
    expect(bundle.mergedSourceRefs.length).toBeGreaterThan(0);
    expect(bundle.mergedOpenLinks.length).toBeGreaterThan(0);
    expect(bundle.mergedNumericFacts.length).toBeGreaterThan(0);
    expect(bundle.crossDomainChain.length).toBeGreaterThan(0);
    expect(bundle.safety).toMatchObject({
      changedData: false,
      finalSubmit: false,
      dangerousMutation: false,
    });
  });
});
