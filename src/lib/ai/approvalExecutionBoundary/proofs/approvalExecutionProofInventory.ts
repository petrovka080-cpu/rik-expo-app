import { AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX, AI_APPROVAL_EXECUTION_WAVE } from "../aiApprovalTypes";

export function buildAiApprovalExecutionProofInventory() {
  return {
    wave: AI_APPROVAL_EXECUTION_WAVE,
    artifactPrefix: AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX,
    layerRoot: "src/lib/ai/approvalExecutionBoundary",
    integratesExistingLayers: [
      "src/lib/ai/safeActions",
      "src/features/ai/actionLedger",
      "src/features/ai/executors/executeApprovedActionGateway.ts",
      "src/lib/ai/contractRuntime",
    ],
    proofScripts: [
      "scripts/ai/runAiHumanApprovalLedgerExecutionBoundaryProof.ts",
      "scripts/e2e/runAiHumanApprovalLedgerExecutionBoundaryWebProof.ts",
      "scripts/e2e/runAiHumanApprovalLedgerExecutionBoundaryMaestroProof.ts",
    ],
  };
}
