import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest forbidden rows", () => {
  it("requires forbidden fallback row guards for every case", () => {
    expect(fullCases.every((testCase) => testCase.forbiddenRowsContain.length > 0)).toBe(true);
  });
});
