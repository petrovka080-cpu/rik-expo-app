import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no approval bypass", () => {
  it("keeps approval provider read-only and draft/context-only", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toMatch(/autoApprove|bypassApproval|approve\s*\(/);
    expect(source).toContain("Approval provider возвращает контекст решения");
    expect(source).toContain("finalSubmit: false");
  });
});
