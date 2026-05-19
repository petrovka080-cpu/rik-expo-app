import { buildAiSupplierContractorMarketplaceIntakeProofArtifacts } from "../ai/aiSupplierContractorMarketplaceIntakeProof";

const artifacts = buildAiSupplierContractorMarketplaceIntakeProofArtifacts({
  webProofPassed: true,
});

console.log(JSON.stringify(artifacts.web, null, 2));

if (artifacts.web.final_status !== "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WEB_PROOF_READY") {
  throw new Error("BLOCKED_MARKETPLACE_INTAKE_PIPELINE_NOT_CONNECTED");
}
