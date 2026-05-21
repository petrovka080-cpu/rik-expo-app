import { readProviderSource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no raw rows to answer composer", () => {
  it("providers return AiDomainQueryResult-shaped facts instead of row payloads", () => {
    const source = readProviderSource();
    expect(source).not.toContain("rawRows");
    expect(source).not.toContain("providerPayload");
    expect(source).not.toMatch(/\brows\s*:/);
  });
});
