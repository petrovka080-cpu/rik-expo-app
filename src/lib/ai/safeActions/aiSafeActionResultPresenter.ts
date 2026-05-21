import type { AiSafeActionDraft } from "./aiSafeActionTypes";

export function composeAiSafeActionResultText(draft: AiSafeActionDraft): string {
  const sourceLines = draft.openLinks.map((link) => `- ${link.labelRu}`).join("\n");
  const willNotDo = draft.impactDiff.willNotDo.map((item) => `- ${item}`).join("\n");
  const missing = draft.missingData.length > 0 ? draft.missingData.map((item) => `- ${item}`).join("\n") : "- ничего критичного для черновика";
  const status =
    draft.mode === "approval_required"
      ? "Черновик подготовлен. Требуется согласование."
      : "Черновик подготовлен. Данные не изменены.";

  return [
    draft.humanReadableDraftRu,
    "",
    "Источник:",
    sourceLines,
    "",
    "Что не будет сделано:",
    willNotDo,
    "",
    "Чего не хватает:",
    missing,
    "",
    "Следующий шаг:",
    draft.mode === "approval_required"
      ? "Проверить черновик и отправить его на approval route."
      : "Проверить черновик и сохранить только после подтверждения человека.",
    "",
    "Статус:",
    status,
  ].join("\n");
}

export function summarizeAiSafeActionDraftForProof(draft: AiSafeActionDraft) {
  return {
    id: draft.id,
    actionKind: draft.actionKind,
    mode: draft.mode,
    status: draft.status,
    sourceRefs: draft.sourceRefIds.length,
    openLinks: draft.openLinks.length,
    preconditions: draft.preconditions.length,
    impactDiffDrafts: draft.impactDiff.willCreateDrafts.length,
    approvalRequired: draft.approvalRoute?.required ?? false,
    humanConfirmationRequired: draft.humanConfirmation.required,
    finalSubmit: draft.safety.finalSubmit,
    changedData: draft.safety.changedData,
    dangerousMutation: draft.safety.dangerousMutation,
  };
}
