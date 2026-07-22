import { createInMemoryAiEstimateLedgerStore } from "../estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import type { AiEstimateLedgerHistoryQuery, AiEstimateLedgerStatus } from "../estimate/ledger/AiEstimateLedgerTypes";
import type { AiEstimateLedgerStore } from "../estimate/ledger/AiEstimateLedgerStore";
import type {
  ApprovedEstimateHistoryRecord,
  ConsumerRepairDraftBundle,
  ConsumerRepairStatus,
} from "./consumerRequestTypes";

const consumerRepairEstimateLedgerStore = createInMemoryAiEstimateLedgerStore();

function sourceDraftIdForBundle(bundle: ConsumerRepairDraftBundle): string {
  const sourceEvent = [...bundle.events].reverse().find((event) => {
    const sourceRequestDraftId = event.payload?.sourceRequestDraftId;
    return typeof sourceRequestDraftId === "string" && sourceRequestDraftId.trim().length > 0;
  });
  const sourceRequestDraftId = sourceEvent?.payload?.sourceRequestDraftId;
  return typeof sourceRequestDraftId === "string" ? sourceRequestDraftId : bundle.draft.id;
}

function statusToLedgerStatus(status: ConsumerRepairStatus): AiEstimateLedgerStatus {
  if (status === "consumer_approved") return "approved";
  if (status === "sent_to_marketplace") return "sent_to_marketplace";
  if (status === "archived") return "archived";
  if (status === "deleted_by_user") return "deleted";
  return "draft";
}

function historyStatusesToLedger(statuses?: ConsumerRepairStatus[]): AiEstimateLedgerStatus[] | undefined {
  return statuses?.length ? statuses.map(statusToLedgerStatus) : undefined;
}

function currentRevisionIdForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.estimateRevisionState?.current_revision_id
    ?? bundle.estimateDraftRevisionState?.currentRevisionId
    ?? bundle.durableHistorySummary?.sourceRevisionId
    ?? bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated")?.revisionId
    ?? bundle.draft.id;
}

function currentSnapshotIdForBundle(bundle: ConsumerRepairDraftBundle): string {
  const currentRevisionId = currentRevisionIdForBundle(bundle);
  const currentPdf = bundle.pdfs.find((pdf) =>
    pdf.pdfStatus === "generated" && pdf.revisionId === currentRevisionId
  );
  const revision = bundle.estimateRevisionState?.revisions.find((candidate) =>
    candidate.revision_id === currentRevisionId
  );
  return currentPdf?.snapshotId
    ?? revision?.snapshot_id
    ?? bundle.editableEstimateSnapshot?.snapshotId
    ?? bundle.durableHistorySummary?.sourceSnapshotId
    ?? `editable_estimate:${bundle.draft.id}`;
}

function selectedTemplateIdForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.draft.selectedWorkKey
    ?? bundle.structuredEstimatePayload?.workKey
    ?? bundle.draft.repairType;
}

function familyForBundle(bundle: ConsumerRepairDraftBundle): string {
  return bundle.draft.selectedWorkCategoryKey
    ?? bundle.draft.selectedWorkKey
    ?? bundle.draft.repairType;
}

function latestGeneratedPdfForCurrentRevision(bundle: ConsumerRepairDraftBundle) {
  const currentRevisionId = currentRevisionIdForBundle(bundle);
  return bundle.pdfs.find((pdf) =>
    pdf.pdfStatus === "generated" && pdf.revisionId === currentRevisionId
  ) ?? bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated") ?? null;
}

function rowMetricsForBundle(bundle: ConsumerRepairDraftBundle): {
  rowCount: number;
  materialRowsCount: number;
  workRowsCount: number;
} {
  if (bundle.items.length > 0) {
    return {
      rowCount: bundle.items.length,
      materialRowsCount: bundle.items.filter((item) => item.itemType === "material").length,
      workRowsCount: bundle.items.filter((item) => item.itemType === "work").length,
    };
  }
  return {
    rowCount: bundle.durableHistorySummary?.rowCount ?? 0,
    materialRowsCount: bundle.durableHistorySummary?.materialRowsCount ?? 0,
    workRowsCount: bundle.durableHistorySummary?.workRowsCount ?? 0,
  };
}

