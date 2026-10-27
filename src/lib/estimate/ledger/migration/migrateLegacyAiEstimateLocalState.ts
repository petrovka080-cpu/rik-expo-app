import type { ConsumerRepairDraftBundle } from "../../../consumerRequests/consumerRequestTypes";
import type { AiEstimateLedgerStore } from "../AiEstimateLedgerStore";
import type { AiEstimateLedgerArtifactRefs, AiEstimateLedgerStatus } from "../AiEstimateLedgerTypes";

export type AiEstimateLegacyMigrationResult = {
  migratedCount: number;
  skippedCount: number;
  legacyRecordsDeleted: false;
  migrationIdempotent: true;
  migratedEstimateIds: string[];
};

function statusFromConsumerRepair(status: ConsumerRepairDraftBundle["draft"]["status"]): AiEstimateLedgerStatus {
  if (status === "consumer_approved") return "approved";
  if (status === "sent_to_marketplace") return "sent_to_marketplace";
  if (status === "archived") return "archived";
  if (status === "deleted_by_user") return "deleted";
  return "draft";
}

function artifactsFromBundle(bundle: ConsumerRepairDraftBundle): Partial<AiEstimateLedgerArtifactRefs> {
  const pdf = bundle.pdfs.find((candidate) => candidate.pdfStatus === "generated") ?? null;
  const currentRevisionId = bundle.estimateDraftRevisionState?.currentRevisionId
    ?? bundle.estimateRevisionState?.current_revision_id
    ?? bundle.draft.id;
  return {
    snapshotId: pdf?.snapshotId ?? bundle.editableEstimateSnapshot?.snapshotId ?? `editable_estimate:${bundle.draft.id}`,
    pdfArtifactId: pdf?.id ?? null,
    buyerHandoffId: bundle.marketplaceLink.marketplaceDemandId ?? null,
    artifactsValidForRevisionId: pdf?.revisionId ?? currentRevisionId,
  };
}

export function migrateLegacyConsumerRepairBundlesToAiEstimateLedger(input: {
  store: AiEstimateLedgerStore;
  bundles: readonly ConsumerRepairDraftBundle[];
  migratedAt: string;
}): AiEstimateLegacyMigrationResult {
  const migratedEstimateIds: string[] = [];
  let skippedCount = 0;
  for (const bundle of input.bundles) {
    if (!bundle.draft.id || !bundle.draft.consumerUserId) {
      skippedCount += 1;
      continue;
    }
    const currentRevisionId = bundle.estimateDraftRevisionState?.currentRevisionId
      ?? bundle.estimateRevisionState?.current_revision_id
      ?? bundle.draft.id;
    const sourceSnapshotId = bundle.editableEstimateSnapshot?.snapshotId
      ?? bundle.pdfs.find((pdf) => pdf.revisionId === currentRevisionId)?.snapshotId
      ?? `editable_estimate:${bundle.draft.id}`;
    input.store.upsertDraft({
      estimateId: bundle.draft.id,
      ownerUserId: bundle.draft.consumerUserId,
      orgId: bundle.draft.orgId ?? null,
      kind: "consumer_repair",
      sourceRoute: "/request",
      title: bundle.draft.title ?? bundle.draft.repairType,
      prompt: bundle.draft.problemText ?? "",
      selectedTemplateId: bundle.draft.selectedWorkKey ?? bundle.structuredEstimatePayload?.workKey ?? bundle.draft.repairType,
      family: bundle.draft.selectedWorkCategoryKey ?? bundle.draft.selectedWorkKey ?? bundle.draft.repairType,
      createdAt: bundle.draft.createdAt,
      updatedAt: bundle.draft.updatedAt ?? bundle.draft.approvedAt ?? bundle.draft.createdAt,
      status: statusFromConsumerRepair(bundle.draft.status),
      sourceDraftId: bundle.draft.id,
      currentRevisionId,
      sourceSnapshotId,
      rowCount: bundle.items.length,
      materialRowsCount: bundle.items.filter((item) => item.itemType === "material").length,
      workRowsCount: bundle.items.filter((item) => item.itemType === "work").length,
      artifacts: artifactsFromBundle(bundle),
      actorUserId: bundle.draft.consumerUserId,
      sourceLayer: "legacy_migration",
      idempotencyKey: `legacy_migration:${bundle.draft.id}:${currentRevisionId}`,
    });
    if (bundle.draft.status === "consumer_approved" || bundle.draft.status === "sent_to_marketplace") {
      input.store.approveRevision({
        estimateId: bundle.draft.id,
        revisionId: currentRevisionId,
        approvedAt: bundle.draft.approvedAt ?? input.migratedAt,
        actorUserId: bundle.draft.consumerUserId,
        sourceLayer: "legacy_migration",
        idempotencyKey: `legacy_migration_approved:${bundle.draft.id}:${currentRevisionId}`,
      });
    }
    migratedEstimateIds.push(bundle.draft.id);
  }
  return {
    migratedCount: migratedEstimateIds.length,
    skippedCount,
    legacyRecordsDeleted: false,
    migrationIdempotent: true,
    migratedEstimateIds,
  };
}
