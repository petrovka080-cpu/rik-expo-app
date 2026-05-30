import { selectLimitedPublicBetaPdfProofCases } from "../../scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore";

test("limited public beta PDF proof selects 150 extractable PDF cases", () => {
  const { selected, requiredDomains } = selectLimitedPublicBetaPdfProofCases();
  expect(selected).toHaveLength(150);
  expect(selected.every((item) => item.pdfRequired)).toBe(true);
  expect(requiredDomains.every((domain) => selected.some((item) => item.domain === domain))).toBe(true);
});
