import { buildConsumerRepairMarketplaceSendErrors } from "./ConsumerRepairMarketplaceSend";
import {
  searchConsumerRepairWorkSuggestions,
  type ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";

export function buildConsumerRepairRequestRenderModel(
  state: ConsumerRepairRequestScreenState,
  options: { includeWorkSuggestions?: boolean } = {},
) {
  const { bundle } = state;
  const photoCount = bundle?.media.filter((item) => item.mediaKind === "photo").length ?? 0;
  const videoCount = bundle?.media.filter((item) => item.mediaKind === "video").length ?? 0;
  const documentCount = bundle?.media.filter((item) => item.mediaKind === "document").length ?? 0;
  const approved = bundle?.draft.status === "consumer_approved";
  const sent = bundle?.draft.status === "sent_to_marketplace";
  const marketplaceSendErrors = state.validationErrors.length > 0
    ? state.validationErrors
    : buildConsumerRepairMarketplaceSendErrors({
        bundle,
        contactPhone: state.contactPhone.trim() || bundle?.draft.contactPhone || "",
        problemText: state.problemText.trim() || bundle?.draft.problemText || "",
      });

  return {
    bundle,
    photoCount,
    videoCount,
    documentCount,
    approved,
    sent,
    marketplaceSendErrors,
    workSuggestions: options.includeWorkSuggestions === false
      ? []
      : searchConsumerRepairWorkSuggestions(state.problemText, state.selectedWork),
  };
}
