import { buildAiSafeActionDraft } from "../aiSafeActionDraft";
import type { AiSafeActionBuildInput } from "../aiSafeActionTypes";

export function createClientProgressReportDraftAction(
  input: Omit<AiSafeActionBuildInput, "actionKind"> = {},
) {
  return buildAiSafeActionDraft({
    ...input,
    actionKind: "client_progress_report_draft",
  });
}
