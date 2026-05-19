import { buildAiSupplierContractorMarketplaceIntakeProofArtifacts } from "../ai/aiSupplierContractorMarketplaceIntakeProof";

const artifacts = buildAiSupplierContractorMarketplaceIntakeProofArtifacts({
  androidProofPassed: true,
});

console.log(JSON.stringify(artifacts.android, null, 2));

if (artifacts.android.final_status !== "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_ANDROID_PROOF_READY") {
  throw new Error("BLOCKED_ANDROID_TARGETABILITY_MARKETPLACE");
}
