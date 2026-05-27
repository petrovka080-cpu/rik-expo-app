import { buildWorld50000GovernedCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 tax warning gate", () => {
  it("requires tax or local pricing warning on estimates", () => {
    const result = validateWorld50000Case(buildWorld50000GovernedCase(4));
    expect(result.taxLocalWarningStatus).toBe("present");
    expect(result.failureCodes).not.toContain("TAX_WARNING_MISSING");
  });
});
