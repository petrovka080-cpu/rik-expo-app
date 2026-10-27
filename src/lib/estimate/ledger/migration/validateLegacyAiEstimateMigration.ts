import { createInMemoryAiEstimateLedgerStore } from "../adapters/InMemoryAiEstimateLedgerStore";
import { migrateLegacyConsumerRepairBundlesToAiEstimateLedger } from "./migrateLegacyAiEstimateLocalState";
import type { ConsumerRepairDraftBundle } from "../../../consumerRequests/consumerRequestTypes";

function sampleLegacyBundle(): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "legacy-estimate-1",
      consumerUserId: "consumer-legacy",
      repairType: "capital_repair",
      title: "Капитальный ремонт",
      problemText: "Квартира 98 м2",
      status: "consumer_approved",
      missingData: [],
      createdAt: "2026-07-09T10:00:00.000Z",
      updatedAt: "2026-07-09T11:00:00.000Z",
      approvedAt: "2026-07-09T11:05:00.000Z",
    },
    items: [
      {
        id: "item-work",
        requestDraftId: "legacy-estimate-1",
        itemType: "work",
        titleRu: "Работа",
        quantity: 98,
        unit: "m2",
        currency: "KGS",
        source: "ai_suggested",
        editableByConsumer: true,
        createdAt: "2026-07-09T10:00:00.000Z",
      },
      {
        id: "item-material",
        requestDraftId: "legacy-estimate-1",
        itemType: "material",
        titleRu: "Материал",
        quantity: 98,
        unit: "m2",
        currency: "KGS",
        source: "catalog_item",
        editableByConsumer: true,
        createdAt: "2026-07-09T10:00:00.000Z",
      },
    ],
    media: [],
    pdfs: [
      {
        id: "pdf-legacy-1",
        requestDraftId: "legacy-estimate-1",
        revisionId: "rev-legacy-1",
        snapshotId: "snapshot-legacy-1",
        storageBucket: "pdf",
        storageKey: "legacy/1.pdf",
        titleRu: "PDF",
        pdfStatus: "generated",
        contentType: "application/pdf",
        uploadedAt: "2026-07-09T11:05:00.000Z",
        storageVerifiedAt: "2026-07-09T11:05:00.000Z",
        createdAt: "2026-07-09T11:05:00.000Z",
      },
    ],
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState: {
      estimateDraftId: "legacy-estimate-1",
      currentRevisionId: "rev-legacy-1",
      revisions: [],
      diffs: [],
    },
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-link-1",
      requestDraftId: "legacy-estimate-1",
      marketplaceDemandId: "buyer-legacy-1",
      status: "sent",
      createdAt: "2026-07-09T11:10:00.000Z",
    },
    events: [],
  };
}

export function validateLegacyAiEstimateMigration() {
  const store = createInMemoryAiEstimateLedgerStore();
  const first = migrateLegacyConsumerRepairBundlesToAiEstimateLedger({
    store,
    bundles: [sampleLegacyBundle()],
    migratedAt: "2026-07-10T00:00:00.000Z",
  });
  const second = migrateLegacyConsumerRepairBundlesToAiEstimateLedger({
    store,
    bundles: [sampleLegacyBundle()],
    migratedAt: "2026-07-10T00:00:00.000Z",
  });
  const record = store.getRecord("legacy-estimate-1");
  const page = store.listApprovedHistory({ ownerUserId: "consumer-legacy", limit: 20 });
  const checks = {
    migrated_without_deleting_legacy_records: first.legacyRecordsDeleted === false && second.legacyRecordsDeleted === false,
    migration_idempotent: record?.eventLog.filter((event) => event.eventType === "revision_approved").length === 1,
    approved_history_restored_from_ledger: page.records.length === 1 && page.records[0]?.pdfArtifactId === "pdf-legacy-1",
    buyer_handoff_restored: page.records[0]?.buyerHandoffId === "buyer-legacy-1",
  };
  return {
    ok: Object.values(checks).every(Boolean),
    first,
    second,
    ...checks,
  };
}
