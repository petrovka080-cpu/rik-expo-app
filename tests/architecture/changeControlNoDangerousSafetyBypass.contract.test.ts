import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - dangerous safety", () => {
  it("requires dangerous work safety constraints", () => {
    const source = changeControlSource();
    expect(source).toContain("requiresLicensedSpecialist");
    expect(source).toContain("noDiyInstructions");
    expect(source).toContain("regulatedWarning");
  });
});
