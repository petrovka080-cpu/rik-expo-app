import type { ConsumerRepairDraftBundle } from "./consumerRequestTypes";

/**
 * Returns the request identity that owns the immutable canonical revision.
 * History edits get a new local draft id, while backend artifacts remain
 * bound to the original approved request id.
 */
export function consumerRepairSourceRequestDraftId(
  bundle: ConsumerRepairDraftBundle,
): string {
  const sourceEvent = [...bundle.events].reverse().find((event) => {
    const sourceRequestDraftId = event.payload?.sourceRequestDraftId;
    return typeof sourceRequestDraftId === "string" && sourceRequestDraftId.trim().length > 0;
  });
  const sourceRequestDraftId = sourceEvent?.payload?.sourceRequestDraftId;
  return typeof sourceRequestDraftId === "string" && sourceRequestDraftId.trim().length > 0
    ? sourceRequestDraftId.trim()
    : bundle.draft.id;
}
