import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no unbounded queries", () => {
  it("uses explicit limits and never select-star patterns", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/select\s+\*/i);
    expect(source).toContain("maxRows");
    expect(source).toContain("boundedQueryRequired");
    expect(source).toContain("unbounded: false");
  });
});
