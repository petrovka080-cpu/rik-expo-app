import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();

if (!proof.matrix.professional_boq_output_ready || !proof.matrix.proof_prompts_count_gte_300) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_PROFESSIONAL_BOQ_FAILED", matrix: proof.matrix }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_CONSTRUCTION_ESTIMATE_PROFESSIONAL_BOQ_PROOF_READY",
  prompts: proof.inventory.promptCount,
  final_status: proof.matrix.final_status,
}, null, 2));
