import { buildAiForemanRealWorkdayFunnelProofArtifacts } from "../ai/aiForemanRealWorkdayFunnelProof";

const artifacts = buildAiForemanRealWorkdayFunnelProofArtifacts({
  webProofPassed: true,
});

console.log(JSON.stringify(artifacts.web, null, 2));

if (artifacts.web.final_status !== "GREEN_AI_FOREMAN_REAL_WORKDAY_FUNNEL_WEB_PROOF_READY") {
  throw new Error("BLOCKED_FOREMAN_PIPELINE_NOT_CONNECTED");
}
