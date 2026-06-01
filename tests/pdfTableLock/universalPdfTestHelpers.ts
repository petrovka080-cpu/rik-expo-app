import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";
import {
  requireKnownWorkEstimate,
  rowsOf,
  UNIVERSAL_KNOWN_WORK_CASES,
} from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

export function universalPdfFixture() {
  const testCase = UNIVERSAL_KNOWN_WORK_CASES.find((item) => item.id === "acoustic_panels");
  expect(testCase).toBeDefined();
  if (!testCase) throw new Error("acoustic_case_missing");
  const estimate = requireKnownWorkEstimate(testCase);
  const pdf = createEstimatePdf({ estimate, generatedAt: "2026-06-02T00:00:00.000Z", language: "ru" });
  const extracted = extractEstimatePdfTextForProof({ pdf: pdf.bytes, knownWorkKey: estimate.work.workKey });
  return { estimate, pdf, extracted, rows: rowsOf(estimate) };
}
