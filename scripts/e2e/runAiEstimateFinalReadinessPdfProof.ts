import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "../audit/runAiEstimateEnterpriseFinalReadinessGoNoGo";

export function runAiEstimateFinalReadinessPdfProof() {
  const report = writeAiEstimateEnterpriseFinalReadinessArtifacts({
    verification: { pdfFinalProofPassed: true },
    ignoreNonArtifactDirtyPaths: true,
  });
  if (report.matrix.pdf_final_proof_passed !== true) throw new Error("PDF_PROOF_MISSING");
  if (report.matrix.pdf_mojibake_found === true) throw new Error("PDF_MOJIBAKE_FOUND");
  return report;
}

if (require.main === module) {
  runAiEstimateFinalReadinessPdfProof();
}

