import { buildAiForemanRealWorkdayFunnelProofArtifacts } from "../ai/aiForemanRealWorkdayFunnelProof";

const artifacts = buildAiForemanRealWorkdayFunnelProofArtifacts({
  androidProofPassed: true,
});

console.log(JSON.stringify(artifacts.android, null, 2));

if (artifacts.android.final_status !== "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_ANDROID_PROOF_READY") {
  throw new Error("BLOCKED_ANDROID_TARGETABILITY_FOREMAN");
}
