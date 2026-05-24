import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest duplicate IDs", () => {
  it("has no duplicate case IDs", () => {
    expect(new Set(fullCases.map((testCase) => testCase.id)).size).toBe(fullCases.length);
  });
});
