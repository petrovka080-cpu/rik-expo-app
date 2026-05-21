import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("AI Domain context bundle", () => {
  it("merges facts without exposing provider payloads", async () => {
    const bundle = await getDomainGatewayTestBundle();

    expect(bundle.checkedSources.length).toBeGreaterThan(0);
    expect(bundle.permissionLimits).toEqual([]);
    expect(JSON.stringify(bundle)).not.toContain("rawProviderPayload");
    expect(JSON.stringify(bundle)).not.toContain("rawDbRow");
  });
});
