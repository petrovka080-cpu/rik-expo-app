import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - validation gate", () => {
  it("blocks publish without a passed validation run", () => {
    const source = changeControlSource();
    expect(source).toContain("Cannot publish without passed validation.");
    expect(source).toContain("validation_runs.some");
  });
});
