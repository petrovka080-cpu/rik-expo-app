import type { AiEstimateLedgerStore } from "../ledger/AiEstimateLedgerStore";
import { migrateLegacyConsumerRepairBundlesToAiEstimateLedger } from "../ledger/migration/migrateLegacyAiEstimateLocalState";
import type { ConsumerRepairDraftBundle } from "../../consumerRequests/consumerRequestTypes";

export type AiEstimateMigrationKind =
  | "legacy_consumer_repair_bundle"
  | "legacy_draft"
  | "legacy_history"
  | "legacy_revision"
  | "legacy_pdf"
  | "legacy_buyer_package"
  | "partial_record";

export type AiEstimateMigrationContext = {
  store: AiEstimateLedgerStore;
  migratedAt: string;
};

export type AiEstimateMigrationEntry = {
  kind: AiEstimateMigrationKind;
  schemaVersion: string;
  destructive: false;
  migrate(input: {
    records: readonly unknown[];
    context: AiEstimateMigrationContext;
  }): {
    migratedCount: number;
    skippedCount: number;
    legacyRecordsDeleted: false;
    migrationIdempotent: true;
  };
};

function isConsumerRepairBundle(value: unknown): value is ConsumerRepairDraftBundle {
  const candidate = value as Partial<ConsumerRepairDraftBundle> | null;
  return Boolean(candidate?.draft && Array.isArray(candidate.items));
}

const CONSUMER_REPAIR_BUNDLE_MIGRATION: AiEstimateMigrationEntry = {
  kind: "legacy_consumer_repair_bundle",
  schemaVersion: "ai-estimate-migration-v1",
  destructive: false,
  migrate(input) {
    const bundles = input.records.filter(isConsumerRepairBundle);
    const result = migrateLegacyConsumerRepairBundlesToAiEstimateLedger({
      store: input.context.store,
      bundles,
      migratedAt: input.context.migratedAt,
    });
    return {
      ...result,
      skippedCount: result.skippedCount + input.records.length - bundles.length,
    };
  },
};

export function createAiEstimateMigrationRegistry(): readonly AiEstimateMigrationEntry[] {
  return [CONSUMER_REPAIR_BUNDLE_MIGRATION];
}

export function findAiEstimateMigration(kind: AiEstimateMigrationKind): AiEstimateMigrationEntry | null {
  return createAiEstimateMigrationRegistry().find((entry) => entry.kind === kind) ?? null;
}
