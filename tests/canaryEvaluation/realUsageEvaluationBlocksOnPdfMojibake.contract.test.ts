import { evaluateRealUsageSessions } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("real usage evaluation blocks PDF mojibake", () => {
  const result = evaluateRealUsageSessions([{
    classification: "PDF_MOJIBAKE_FOUND",
    pdfChecked: true,
    pdfPassed: false,
    pdfMojibakeFound: true,
    telemetryValid: true,
    feedbackValid: true,
  }]);
  expect(result.passed).toBe(false);
  expect(result.issues).toContain("PDF_MOJIBAKE_FOUND");
});