export function syncConsumerRepairBundleToAiEstimateLedger(bundle: ConsumerRepairDraftBundle): void {
  const estimateId = bundle.draft.id;
  const currentRevisionId = currentRevisionIdForBundle(bundle);
  const currentSnapshotId = currentSnapshotIdForBundle(bundle);
  const updatedAt = bundle.draft.updatedAt ?? bundle.draft.approvedAt ?? bundle.draft.createdAt;
  const existing = consumerRepairEstimateLedgerStore.getRecord(estimateId);
  const rowMetrics = rowMetricsForBundle(bundle);
  if (existing && existing.currentRevisionId !== currentRevisionId) {
    consumerRepairEstimateLedgerStore.appendRevision({
      estimateId,
      revision: {
        revisionId: currentRevisionId,
        previousRevisionId: existing.currentRevisionId,
        source: "consumer_request",
        createdAt: updatedAt,
        params: {},
        rowCount: rowMetrics.rowCount,
        materialRowsCount: rowMetrics.materialRowsCount,
        workRowsCount: rowMetrics.workRowsCount,
        snapshotId: currentSnapshotId,
        pdfArtifactId: null,
        buyerHandoffId: null,
        artifactsValidForRevisionId: null,
      },
      actorUserId: bundle.draft.consumerUserId,
      sourceLayer: "consumer_request",
      idempotencyKey: `consumer_repair_revision:${estimateId}:${currentRevisionId}`,
    });
  }

  consumerRepairEstimateLedgerStore.upsertDraft({
    estimateId,
    ownerUserId: bundle.draft.consumerUserId,
    orgId: bundle.draft.orgId ?? null,
    kind: "consumer_repair",
    sourceRoute: "/request",
    title: bundle.draft.title ?? bundle.draft.repairType,
    prompt: bundle.draft.problemText ?? "",
    selectedTemplateId: selectedTemplateIdForBundle(bundle),
    family: familyForBundle(bundle),
    createdAt: bundle.draft.createdAt,
    updatedAt,
    status: statusToLedgerStatus(bundle.draft.status),
    sourceDraftId: sourceDraftIdForBundle(bundle),
    currentRevisionId,
    sourceSnapshotId: currentSnapshotId,
    rowCount: rowMetrics.rowCount,
    materialRowsCount: rowMetrics.materialRowsCount,
    workRowsCount: rowMetrics.workRowsCount,
    artifacts: {
      snapshotId: currentSnapshotId,
      pdfArtifactId: latestGeneratedPdfForCurrentRevision(bundle)?.id ?? null,
      buyerHandoffId: bundle.marketplaceLink.marketplaceDemandId ?? null,
      artifactsValidForRevisionId: currentRevisionId,
    },
    actorUserId: bundle.draft.consumerUserId,
    sourceLayer: "consumer_request",
    idempotencyKey: `consumer_repair_upsert:${estimateId}:${currentRevisionId}:${updatedAt}:${bundle.draft.status}`,
  });

  const generatedPdf = latestGeneratedPdfForCurrentRevision(bundle);
  if (generatedPdf) {
    consumerRepairEstimateLedgerStore.bindArtifacts({
      estimateId,
      revisionId: currentRevisionId,
      snapshotId: generatedPdf.snapshotId ?? currentSnapshotId,
      pdfArtifactId: generatedPdf.id,
      buyerHandoffId: bundle.marketplaceLink.marketplaceDemandId ?? null,
      actorUserId: bundle.draft.consumerUserId,
      sourceLayer: "consumer_request",
      idempotencyKey: `consumer_repair_artifacts:${estimateId}:${currentRevisionId}:${generatedPdf.id}:${bundle.marketplaceLink.marketplaceDemandId ?? "no_buyer"}`,
      boundAt: generatedPdf.createdAt,
    });
  }

  if (bundle.draft.status === "consumer_approved" || bundle.draft.status === "sent_to_marketplace") {
    consumerRepairEstimateLedgerStore.approveRevision({
      estimateId,
      revisionId: currentRevisionId,
      approvedAt: bundle.draft.approvedAt ?? updatedAt,
      actorUserId: bundle.draft.consumerUserId,
      sourceLayer: "consumer_request",
      idempotencyKey: `consumer_repair_approve:${estimateId}:${currentRevisionId}`,
    });
  }

  if (bundle.draft.status === "sent_to_marketplace" || bundle.draft.status === "archived" || bundle.draft.status === "deleted_by_user") {
    consumerRepairEstimateLedgerStore.setStatus({
      estimateId,
      status: statusToLedgerStatus(bundle.draft.status),
      updatedAt,
      deletedAt: bundle.draft.deletedAt ?? null,
      actorUserId: bundle.draft.consumerUserId,
      sourceLayer: "consumer_request",
      idempotencyKey: `consumer_repair_status:${estimateId}:${bundle.draft.status}:${updatedAt}`,
    });
  }
}

export function listConsumerRepairApprovedHistoryRecordsFromLedger(
  consumerUserId: string,
  options: {
    statuses?: ConsumerRepairStatus[];
    cursorCreatedAt?: string | null;
    limit?: number;
  } = {},
): { records: ApprovedEstimateHistoryRecord[]; nextCursorCreatedAt: string | null; totalCount: number } {
  const query: AiEstimateLedgerHistoryQuery = {
    ownerUserId: consumerUserId,
    statuses: historyStatusesToLedger(options.statuses),
    cursorCreatedAt: options.cursorCreatedAt,
    limit: options.limit,
  };
  const page = consumerRepairEstimateLedgerStore.listApprovedHistory(query);
  return {
    records: page.records.map((record) => ({
      approvedEstimateId: record.approvedEstimateId,
      sourceDraftId: record.sourceDraftId,
      sourceRevisionId: record.sourceRevisionId,
      sourceSnapshotId: record.sourceSnapshotId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      title: record.title,
      prompt: record.prompt,
      selectedTemplateId: record.selectedTemplateId,
      family: record.family,
      rowCount: record.rowCount,
      materialRowsCount: record.materialRowsCount,
      workRowsCount: record.workRowsCount,
      pdfArtifactId: record.pdfArtifactId,
      buyerHandoffId: record.buyerHandoffId,
      status: record.status,
    })),
    nextCursorCreatedAt: page.nextCursorCreatedAt,
    totalCount: page.totalCount,
  };
}

export function countConsumerRepairApprovedHistoryRecordsFromLedger(
  consumerUserId: string,
  statuses?: ConsumerRepairStatus[],
): number {
  return consumerRepairEstimateLedgerStore.countApprovedHistory({
    ownerUserId: consumerUserId,
    statuses: historyStatusesToLedger(statuses),
  });
}

export function getConsumerRepairAiEstimateLedgerStoreForTests(): AiEstimateLedgerStore {
  return consumerRepairEstimateLedgerStore;
}

export function resetConsumerRepairAiEstimateLedgerForTests(): void {
  consumerRepairEstimateLedgerStore.resetForTests();
}
