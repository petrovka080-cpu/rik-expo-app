import { securityAnswer, runtimeAnswer } from "./aiSecurityRuntimeTestHelpers";

describe("security runtime no fake findings", () => {
  it("requires every security and runtime finding to carry source evidence", () => {
    const security = securityAnswer();
    const runtime = runtimeAnswer();
    expect(security.securityEvents.every((event) => event.evidence.length > 0)).toBe(true);
    expect(runtime.runtimeEvents.every((event) => event.sourceRefs.length > 0)).toBe(true);
    expect(security.missingData.length).toBeGreaterThan(0);
    expect(runtime.missingData.length).toBeGreaterThan(0);
  });
});
