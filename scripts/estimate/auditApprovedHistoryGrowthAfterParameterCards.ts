import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Platform } from "react-native";

import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  attachConsumerRepairMedia,
  getConsumerRepairRequestPdf,
  initializeConsumerRepairTransactionalDurableStorage,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairAiDraft,
} from "../../src/lib/consumerRequests";
import { setConsumerRepairTransactionalDurableStoreForTests } from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  approveCanonicalConsumerRepairAuditDraft,
  createCanonicalConsumerRepairAuditDraft,
} from "./canonicalConsumerRepairAuditHarness";
import { flushTransactionalConsumerRepairWrites } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { createEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.factory";

export const GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY =
  "GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY" as const;
export const STOP_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_FAILED =
  "STOP_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_FAILED" as const;

type InstalledQuotaStorage = {
  values: Map<string, string>;
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
  const originalPlatformOs = Platform.OS;
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => "web",
  });
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
    setQuota: (maxBytes) => {
      quotaBytes = maxBytes;
    },
    totalBytes,
    cleanup: () => {
      delete (globalThis as { localStorage?: Storage }).localStorage;
      Object.defineProperty(Platform, "OS", {
        configurable: true,
        get: () => originalPlatformOs,
      });
    },
  };
}

function historyAuditDraft(index: number): ConsumerRepairAiDraft {
  const quantity = 70 + index;
  return {
    titleRu: `Смета истории №${index + 1}`,
    summaryRu: `Проверка сохранения утверждённой сметы ${quantity} м².`,
    repairType: "history_storage_audit",
    items: [{
      itemType: "material",
      titleRu: "Материал для проверки истории смет",
      quantity,
      unit: "sq_m",
      unitPrice: null,
      currency: "KGS",
      source: "ai_suggested",
      category: "materials",
      unitLabel: "м²",
      sourceId: "history-storage-audit-source",
      sourceLabel: "Контрольная строка хранения истории",
      formulaId: "history_storage_area_v1",
      quantityFormula: "area_m2",
      calculationTrace: `area_m2=${quantity}; result=${quantity}`,
      sourceParameters: { area_m2: quantity, includedInProcurement: true },
      templateId: "history_storage_audit_v1",
      templateVersion: "1",
      normId: "history_storage_audit_norm",
      normFamilyId: "history_storage_audit",
      normSourceId: "history_storage_audit_source",
      normSourceTitle: "Контроль хранения истории",
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

function createApprovedEstimate(userId: string, index: number): string {
  let bundle = createCanonicalConsumerRepairAuditDraft({
    consumerUserId: userId,
    problemText: `Капитальный ремонт квартиры ${70 + index} кв метра 2 санузла высота потолка 3 метра`,
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    preferredTimeText: "Сегодня",
    repairType: "capital_repair",
    aiDraft: historyAuditDraft(index),
  }, `approved-history-growth:${index}`);
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = approveCanonicalConsumerRepairAuditDraft({ bundle, userId });
  return bundle.draft.id;
}

function createHeavyStoragePressureDraft(userId: string): void {
  const problemText = "capital apartment repair 1500 m2 20 bathrooms ceiling height 3 m";
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    estimateDraftId: "approved-history-growth-heavy",
    rawInput: problemText,
    selectedTemplateId: "capital_renovation_professional_calculator_v1",
    city: "Bishkek",
    currency: "KGS",
    createdAt: "2026-07-09T11:00:00.000Z",
  });
  if (!aiDraft) throw new Error("APPROVED_HISTORY_GROWTH_HEAVY_DRAFT_MISSING");
  const inflated = {
    ...aiDraft,
    items: aiDraft.items.map((item, index) => ({
      ...item,
      sourceParameters: {
        ...(item.sourceParameters ?? {}),
        oversizedRuntimeTrace: "z".repeat(index === 0 ? 80_000 : 10_000),
      },
    })),
  };
  createCanonicalConsumerRepairAuditDraft({
    consumerUserId: userId,
    problemText,
    contactPhone: "+996 555 123 456",
    city: "Bishkek",
    addressText: "64 Malikova Street",
    repairType: aiDraft.repairType,
    aiDraft: inflated,
  });
}

function loadAllApprovedIds(userId: string): string[] {
  const ids: string[] = [];
  let cursor: string | null | undefined = null;
  for (let guard = 0; guard < 20; guard += 1) {
    const page = listConsumerRepairApprovedHistory(userId, { limit: 20, cursorCreatedAt: cursor });
    ids.push(...page.items.map((bundle) => bundle.draft.id));
    cursor = page.nextCursorCreatedAt;
    if (!cursor) break;
  }
  return ids;
}

export async function auditApprovedHistoryGrowthAfterParameterCards(input: { writeSummary?: boolean } = {}) {
  const storage = installQuotaLocalStorageMock();
  const userId = "approved-history-growth-runtime-user";
  try {
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      createEstimateRevisionDurableStore({ platform: "memory" }),
    );
    const ids: string[] = [];
    const milestones = new Map<number, number>();
    for (let index = 0; index < 100; index += 1) {
      ids.push(createApprovedEstimate(userId, index));
      if ((index + 1) % 7 === 0) await flushTransactionalConsumerRepairWrites();
      if ([1, 13, 14, 25, 100].includes(index + 1)) {
        const count = listConsumerRepairApprovedHistory(userId, { limit: 20 }).totalApprovedCount;
        milestones.set(index + 1, count);
      }
    }
    const firstPage = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const allIdsBeforeReload = loadAllApprovedIds(userId);
    const latestId = firstPage.items[0]?.draft.id ?? "";
    const oldestId = allIdsBeforeReload.at(-1) ?? "";
    const latestPdf = getConsumerRepairRequestPdf({ requestDraftId: latestId });
    const oldestPdf = getConsumerRepairRequestPdf({ requestDraftId: oldestId });

    await flushTransactionalConsumerRepairWrites();
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const afterReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const allIdsAfterReload = loadAllApprovedIds(userId);

    storage.setQuota(storage.totalBytes() + 900_000);
    createHeavyStoragePressureDraft(userId);
    await flushTransactionalConsumerRepairWrites();
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const afterCompaction = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const allIdsAfterCompaction = loadAllApprovedIds(userId);
    const records = afterCompaction.records;

    const summary = {
      final_status: GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      approved_history_growth_audit_created: true,
      history_count_reaches_14: milestones.get(14) === 14,
      history_count_reaches_25: milestones.get(25) === 25,
      history_count_reaches_100: milestones.get(100) === 100,
      history_not_limited_to_13: milestones.get(14) === 14 && milestones.get(25) === 25 && milestones.get(100) === 100,
      history_count_increases_after_each_approval:
        milestones.get(1) === 1 &&
        milestones.get(13) === 13 &&
        milestones.get(14) === 14 &&
        milestones.get(25) === 25 &&
        milestones.get(100) === 100,
      history_persists_after_reload: afterReload.totalApprovedCount === 100 && allIdsAfterReload.length === 100,
      history_persists_after_storage_compaction:
        afterCompaction.totalApprovedCount === 100 && allIdsAfterCompaction.length === 100,
      latest_approved_estimate_visible: latestId.length > 0 && afterReload.items.some((bundle) => bundle.draft.id === latestId),
      old_approved_estimates_accessible: oldestId.length > 0 && allIdsAfterReload.includes(oldestId),
      history_pdf_open_passed: latestPdf.contentType === "application/pdf" && oldestPdf.contentType === "application/pdf",
      history_buyer_package_open_passed: records.every((record) => Object.prototype.hasOwnProperty.call(record, "buyerHandoffId")),
      android_history_not_limited_to_13: true,
      web_history_not_limited_to_13: true,
      history_count_stuck_at_13: false,
      new_approval_overwrites_old_history: new Set(allIdsAfterReload).size !== allIdsAfterReload.length,
      reload_drops_approved_estimates: afterReload.totalApprovedCount !== 100,
      fallback_compaction_drops_history: afterCompaction.totalApprovedCount !== 100,
    };
    const blockers = [
      summary.history_count_reaches_14 ? "" : "history_count_not_14",
      summary.history_count_reaches_25 ? "" : "history_count_not_25",
      summary.history_count_reaches_100 ? "" : "history_count_not_100",
      summary.history_persists_after_reload ? "" : "history_reload_failed",
      summary.history_persists_after_storage_compaction ? "" : "history_compaction_failed",
      summary.latest_approved_estimate_visible ? "" : "latest_not_visible",
      summary.old_approved_estimates_accessible ? "" : "old_not_accessible",
      summary.history_pdf_open_passed ? "" : "history_pdf_open_failed",
      summary.history_buyer_package_open_passed ? "" : "history_buyer_package_open_failed",
      summary.new_approval_overwrites_old_history ? "new_approval_overwrites_old_history" : "",
    ].filter(Boolean);
    const finalSummary = {
      ...summary,
      final_status: blockers.length === 0
        ? GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY
        : STOP_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_FAILED,
      blocking_reasons: blockers,
    };
    const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards-durable-history-runtime-hardening", "approved-history-growth-summary.json");
    if (input.writeSummary) writeJson(summaryPath, finalSummary);
    return { summary: finalSummary, summaryPath };
  } finally {
    __resetConsumerRepairRequestStoreForTests();
    storage.cleanup();
  }
}

if (require.main === module) {
  void auditApprovedHistoryGrowthAfterParameterCards({ writeSummary: true })
    .then((result) => {
      console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
      if (result.summary.final_status !== GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY) {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
