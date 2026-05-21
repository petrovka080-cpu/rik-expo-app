import { buildAiSafeActionDraft } from "../aiSafeActionDraft";
import type { AiSafeActionBuildInput } from "../aiSafeActionTypes";

export function createContractorRemarkResponseDraftAction(
  input: Omit<AiSafeActionBuildInput, "actionKind"> = {},
) {
  return buildAiSafeActionDraft({
    ...input,
    actionKind: "contractor_remark_response_draft",
  });
}
