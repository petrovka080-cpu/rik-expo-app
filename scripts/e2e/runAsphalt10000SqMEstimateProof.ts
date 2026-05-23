import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();

if (!proof.matrix.asphalt_10000sqm_ready) {
  console.error(JSON.stringify({ status: "BLOCKED_ASPHALT_10000SQM_ESTIMATE_FAILED", asphaltTrace: proof.asphaltTrace }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ASPHALT_10000SQM_ESTIMATE_PROOF_READY",
  workKey: proof.asphaltTrace.work.workKey,
  rows: proof.asphaltTrace.rows.length,
  hasPdfAction: proof.asphaltTrace.hasPdfAction,
}, null, 2));
