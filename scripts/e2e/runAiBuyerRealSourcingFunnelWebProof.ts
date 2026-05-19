import { buildAiBuyerRealSourcingFunnelProofArtifacts } from "../ai/aiBuyerRealSourcingFunnelProof";

const artifacts = buildAiBuyerRealSourcingFunnelProofArtifacts({
  webProofPassed: true,
});

console.log(JSON.stringify(artifacts.web, null, 2));

if (artifacts.web.final_status !== "GREEN_AI_BUYER_REAL_SOURCING_FUNNEL_WEB_PROOF_READY") {
  throw new Error("BLOCKED_BUYER_PIPELINE_NOT_CONNECTED");
}
