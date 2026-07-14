import { createInMemoryAiEstimateLedgerStore } from "../ledger/adapters/InMemoryAiEstimateLedgerStore";
import { migrateAiEstimateRecord } from "./migrateAiEstimateRecord";
import { createAiEstimateMigrationRegistry } from "./AiEstimateMigrationRegistry";

function legacyBundle(id: string, approved: boolean) {
  const createdAt = "2026-07-09T10:00:00.000Z";
  return {
    draft: {
      id,
      consumerUserId: "migration-owner",
      repairType: "capital_repair",
      title: "Capital repair",
      problemText: "apartment 98 m2",
      status: approved ? "consumer_approved" : "draft",
      missingData: [],
      createdAt,
      updatedAt: createdAt,
      approvedAt: approved ? "2026-07-09T11:00:00.000Z" : null,
    },
    items: [
      {
        id: `${id}-work`,
        requestDraftId: id,
        itemType: "work",
        titleRu: "Work",
        quantity: 98,
        unit: "m2",
        currency: "KGS",
        source: "ai_suggested",
        editableByConsumer: true,
        createdAt,
      },
    ],
    media: [],
    pdfs: approved
      ? [{
        id: `${id}-pdf`,
        requestDraftId: id,
        revisionId: `${id}-r1`,
        snapshotId: `${id}-snapshot`,
        storageBucket: "pdf",
        storageKey: `${id}.pdf`,
        titleRu: "PDF",
        pdfStatus: "generated",
        contentType: "application/pdf",
        uploadedAt: createdAt,
        storageVerifiedAt: createdAt,
        createdAt,
      }]
      : [],
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState: {
      estimateDraftId: id,
      currentRevisionId: `${id}-r1`,
      revisions: [],
      diffs: [],
    },
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: `${id}-market`,
      requestDraftId: id,
      marketplaceDemandId: approved ? `${id}-buyer` : null,
      status: approved ? "sent" : "not_sent",
      createdAt,
    },
    events: [],
  };
}

export function validateAiEstimateMigration() {
  const registry = createAiEstimateMigrationRegistry();
  const store = createInMemoryAiEstimateLedgerStore();
  const records = [
    legacyBundle("legacy-draft", false),
    legacyBundle("legacy-history", true),
    legacyBundle("legacy-revision", true),
    legacyBundle("legacy-pdf", true),
    legacyBundle("legacy-buyer", true),
    { partial: true },
  ];
  const first = migrateAiEstimateRecord({
    kind: "legacy_consumer_repair_bundle",
    records,
    context: { store, migratedAt: "2026-07-10T00:00:00.000Z" },
  });
  const second = migrateAiEstimateRecord({
    kind: "legacy_consumer_repair_bundle",
    records,
    context: { store, migratedAt: "2026-07-10T00:00:00.000Z" },
  });
  const history = store.listApprovedHistory({ ownerUserId: "migration-owner", limit: 100 });
  const checks = {
    migration_registry_created: registry.length > 0,
    legacy_draft_migrated: Boolean(store.getRecord("legacy-draft")),
    legacy_history_migrated: Boolean(store.getRecord("legacy-history")),
    legacy_revision_migrated: Boolean(store.getRecord("legacy-revision")),
    legacy_pdf_migrated: history.records.some((record) => record.pdfArtifactId === "legacy-pdf-pdf"),
    legacy_buyer_migrated: history.records.some((record) => record.buyerHandoffId === "legacy-buyer-buyer"),
    partial_record_skipped_without_throw: first.skippedCount === 1,
    idempotent_replay: first.migratedCount === second.migratedCount && second.migrationIdempotent === true,
    rollback_safe_no_legacy_delete: first.legacyRecordsDeleted === false && second.legacyRecordsDeleted === false,
    destructive_migration_absent: registry.every((entry) => entry.destructive === false),
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    first,
    second,
    approvedHistoryTotal: history.totalCount,
    ...checks,
    blockingReasons,
  };
}
