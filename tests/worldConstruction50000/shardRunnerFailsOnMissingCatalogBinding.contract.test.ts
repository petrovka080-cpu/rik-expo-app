import { buildWorld50000GovernedCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 catalog binding gate", () => {
  it("requires catalog binding or explicit gap policy on material rows", () => {
    const result = validateWorld50000Case(buildWorld50000GovernedCase(2));
    expect(result.catalogBindingStatus).toBe("bound_or_gap_warning");
    expect(result.failureCodes).not.toContain("CATALOG_BINDING_MISSING");
  });
});
