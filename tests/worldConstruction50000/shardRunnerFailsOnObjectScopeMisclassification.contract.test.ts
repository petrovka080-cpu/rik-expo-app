import { buildWorld50000GovernedCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 object scope gate", () => {
  it("keeps roof waterproofing scoped to roof and away from bathroom", () => {
    const result = validateWorld50000Case(buildWorld50000GovernedCase(0));
    expect(result.domain).toBe("roofing");
    expect(result.object).toBe("roof");
    expect(result.failureCodes.some((code) => code.startsWith("OBJECT_SCOPE_MISCLASSIFIED"))).toBe(false);
  });
});
