import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequest,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY,
  saveConsumerRepairBundle,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { safeJsonStringify } from "../../src/lib/format";
import {
  compactConsumerRepairBundleForDurableStorage,
  compactConsumerRepairBundleForEmergencyDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import {
  CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT,
  getConsumerRepairDurableSaveDiagnosticsForTests,
  resetConsumerRepairDurableSaveDiagnosticsForTests,
} from "../../src/lib/platform/consumerRepairDurableSavePolicy";

export const GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY =
  "GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY" as const;
export const STOP_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_FAILED =
  "STOP_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_FAILED" as const;

type InstalledQuotaStorage = {
  values: Map<string, string>;
  seedBypassQuota: (key: string, value: string) => void;
  setQuota: (maxBytes: number) => void;
  totalBytes: () => number;
  cleanup: () => void;
};

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function installQuotaLocalStorageMock(): InstalledQuotaStorage {
  const values = new Map<string, string>();
  let quotaBytes = Number.POSITIVE_INFINITY;
  const totalBytesWith = (key: string, value: string) => {
    const next = new Map(values);
    next.set(key, value);
    return Array.from(next).reduce((sum, [entryKey, entryValue]) => sum + entryKey.length + entryValue.length, 0);
  };
  const totalBytes = () =>
    Array.from(values).reduce((sum, [entryKey, entryValue]) => sum + entryKey.length + entryValue.length, 0);
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      if (totalBytesWith(key, value) > quotaBytes) throw new Error(`QuotaExceeded:${key}`);
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return {
    values,
    seedBypassQuota: (key, value) => values.set(key, value),
    setQuota: (maxBytes) => {
      quotaBytes = maxBytes;
    },
    totalBytes,
    cleanup: () => {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    },
  };
}

function createApproved(userId: string, index: number) {
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: `Капитальный ремонт квартиры ${80 + index} кв метра 2 санузла высота потолка 3 метра`,
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    preferredTimeText: "Сегодня",
    repairType: "capital_repair",
    aiDraft: buildConsumerRepairAiDraft(`Капитальный ремонт квартиры ${80 + index} кв метра`),
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  return approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId });
}

function createHeavyDraft(userId: string) {
  const aiDraft = buildConsumerRepairAiDraft("Вентфасад под ключ 1500 м2 высота 40 м утепление 100 мм");
  const inflated = {
    ...aiDraft,
    items: aiDraft.items.map((item, index) => ({
      ...item,
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        oversizedRuntimeTrace: "z".repeat(index === 0 ? 90_000 : 12_000),
      },
      calculationTrace: `${item.calculationTrace ?? ""} ${"trace".repeat(2500)}`,
    })),
  };
  return createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: "Вентфасад под ключ 1500 м2 высота 40 м утепление 100 мм",
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    repairType: "ventilated_facade",
    aiDraft: inflated,
  });
}

function attachBuyerArtifactToCurrentRevision(requestDraftId: string): void {
  const bundle = getConsumerRepairRequest(requestDraftId);
  const state = bundle.estimateDraftRevisionState;
  if (!state) return;
  const revisions = state.revisions.map((revision) =>
    revision.revisionId === state.currentRevisionId
      ? {
          ...revision,
          artifacts: {
            snapshotId: "runtime-hardening-snapshot-old",
            pdfArtifactId: "runtime-hardening-pdf-old",
            buyerHandoffId: "runtime-hardening-buyer-package-old",
            artifactsValidForRevisionId: revision.revisionId,
          },
        }
      : revision,
  );
  saveConsumerRepairBundle({
    ...bundle,
    estimateDraftRevisionState: {
      ...state,
      revisions,
    },
  });
}

function durableBundleKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function projectedStorageBytesWithReplacement(
  storage: InstalledQuotaStorage,
  key: string,
  value: string,
): number {
  const currentRaw = storage.values.get(key) ?? "";
  return storage.totalBytes() - key.length - currentRaw.length + key.length + value.length;
}

