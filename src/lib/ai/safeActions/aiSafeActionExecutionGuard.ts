import type { AiSafeActionDraft, AiSafeActionExecutionGuardResult } from "./aiSafeActionTypes";
import { assertAiSafeActionHumanConfirmationVisible } from "./aiSafeActionHumanConfirmation";

export function guardAiSafeActionDraftExecution(draft: AiSafeActionDraft): AiSafeActionExecutionGuardResult {
  const sourceRefsPresent = draft.sourceRefIds.length > 0 && draft.openLinks.length > 0;
  const impactDiffPresent = draft.impactDiff.willCreateDrafts.length > 0 && draft.impactDiff.businessMutationBlocked;
  const approvalRouteChecked = draft.mode !== "approval_required" || (draft.approvalRoute?.required === true && draft.approvalRoute.canBypass === false);
  const idempotencyChecked =
    Boolean(draft.idempotencyKey.actionKind) &&
    draft.idempotencyKey.sourceRefIds.length > 0 &&
    draft.idempotencyKey.draftPayloadHash.length > 0;
  const humanConfirmationRequired = assertAiSafeActionHumanConfirmationVisible(draft);
  const passed =
    draft.safety.changedData === false &&
    draft.safety.finalSubmit === false &&
    draft.safety.autoApproval === false &&
    draft.safety.dangerousMutation === false &&
    humanConfirmationRequired &&
    sourceRefsPresent &&
    impactDiffPresent &&
    approvalRouteChecked &&
    idempotencyChecked;

  let failureReason: AiSafeActionExecutionGuardResult["failureReason"];
  if (!sourceRefsPresent) failureReason = "missing_source_refs";
  else if (!impactDiffPresent) failureReason = "missing_impact_diff";
  else if (!approvalRouteChecked) failureReason = "missing_approval_route";
  else if (!humanConfirmationRequired) failureReason = "missing_human_confirmation";
  else if (!idempotencyChecked) failureReason = "duplicate_draft_created";
  else if (draft.safety.finalSubmit) failureReason = "final_submit_attempted";
  else if (draft.safety.autoApproval) failureReason = "auto_approval_attempted";
  else if (draft.safety.dangerousMutation) failureReason = "dangerous_mutation_attempted";

  return {
    actionDraftId: draft.id,
    passed,
    noDbWriteFromAnswer: true,
    noFinalSubmit: draft.safety.finalSubmit === false,
    noAutoApproval: draft.safety.autoApproval === false,
    noDangerousMutation: draft.safety.dangerousMutation === false,
    humanConfirmationRequired,
    sourceRefsPresent,
    impactDiffPresent,
    approvalRouteChecked,
    idempotencyChecked,
    failureReason,
  };
}
