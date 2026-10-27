import type { AiSafeActionDraft, AiSafeActionHumanConfirmation } from "./aiSafeActionTypes";

export function buildAiSafeActionHumanConfirmation(params: {
  draftId: string;
  titleRu: string;
  approvalRequired: boolean;
}): AiSafeActionHumanConfirmation {
  return {
    actionDraftId: params.draftId,
    required: true,
    confirmationTextRu: params.approvalRequired
      ? `Проверьте источники, условия и изменения. После подтверждения черновик можно отправить на согласование: ${params.titleRu}.`
      : `Проверьте источники, условия и изменения перед сохранением черновика: ${params.titleRu}.`,
    confirmButtonLabelRu: params.approvalRequired ? "Отправить черновик на согласование" : "Сохранить черновик",
    cancelButtonLabelRu: "Отменить",
    userMustSee: ["source_refs", "impact_diff", "missing_data", "approval_route", "safety_status"],
    finalExecutionAllowed: false,
  };
}

export function assertAiSafeActionHumanConfirmationVisible(draft: AiSafeActionDraft): boolean {
  return (
    draft.humanConfirmation.required &&
    draft.humanConfirmation.finalExecutionAllowed === false &&
    draft.humanConfirmation.userMustSee.includes("source_refs") &&
    draft.humanConfirmation.userMustSee.includes("impact_diff") &&
    draft.humanConfirmation.userMustSee.includes("safety_status")
  );
}
