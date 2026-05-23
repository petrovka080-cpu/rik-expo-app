import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();

if (!proof.matrix.estimate_intent_beats_role_context || proof.matrix.role_status_answer_for_estimate_found) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_ROLE_CONTEXT_REGRESSION", runtimeTrace: proof.runtimeTrace }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_ESTIMATE_ROLE_CONTEXT_REGRESSION_PROOF_READY",
  runtimeTrace: proof.runtimeTrace.map((item) => ({ route: item.route, passed: item.passed })),
}, null, 2));
