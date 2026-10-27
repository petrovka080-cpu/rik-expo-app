import { buildAiSafeActionDraft } from "../aiSafeActionDraft";
import type { AiSafeActionBuildInput } from "../aiSafeActionTypes";

export function createMarketplaceProductCardDraftAction(
  input: Omit<AiSafeActionBuildInput, "actionKind"> = {},
) {
  return buildAiSafeActionDraft({
    ...input,
    actionKind: "marketplace_product_card_draft",
  });
}
