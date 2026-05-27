import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - approval gate", () => {
  it("blocks publish without approval", () => {
    const source = changeControlSource();
    expect(source).toContain("Cannot publish without approval.");
    expect(source).toContain("approval_status === \"approved\"");
  });
});