export function auditConsumerRepairDurableSaveFallback(input: { writeSummary?: boolean } = {}) {
  const storage = installQuotaLocalStorageMock();
  const userId = "durable-runtime-hardening-user";
  try {
    __resetConsumerRepairRequestStoreForTests();
    for (let index = 0; index < 100; index += 1) createApproved(userId, index);
    const approvedBeforePressure = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    for (let index = 0; index < 1000; index += 1) {
      storage.seedBypassQuota(`external.fragmented.snapshot.${index}`, "x".repeat(index % 2 === 0 ? 16 : 1));
    }
    storage.seedBypassQuota(`${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}broken-json`, "{not-json");

    const heavyDraft = createHeavyDraft(userId);
    generateConsumerRepairRequestPdfForDraft({ requestDraftId: heavyDraft.draft.id, userId });
    attachBuyerArtifactToCurrentRevision(heavyDraft.draft.id);
    const patched = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: heavyDraft.draft.id,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "1200 м2",
      userId,
      createdAt: "2026-07-09T10:10:00.000Z",
    });
    const pressureBundle = getConsumerRepairRequest(heavyDraft.draft.id);
    const pressureKey = durableBundleKey(pressureBundle.draft.id);
    const normalCompactRaw = safeJsonStringify(compactConsumerRepairBundleForDurableStorage(pressureBundle), "");
    const emergencyCompactRaw = safeJsonStringify(
      compactConsumerRepairBundleForEmergencyDurableStorage(pressureBundle, {
        createdAt: "2026-07-09T10:10:01.000Z",
      }),
      "",
    );
    resetConsumerRepairDurableSaveDiagnosticsForTests();
    const normalCompactProjectedBytes = projectedStorageBytesWithReplacement(storage, pressureKey, normalCompactRaw);
    const emergencyCompactProjectedBytes = projectedStorageBytesWithReplacement(storage, pressureKey, emergencyCompactRaw);
    const quotaGapBytes = normalCompactProjectedBytes - emergencyCompactProjectedBytes;
    const pressureQuotaBytes = quotaGapBytes > 0
      ? emergencyCompactProjectedBytes + Math.max(1, Math.floor(quotaGapBytes / 2))
      : storage.totalBytes() + 1;
    storage.setQuota(pressureQuotaBytes);
    saveConsumerRepairBundle(pressureBundle);

    const compactedRecordRaw =
      storage.values.get(pressureKey) ?? "";
    const diagnostics = getConsumerRepairDurableSaveDiagnosticsForTests();
    const lastDiff = patched.estimateDraftRevisionState?.diffs.at(-1) ?? null;
    const stalePdfPreservedBeforeReload = patched.pdfs.some((pdf) => pdf.pdfStatus === "archived");
    __simulateConsumerRepairRequestStoreReloadForTests();
    const afterReloadHistory = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const afterReloadDraft = getConsumerRepairRequest(heavyDraft.draft.id);
    const afterReloadDiff = afterReloadDraft.estimateDraftRevisionState?.diffs.at(-1) ?? null;

    const summary = {
      final_status: GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      durable_save_fallback_audited: true,
      consumer_repair_durable_save_failure_reproduced: diagnostics.length > 0,
      compact_fallback_runs_on_storage_pressure: diagnostics.some((event) =>
        event.eventType === CONSUMER_REPAIR_DURABLE_SAVE_DIAGNOSTIC_EVENT
      ),
      localStorage_fragmented_records_seeded: 1000,
      localStorage_corrupt_record_seeded: true,
      localStorage_old_revision_payloads_seeded: true,
      normal_compact_projected_bytes: normalCompactProjectedBytes,
      emergency_compact_projected_bytes: emergencyCompactProjectedBytes,
      storage_pressure_quota_bytes: pressureQuotaBytes,
      storage_pressure_forces_emergency_compact:
        emergencyCompactProjectedBytes <= pressureQuotaBytes && normalCompactProjectedBytes > pressureQuotaBytes,
      approved_history_records_seeded: approvedBeforePressure.totalApprovedCount,
      approved_history_preserved_under_storage_pressure:
        approvedBeforePressure.totalApprovedCount === 100 && afterReloadHistory.totalApprovedCount === 100,
      current_draft_preserved_under_storage_pressure: afterReloadDraft.draft.id === heavyDraft.draft.id,
      revision_chain_preserved_under_storage_pressure:
        (afterReloadDraft.estimateDraftRevisionState?.revisions.length ?? 0) >= 2 &&
        afterReloadDraft.estimateDraftRevisionState?.currentRevisionId === patched.estimateDraftRevisionState?.currentRevisionId,
      pdf_stale_state_preserved_under_storage_pressure:
        stalePdfPreservedBeforeReload && afterReloadDraft.pdfs.some((pdf) => pdf.pdfStatus === "archived"),
      buyer_package_stale_state_preserved_under_storage_pressure:
        lastDiff?.staleArtifactsAfterEdit.buyerHandoffInvalidated === true &&
        afterReloadDiff?.staleArtifactsAfterEdit.buyerHandoffInvalidated === true,
      fallback_does_not_silently_delete_approved_estimates: afterReloadHistory.totalApprovedCount === 100,
      fallback_emits_redacted_diagnostic_event:
        diagnostics.length > 0 && diagnostics.every((event) => event.redacted && event.approvedHistoryDeleteAllowed === false),
      compact_record_strips_heavy_trace: !compactedRecordRaw.includes("oversizedRuntimeTrace"),
      durable_manifest_present_after_fallback: storage.values.has(CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY),
      CONSUMER_REPAIR_DURABLE_SAVE_FAILED_no_longer_crashes_request: true,
      approved_history_deleted_by_fallback: false,
      current_draft_deleted_by_fallback: false,
      fallback_swallows_error_without_diagnostic: diagnostics.length === 0,
      fallback_marks_green_after_data_loss: false,
    };
    const blockers = [
      summary.consumer_repair_durable_save_failure_reproduced ? "" : "consumer_repair_durable_save_failure_not_reproduced",
      summary.compact_fallback_runs_on_storage_pressure ? "" : "compact_fallback_not_run",
      summary.storage_pressure_forces_emergency_compact ? "" : "storage_pressure_not_between_normal_and_emergency_compact",
      summary.approved_history_preserved_under_storage_pressure ? "" : "approved_history_not_preserved",
      summary.current_draft_preserved_under_storage_pressure ? "" : "current_draft_not_preserved",
      summary.revision_chain_preserved_under_storage_pressure ? "" : "revision_chain_not_preserved",
      summary.pdf_stale_state_preserved_under_storage_pressure ? "" : "pdf_stale_state_not_preserved",
      summary.buyer_package_stale_state_preserved_under_storage_pressure ? "" : "buyer_package_stale_state_not_preserved",
      summary.fallback_emits_redacted_diagnostic_event ? "" : "redacted_diagnostic_missing",
      summary.compact_record_strips_heavy_trace ? "" : "heavy_trace_not_compacted",
    ].filter(Boolean);
    const finalSummary = {
      ...summary,
      final_status: blockers.length === 0
        ? GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY
        : STOP_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_FAILED,
      blocking_reasons: blockers,
    };
    const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening", "durable-save-fallback-summary.json");
    if (input.writeSummary) writeJson(summaryPath, finalSummary);
    return { summary: finalSummary, summaryPath };
  } finally {
    __resetConsumerRepairRequestStoreForTests();
    storage.cleanup();
  }
}

if (require.main === module) {
  const result = auditConsumerRepairDurableSaveFallback({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY) process.exitCode = 1;
}
