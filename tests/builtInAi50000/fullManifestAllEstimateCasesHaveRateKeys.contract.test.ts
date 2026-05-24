import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest estimate rate keys", () => {
  it("requires rate keys for all estimate cases", () => {
    expect(fullCases.filter((testCase) => testCase.intent === "estimate").every((testCase) => testCase.requiredRateKeys.length > 0)).toBe(true);
  });
});
