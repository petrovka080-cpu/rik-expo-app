import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no direct DB from AI screens", () => {
  it("keeps the gateway itself free of direct database clients", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toContain("supabase");
    expect(source).not.toMatch(/\.(from|select|insert|update|delete|upsert|rpc)\s*\(/);
  });
});
