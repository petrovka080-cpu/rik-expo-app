import type { AiSafeActionDraft } from "../safeActions";
import type { AiApprovalImpactDiff } from "./aiApprovalTypes";

export function buildAiApprovalImpactDiffFromDraft(draft: AiSafeActionDraft): AiApprovalImpactDiff {
  return {
    willChange: [],
    willCreate: draft.impactDiff.willCreateDrafts.map((item) => ({
      entityType: item.draftType,
      labelRu: item.labelRu,
      fieldsRu: item.fieldsRu.map((field) => ({
        fieldRu: field.fieldRu,
        valueRu: field.valueRu,
        sourceRefIds: [...field.sourceRefIds],
      })),
    })),
    willNotDo: [
      ...draft.impactDiff.willNotDo,
      "AI не выполняет финальное действие",
      "Execution возможен только через approval ledger и approved business service",
    ],
  };
}

export function assertAiApprovalImpactDiffReviewed(params: {
  impactDiff: AiApprovalImpactDiff;
  reviewed: boolean;
}): boolean {
  return params.reviewed && (params.impactDiff.willCreate.length > 0 || params.impactDiff.willChange.length > 0);
}
