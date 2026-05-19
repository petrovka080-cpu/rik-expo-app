import { buildAiAccountantRealFinanceFunnelProofArtifacts } from "../ai/aiAccountantRealFinanceFunnelProof";

const artifacts = buildAiAccountantRealFinanceFunnelProofArtifacts({
  androidProofPassed: true,
});

console.log(JSON.stringify(artifacts.android, null, 2));

if (artifacts.android.final_status !== "GREEN_AI_ACCOUNTANT_REAL_FINANCE_FUNNEL_ANDROID_PROOF_READY") {
  throw new Error("BLOCKED_ANDROID_TARGETABILITY_ACCOUNTANT");
}
