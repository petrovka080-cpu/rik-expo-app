import { buildAiSafeActionDraft } from "../aiSafeActionDraft";
import type { AiSafeActionBuildInput } from "../aiSafeActionTypes";

export function createProcurementPurchaseDraftAction(
  input: Omit<AiSafeActionBuildInput, "actionKind"> = {},
) {
  return buildAiSafeActionDraft({
    ...input,
    actionKind: "procurement_purchase_draft",
  });
}
