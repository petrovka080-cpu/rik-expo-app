import { buildAiBuyerRealSourcingFunnelProofArtifacts } from "../ai/aiBuyerRealSourcingFunnelProof";

const artifacts = buildAiBuyerRealSourcingFunnelProofArtifacts({
  androidProofPassed: true,
});

console.log(JSON.stringify(artifacts.android, null, 2));

if (artifacts.android.final_status !== "GREEN_AI_BUYER_REAL_SOURCING_FUNNEL_ANDROID_PROOF_READY") {
  throw new Error("BLOCKED_ANDROID_TARGETABILITY_BUYER");
}
