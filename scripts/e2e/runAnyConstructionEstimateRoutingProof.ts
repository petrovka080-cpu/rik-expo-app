import { buildAnyEstimatePromptPack, evaluateAnyEstimatePrompt, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const artifacts = writeAnyEstimateProofArtifacts();
const prompts = buildAnyEstimatePromptPack();
const failed = prompts.map(({ prompt, group }) => evaluateAnyEstimatePrompt(prompt, group)).filter((item) => !item.routeCalledEstimateTool);

if (failed.length > 0) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_ROUTING_FAILED", failed: failed.slice(0, 10) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_CONSTRUCTION_ESTIMATE_ROUTING_PROOF_READY",
  prompts: prompts.length,
  matrix: artifacts.matrix.final_status,
}, null, 2));
