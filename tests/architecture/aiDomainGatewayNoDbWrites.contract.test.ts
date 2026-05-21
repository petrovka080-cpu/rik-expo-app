import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no DB writes", () => {
  it("contains no write method calls or mutation safety flags", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    expect(source).toContain("changedData: false");
    expect(source).toContain("finalSubmit: false");
    expect(source).toContain("dangerousMutation: false");
  });
});
