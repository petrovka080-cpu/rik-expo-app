import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest expected rows", () => {
  it("requires expected row hints for every case", () => {
    expect(fullCases.every((testCase) => testCase.expectedRowsContain.length > 0)).toBe(true);
  });
});
