import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();
const requestRoute = proof.runtimeTrace.find((item) => item.route === "/request");

if (!requestRoute?.passed || !proof.matrix.make_pdf_action_visible) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_CONSUMER_SMETA_FAILED", runtimeTrace: proof.runtimeTrace }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_ESTIMATE_CONSUMER_SMETA_PROOF_READY",
  route: requestRoute.route,
  pdfAction: proof.matrix.make_pdf_action_visible,
}, null, 2));
