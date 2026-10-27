import { buildAiSafeActionDraft } from "../aiSafeActionDraft";
import type { AiSafeActionBuildInput } from "../aiSafeActionTypes";

export function createDocumentLinkSuggestionDraftAction(
  input: Omit<AiSafeActionBuildInput, "actionKind"> = {},
) {
  return buildAiSafeActionDraft({
    ...input,
    actionKind: "document_link_suggestion_draft",
  });
}
