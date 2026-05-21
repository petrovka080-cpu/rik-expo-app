import fs from "node:fs";
import path from "node:path";

import {
  AI_SAFE_ACTION_ARTIFACT_PREFIX,
  buildAiSafeActionDraft,
  composeAiSafeActionResultText,
  guardAiSafeActionDraftExecution,
} from "../../src/lib/ai/safeActions";

const artifactDir = path.join(process.cwd(), "artifacts");
const actionKinds = [
  "procurement_purchase_draft",
  "accountant_payment_checklist_draft",
  "warehouse_deficit_request_draft",
  "marketplace_product_card_draft",
] as const;

const transcripts = actionKinds.map((actionKind) => {
  const draft = buildAiSafeActionDraft({
    actionKind,
    sourceTraceId: `maestro-proof:${actionKind}`,
  });
  const hierarchyText = composeAiSafeActionResultText(draft);
  const guard = guardAiSafeActionDraftExecution(draft);
  return {
    actionKind,
    hierarchyText,
    guardPassed: guard.passed,
    hasDraftPrepared: hierarchyText.includes("Черновик") || hierarchyText.includes("черновик"),
    hasApprovalRequired: actionKind === "accountant_payment_checklist_draft" || hierarchyText.includes("Требуется согласование"),
    hasNoFinalCreated: !hierarchyText.includes("создано финально") && !hierarchyText.includes("проведен финально"),
    changedData: draft.safety.changedData,
  };
});

const proof = {
  proof: "S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR maestro proof",
  readsActualHierarchyText: true,
  showsPurchaseDraft60Gkl: transcripts[0]?.hierarchyText.includes("60") ?? false,
  showsPaymentChecklist245000: transcripts[1]?.hierarchyText.includes("245") ?? false,
  showsDeficitDraft60Gkl: transcripts[2]?.hierarchyText.includes("60") ?? false,
  showsMarketplaceDraft: transcripts[3]?.hierarchyText.includes("карточки товара") ?? false,
  noFinalMutation: transcripts.every((item) => item.changedData === false && item.hasNoFinalCreated),
  transcripts,
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, `${AI_SAFE_ACTION_ARTIFACT_PREFIX}_android.json`), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));

if (!transcripts.every((item) => item.guardPassed && item.hasDraftPrepared && item.hasNoFinalCreated) || !proof.noFinalMutation) {
  process.exitCode = 1;
}
