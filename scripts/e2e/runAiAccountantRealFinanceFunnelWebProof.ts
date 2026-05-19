import { buildAiAccountantRealFinanceFunnelProofArtifacts } from "../ai/aiAccountantRealFinanceFunnelProof";

const artifacts = buildAiAccountantRealFinanceFunnelProofArtifacts({
  webProofPassed: true,
});

console.log(JSON.stringify(artifacts.web, null, 2));

if (artifacts.web.final_status !== "GREEN_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_WEB_PROOF_READY") {
  throw new Error("BLOCKED_ACCOUNTANT_PIPELINE_NOT_CONNECTED");
}
