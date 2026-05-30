import { selectLimitedPublicBetaReplayCases } from "../../scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore";

test("limited public beta replay selector requires 3000 production-like sessions", () => {
  const cases = selectLimitedPublicBetaReplayCases();
  expect(cases).toHaveLength(3000);
  expect(cases.filter((item) => item.item.route === "/request")).toHaveLength(1000);
  expect(cases.filter((item) => item.item.route === "/ai?context=foreman")).toHaveLength(1000);
  expect(cases.filter((item) => item.item.route === "/ai?context=request")).toHaveLength(1000);
  expect(cases.filter((item) => item.item.pdfRequired).length).toBeGreaterThanOrEqual(300);
  expect(cases.filter((item) => item.item.regulatedSafetyRequired).length).toBeGreaterThanOrEqual(100);
});
