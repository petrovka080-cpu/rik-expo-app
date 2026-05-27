import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - tax source", () => {
  it("requires tax source evidence", () => {
    const source = changeControlSource();
    expect(source).toContain("TAX_SOURCE_MISSING");
    expect(source).toContain("jurisdiction");
  });
});
