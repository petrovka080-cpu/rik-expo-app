import { buildWorld50000GovernedCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 source evidence gate", () => {
  it("requires source evidence for priced rows", () => {
    const result = validateWorld50000Case(buildWorld50000GovernedCase(3));
    expect(result.sourceEvidenceStatus).toBe("present");
    expect(result.failureCodes).not.toContain("SOURCE_EVIDENCE_MISSING");
  });
});
