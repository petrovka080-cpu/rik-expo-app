import type { EditableEstimateRow } from "../../ai/editableEstimate";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import {
  hasUnhydratedTransactionalConsumerRepairBundles,
  hydrateNextTransactionalConsumerRepairHistoryPage,
  listAllConsumerRepairBundlesForBackendMigration,
} from "../../consumerRequests/consumerRequestRepository";
import type { ConsumerRepairDraftBundle } from "../../consumerRequests/consumerRequestTypes";
import { stableEstimateRevisionChecksum } from "../../platform/estimateRevisionDurableStore.contract";
import { supabase } from "../../supabaseClient";
import {
  getCanonicalEstimateCatalogItem,
  migrateCanonicalEstimateLegacyRevision,
  waitForCanonicalEstimateJob,
} from "./canonicalEstimateClient";
import type {
  CanonicalEstimateLegacyRevisionRequest,
  CanonicalEstimateLegacyRow,
} from "./contracts";

const MAX_HYDRATION_PAGES = 1_000;

export type ExistingCanonicalEstimateMigrationResult = {
  scannedBundles: number;
  migratedRevisions: number;
  alreadyAdmittedRevisions: number;
  skippedRevisions: number;
  failures: Array<{ sourceEstimateId: string; sourceRevisionId: string; code: string }>;
};

function idempotencyKey(sourceEstimateId: string, sourceRevisionId: string): string {
  const raw = `legacy-r1:${sourceEstimateId}:${sourceRevisionId}`;
  if (raw.length <= 200) return raw;
  return `legacy-r1:${stableEstimateRevisionChecksum(raw)}:${sourceEstimateId.slice(0, 70)}:${sourceRevisionId.slice(0, 70)}`;
}

function amount(quantity: number | null, unitPrice: number | null): number | null {
  return quantity == null || unitPrice == null ? null : quantity * unitPrice;
}

function editableRow(row: EditableEstimateRow): CanonicalEstimateLegacyRow {
  return {
    rowId: row.rowId,
    section: row.rowType,
    category: row.category ?? row.rowType,
    titleRu: row.titleRu,
    unitId: row.unit ?? "unit",
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.totalPrice ?? amount(row.quantity, row.unitPrice),
    procurementEligible: row.rowType === "material" && row.removed !== true,
    calculationTrace: row.calculationTrace ? { legacyTrace: row.calculationTrace } : {},
    normativeTrace: row.normSourceId ? [{
      sourceId: row.normSourceId,
      sourceTitle: row.normSourceTitle ?? null,
      normId: row.normId ?? null,
      version: row.normVersion ?? null,
    }] : [],
    sourcePayload: row as unknown as Record<string, unknown>,
  };
}

function draftRow(revision: EstimateDraftRevision, row: ProfessionalBoqRow): CanonicalEstimateLegacyRow {
  const section = revision.boq.sections.find((entry) => entry.rowIds.includes(row.rowId));
  return {
    rowId: row.rowId,
    section: section?.title ?? row.rowType,
    category: row.category ?? row.rowType,
    titleRu: row.titleRu,
    unitId: row.unit || "unit",
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: amount(row.quantity, row.unitPrice ?? null),
    procurementEligible: row.includedInProcurement,
    calculationTrace: row.calculationTrace ? { legacyTrace: row.calculationTrace } : {},
    normativeTrace: row.normSourceId ? [{
      sourceId: row.normSourceId,
      sourceTitle: row.normSourceTitle ?? null,
      normId: row.normId ?? null,
      version: row.normVersion ?? null,
    }] : [],
    sourcePayload: row as unknown as Record<string, unknown>,
  };
}

