import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();

if (!proof.matrix.make_pdf_action_visible || !proof.matrix.pdf_contains_source_evidence) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_PDF_FAILED", pdfTrace: proof.pdfTrace }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_ESTIMATE_PDF_PROOF_READY",
  sourceEvidenceCount: proof.pdfTrace.sourceEvidenceCount,
}, null, 2));
