import { AI_SAFE_ACTION_KINDS, AI_SAFE_ACTION_WAVE } from "../aiSafeActionTypes";

export function buildAiSafeActionProofInventory() {
  return {
    wave: AI_SAFE_ACTION_WAVE,
    layerRoot: "src/lib/ai/safeActions",
    scripts: [
      "scripts/ai/runAiSafeActionDraftApprovalProof.ts",
      "scripts/e2e/runAiSafeActionDraftApprovalWebProof.ts",
      "scripts/e2e/runAiSafeActionDraftApprovalMaestroProof.ts",
    ],
    actionKinds: [...AI_SAFE_ACTION_KINDS],
    answerPipelineReadOnly: true,
    actionDraftRequiresHumanClick: true,
    finalExecutionRequiresApprovalPolicy: true,
  };
}
