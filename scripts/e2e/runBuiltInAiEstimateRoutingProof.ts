import { writeBuiltInAiProofArtifacts } from "./builtInAiProofShared";

const artifacts = writeBuiltInAiProofArtifacts();
console.log(JSON.stringify({
  final_status: "GREEN_BUILT_IN_AI_ESTIMATE_ROUTING_PROOF_READY",
  estimate_intent_routes_to_calculate_global_estimate: artifacts.architectureMatrix.estimate_intent_routes_to_calculate_global_estimate,
}, null, 2));
if (!artifacts.architectureMatrix.estimate_intent_routes_to_calculate_global_estimate) process.exit(1);
