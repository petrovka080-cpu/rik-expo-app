import { selectProductionCanaryReplayCases } from "../../scripts/e2e/aiEstimateProductionCanaryCore";

test("production canary replay selects production-like accepted cases", () => {
  const cases = selectProductionCanaryReplayCases();
  expect(cases).toHaveLength(1700);
  expect(cases.filter((item) => item.bucket === "real10000_base")).toHaveLength(1000);
  expect(cases.filter((item) => item.bucket === "pdf_sample")).toHaveLength(100);
});
