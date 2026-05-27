import { buildWorld50000DangerousCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 dangerous work gate", () => {
  it("classifies regulated work as safe estimate mode rather than DIY", () => {
    const result = validateWorld50000Case(buildWorld50000DangerousCase(0));
    expect(result.classification).toBe("DANGEROUS_REGULATED_SAFE_ESTIMATE");
    expect(result.riskClass).toBe("regulated");
    expect(result.failureCodes).not.toContain("DANGEROUS_DIY_INSTRUCTIONS_FOUND");
  });
});