function revisionRequests(bundle: ConsumerRepairDraftBundle): CanonicalEstimateLegacyRevisionRequest[] {
  const authoritative = bundle.estimateRevisionState?.revisions ?? [];
  if (authoritative.length > 0) {
    return [...authoritative]
      .sort((left, right) => left.version_number - right.version_number)
      .map((revision) => {
        const catalogId = bundle.draft.selectedCatalogWorkId
          ?? revision.selected_work_key
          ?? revision.editable_estimate_snapshot.workKey
          ?? "";
        const rows = revision.editable_estimate_snapshot.rows
          .filter((row) => row.removed !== true)
          .map(editableRow);
        return {
          idempotencyKey: idempotencyKey(revision.estimate_id, revision.revision_id),
          sourceEstimateId: revision.estimate_id,
          sourceRevisionId: revision.revision_id,
          catalogId,
          organizationId: bundle.draft.orgId ?? null,
          currencyCode: revision.currency,
          parameters: {},
          totals: revision.editable_estimate_snapshot.totals as unknown as Record<string, unknown>,
          rows,
        };
      });
  }

  const state = bundle.estimateDraftRevisionState;
  if (!state?.revisions.length) return [];
  return state.revisions.map((revision) => {
    const catalogId = bundle.draft.selectedCatalogWorkId
      ?? revision.resolvedIdentity?.requestedCatalogWorkId
      ?? revision.selectedTemplateId;
    const rows = revision.boq.rows.map((row) => draftRow(revision, row));
    const currencyCode = revision.boq.rows.find((row) => /^[A-Z]{3}$/.test(row.currency))?.currency ?? "KGS";
    const total = rows.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
    return {
      idempotencyKey: idempotencyKey(revision.estimateDraftId, revision.revisionId),
      sourceEstimateId: revision.estimateDraftId,
      sourceRevisionId: revision.revisionId,
      catalogId,
      organizationId: bundle.draft.orgId ?? null,
      currencyCode,
      parameters: Object.fromEntries(Object.entries(revision.params).map(([key, value]) => [key, value.value])),
      totals: { amount: total, currencyCode, source: "legacy_draft_revision" },
      rows,
    };
  });
}

async function drainTransactionalHistory(): Promise<void> {
  let pages = 0;
  while (hasUnhydratedTransactionalConsumerRepairBundles()) {
    if (pages >= MAX_HYDRATION_PAGES) throw new Error("LEGACY_HYDRATION_PAGE_LIMIT_EXCEEDED");
    const hydrated = await hydrateNextTransactionalConsumerRepairHistoryPage();
    if (hydrated <= 0) break;
    pages += 1;
  }
}

/**
 * Idempotent one-time ingress for local immutable histories. It never deletes
 * or rewrites local bundles; the server ledger de-duplicates exact source
 * estimate/revision identities and preserves every source row payload.
 */
export async function migrateExistingEstimatesToCanonicalBackend(
  signal?: AbortSignal | null,
): Promise<ExistingCanonicalEstimateMigrationResult> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("AUTH_REQUIRED");
  await drainTransactionalHistory();
  const bundles = listAllConsumerRepairBundlesForBackendMigration(data.user.id);
  const result: ExistingCanonicalEstimateMigrationResult = {
    scannedBundles: bundles.length,
    migratedRevisions: 0,
    alreadyAdmittedRevisions: 0,
    skippedRevisions: 0,
    failures: [],
  };
  const knownCatalogs = new Map<string, boolean>();
  for (const bundle of bundles) {
    let parentCanonicalRevisionId: string | null = null;
    for (const request of revisionRequests(bundle)) {
      if (signal?.aborted) throw signal.reason ?? new Error("legacy estimate migration aborted");
      if (!request.catalogId) {
        result.skippedRevisions += 1;
        result.failures.push({
          sourceEstimateId: request.sourceEstimateId,
          sourceRevisionId: request.sourceRevisionId,
          code: "CATALOG_ID_MISSING",
        });
        continue;
      }
      let catalogExists = knownCatalogs.get(request.catalogId);
      if (catalogExists == null) {
        catalogExists = await getCanonicalEstimateCatalogItem(request.catalogId, signal).then(() => true, () => false);
        knownCatalogs.set(request.catalogId, catalogExists);
      }
      if (!catalogExists) {
        result.skippedRevisions += 1;
        result.failures.push({
          sourceEstimateId: request.sourceEstimateId,
          sourceRevisionId: request.sourceRevisionId,
          code: "CATALOG_NOT_IN_MIGRATED_CORPUS",
        });
        continue;
      }
      try {
        const accepted = await migrateCanonicalEstimateLegacyRevision({
          ...request,
          parentCanonicalRevisionId,
        }, signal);
        const job = await waitForCanonicalEstimateJob({ jobId: accepted.jobId, signal, timeoutMs: 120_000 });
        parentCanonicalRevisionId = job.resultRevisionId;
        if (accepted.created) result.migratedRevisions += 1;
        else result.alreadyAdmittedRevisions += 1;
      } catch (migrationError) {
        result.failures.push({
          sourceEstimateId: request.sourceEstimateId,
          sourceRevisionId: request.sourceRevisionId,
          code: migrationError instanceof Error ? migrationError.message : "LEGACY_MIGRATION_FAILED",
        });
      }
    }
  }
  return result;
}
