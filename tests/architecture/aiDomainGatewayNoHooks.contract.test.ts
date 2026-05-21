import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no hooks", () => {
  it("does not add React hooks to retrieval architecture", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
    expect(source).not.toContain("from \"react\"");
  });
});
