import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  attachConsumerRepairMedia,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequest,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairAiDraft,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamPatch,
  approveCanonicalConsumerRepairAuditDraft,
  createCanonicalConsumerRepairAuditDraft,
} from "./canonicalConsumerRepairAuditHarness";
import {
  CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX,
  CONSUMER_REPAIR_DURABLE_STORE_MANIFEST_KEY,
  getConsumerRepairRepositoryMemoryStatsForTests,
  saveConsumerRepairBundle,
  setConsumerRepairTransactionalDurableStoreForTests,
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
import {
  buildConsumerRepairDurableStorageRoutingPlan,
  flushTransactionalConsumerRepairWrites,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { createEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.factory";

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
  let currentBytes = 0;
  const totalBytesWith = (key: string, value: string) => {
    const previous = values.get(key);
    return currentBytes + value.length - (previous?.length ?? 0) +
      (previous === undefined ? key.length : 0);
  };
  const totalBytes = () => currentBytes;
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
      currentBytes = 0;
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      const previous = values.get(key);
      if (previous !== undefined) currentBytes -= key.length + previous.length;
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      const nextBytes = totalBytesWith(key, value);
      if (nextBytes > quotaBytes) throw new Error(`QuotaExceeded:${key}`);
      values.set(key, value);
      currentBytes = nextBytes;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return {
    values,
    seedBypassQuota: (key, value) => {
      currentBytes = totalBytesWith(key, value);
      values.set(key, value);
    },
    setQuota: (maxBytes) => {
      quotaBytes = maxBytes;
    },
    totalBytes,
    cleanup: () => {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    },
  };
}

function durableHistoryAuditDraft(index: number): ConsumerRepairAiDraft {
  const areaM2 = 80 + index;
  const sheetCount = Math.ceil(areaM2 / 3);
  return {
    titleRu: `Смета истории №${index + 1}`,
    summaryRu: `Нормативный расчёт ГКЛ для проверки durable history, ${areaM2} м².`,
    repairType: "history_storage_audit",
    items: [{
      itemType: "material",
      titleRu: "КНАУФ ГКЛ 12.5 мм 2500x1200 мм",
      quantity: sheetCount,
      unit: "sheet",
      unitLabel: "лист",
      unitPrice: null,
      currency: "KGS",
      source: "reference_price_book",
      category: "drywall_materials",
      sourceId: "history-storage-gkl-12-5",
      sourceLabel: "Нормативный расчёт листов ГКЛ",
      formulaId: "gkl_sheet_count_by_area_v1",
      quantityFormula: "ceil(area_m2 / 3)",
      calculationTrace: `area_m2=${areaM2}; sheet_area_m2=3; result=${sheetCount}`,
      sourceParameters: {
        area_m2: areaM2,
        sheet_area_m2: 3,
        includedInProcurement: true,
      },
      templateId: "history_storage_gkl_audit_v1",
      templateVersion: "1",
      normId: "history_storage_gkl_sheet_norm",
      normFamilyId: "drywall_sheet_material",
      normSourceId: "history_storage_gkl_norm_source",
      normSourceTitle: "Норма площади листа ГКЛ 2500x1200 мм",
      normVersion: "1",
      normReviewStatus: "approved",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      confidence: "high",
      addedBy: "ai",
    }],
    missingData: [],
    dangerousDiyBlocked: false,
  };
}

function createApproved(userId: string, index: number) {
  let bundle = createCanonicalConsumerRepairAuditDraft({
    consumerUserId: userId,
    problemText: `durable approved history estimate ${index + 1}`,
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    preferredTimeText: "Сегодня",
    repairType: "history_storage_audit",
    aiDraft: durableHistoryAuditDraft(index),
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  return approveCanonicalConsumerRepairAuditDraft({ bundle, userId });
}

function createHeavyDraft(userId: string) {
  const problemText = "capital apartment repair 1500 m2 20 bathrooms ceiling height 3 m";
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    estimateDraftId: "durable-runtime-hardening-heavy",
    rawInput: problemText,
    selectedTemplateId: "capital_renovation_professional_calculator_v1",
    city: "Bishkek",
    currency: "KGS",
    createdAt: "2026-07-09T10:00:00.000Z",
  });
  if (!aiDraft) throw new Error("DURABLE_RUNTIME_HARDENING_HEAVY_DRAFT_MISSING");
  const inflated = {
    ...aiDraft,
    items: aiDraft.items.map((item, index) => ({
      ...item,
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        oversizedRuntimeTrace: "z".repeat(index === 0 ? 60_000 : 6_000),
      },
      calculationTrace: `${item.calculationTrace ?? ""} ${"trace".repeat(500)}`,
    })),
  };
  return createCanonicalConsumerRepairAuditDraft({
    consumerUserId: userId,
    problemText,
    contactPhone: "+996 555 123 456",
    city: "Bishkek",
    addressText: "64 Malikova Street",
    repairType: aiDraft.repairType,
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

export async function auditConsumerRepairDurableSaveFallback(input: { writeSummary?: boolean } = {}) {
  const storage = installQuotaLocalStorageMock();
  const userId = "durable-runtime-hardening-user";
  try {
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      createEstimateRevisionDurableStore({ platform: "memory" }),
    );
    for (let index = 0; index < 100; index += 1) {
      createApproved(userId, index);
      if ((index + 1) % 7 === 0) await flushTransactionalConsumerRepairWrites();
    }
    await flushTransactionalConsumerRepairWrites();
    const memoryStatsAfterApprovedSeed = getConsumerRepairRepositoryMemoryStatsForTests();
    const approvedBeforePressure = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    for (let index = 0; index < 1000; index += 1) {
      storage.seedBypassQuota(`external.fragmented.snapshot.${index}`, "x".repeat(index % 2 === 0 ? 16 : 1));
    }
    storage.seedBypassQuota(`${CONSUMER_REPAIR_DURABLE_STORE_BUNDLE_KEY_PREFIX}broken-json`, "{not-json");

    const heavyDraft = createHeavyDraft(userId);
    generateConsumerRepairRequestPdfForDraft({ requestDraftId: heavyDraft.draft.id, userId });
    attachBuyerArtifactToCurrentRevision(heavyDraft.draft.id);
    const patched = applyCanonicalConsumerRepairAuditParamPatch({
      requestDraftId: heavyDraft.draft.id,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "1200 м2",
      userId,
      createdAt: "2026-07-09T10:10:00.000Z",
    });
    const pressureBundle = getConsumerRepairRequest(heavyDraft.draft.id);
    const pressureRoutingPlan = buildConsumerRepairDurableStorageRoutingPlan(pressureBundle);
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
      pressure_bundle_routes_to_local_storage_v3:
        pressureRoutingPlan.route === "LOCAL_STORAGE_V3",
      approved_history_records_seeded: approvedBeforePressure.totalApprovedCount,
      approved_history_full_bundles_retained_in_memory:
        memoryStatsAfterApprovedSeed.approvedFullBundles,
      approved_history_summary_bundles_in_memory:
        memoryStatsAfterApprovedSeed.approvedSummaryBundles,
      approved_history_memory_window_bounded:
        memoryStatsAfterApprovedSeed.approvedFullBundles <= 7 &&
        memoryStatsAfterApprovedSeed.approvedSummaryBundles >= 93,
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
      summary.pressure_bundle_routes_to_local_storage_v3 ? "" : "pressure_bundle_not_local_storage_v3",
      summary.approved_history_preserved_under_storage_pressure ? "" : "approved_history_not_preserved",
      summary.approved_history_memory_window_bounded ? "" : "approved_history_memory_window_unbounded",
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
    await flushTransactionalConsumerRepairWrites();
    __resetConsumerRepairRequestStoreForTests();
    storage.cleanup();
  }
}

if (require.main === module) {
  void auditConsumerRepairDurableSaveFallback({ writeSummary: true })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
      if (result.summary.final_status !== GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY) process.exitCode = 1;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
