import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairEstimateAttachment,
  ConsumerRepairEstimateComment,
} from "../../../consumerRequests/consumerRequestTypes";
import type { RoadworksLegacyRowIdMapEntry } from "./roadworksWaveALegacyMigration";

export function migrateRoadworksWaveABundleMetadata(input: {
  historicalBundle: ConsumerRepairDraftBundle;
  targetBundle: ConsumerRepairDraftBundle;
  legacyRevisionId: string;
  newRevisionId: string;
  rowMap: readonly RoadworksLegacyRowIdMapEntry[];
}): ConsumerRepairDraftBundle {
  const canonicalByLegacy = new Map(
    input.rowMap.filter((entry) => entry.canonicalRowId).map((entry) => [entry.legacyRowId, entry.canonicalRowId!]),
  );
  const comments: ConsumerRepairEstimateComment[] = (input.historicalBundle.estimateComments ?? []).map((comment) => {
    const canonicalRowId = comment.rowId ? canonicalByLegacy.get(comment.rowId) ?? null : null;
    const explicitlyCarried = comment.revisionId === null || canonicalRowId !== null;
    return {
      ...comment,
      estimateId: input.targetBundle.draft.id,
      revisionId: explicitlyCarried ? input.newRevisionId : comment.revisionId,
      rowId: canonicalRowId ?? comment.rowId,
      legacyOrigin: { revisionId: input.legacyRevisionId, rowId: comment.rowId },
    };
  });
  const attachments: ConsumerRepairEstimateAttachment[] =
    (input.historicalBundle.estimateAttachments ?? []).map((attachment) => {
      const canonicalRowId = attachment.rowId ? canonicalByLegacy.get(attachment.rowId) ?? null : null;
      const explicitlyCarried = attachment.ownerScope === "estimate" || canonicalRowId !== null;
      return {
        ...attachment,
        estimateId: input.targetBundle.draft.id,
        revisionId: explicitlyCarried ? input.newRevisionId : attachment.revisionId,
        rowId: canonicalRowId ?? attachment.rowId,
        legacyOrigin: { revisionId: input.legacyRevisionId, rowId: attachment.rowId },
      };
    });
  return {
    ...input.targetBundle,
    estimateComments: comments,
    estimateAttachments: attachments,
  };
}
