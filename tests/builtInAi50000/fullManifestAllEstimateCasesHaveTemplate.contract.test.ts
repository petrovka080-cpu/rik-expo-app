import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest estimate template binding", () => {
  it("requires templates for all estimate cases", () => {
    expect(fullCases.filter((testCase) => testCase.intent === "estimate").every((testCase) => Boolean(testCase.templateId))).toBe(true);
  });
});
