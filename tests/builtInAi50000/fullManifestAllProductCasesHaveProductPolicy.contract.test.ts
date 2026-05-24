import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest product policy", () => {
  it("requires product policy for all product cases", () => {
    expect(fullCases.filter((testCase) => testCase.intent === "product_search").every((testCase) => Boolean(testCase.productSearch))).toBe(true);
  });
});
