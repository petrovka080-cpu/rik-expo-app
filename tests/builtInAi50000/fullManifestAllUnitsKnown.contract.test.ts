import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest units", () => {
  it("uses only known normalized units", () => {
    const known = new Set(["sq_m", "linear_m", "pcs", "kg", "set"]);
    expect(fullCases.every((testCase) => !testCase.unit || known.has(testCase.unit))).toBe(true);
  });
});
