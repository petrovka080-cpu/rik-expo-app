import { writeLimitedPublicBetaPdfProofArtifacts } from "./aiEstimateLimitedPublicBetaExecutionCore";

export function runAiEstimateLimitedPublicBetaPdfProof() {
  const proof = writeLimitedPublicBetaPdfProofArtifacts();
  if (proof.pdf_extraction_cases_total !== 150 || proof.pdf_extraction_cases_passed !== 150) {
    throw new Error("NO_GO_LIMITED_BETA_PDF_EXTRACTION_FAILED");
  }
  if (proof.pdf_mojibake_found) {
    throw new Error("NO_GO_LIMITED_BETA_PDF_MOJIBAKE");
  }
  return proof;
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaPdfProof();
}
