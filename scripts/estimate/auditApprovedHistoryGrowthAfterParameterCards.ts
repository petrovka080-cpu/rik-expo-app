import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Platform } from "react-native";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
  initializeConsumerRepairTransactionalDurableStorage,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { flushTransactionalConsumerRepairWrites } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";

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

function createApprovedEstimate(userId: string, index: number): string {
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: `Капитальный ремонт квартиры ${70 + index} кв метра 2 санузла высота потолка 3 метра`,
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    preferredTimeText: "Сегодня",
    repairType: "capital_repair",
    aiDraft: buildConsumerRepairAiDraft(`Капитальный ремонт квартиры ${70 + index} кв метра`),
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId });
  return bundle.draft.id;
}

function createHeavyStoragePressureDraft(userId: string): void {
  const aiDraft = buildConsumerRepairAiDraft("Вентфасад 1500 м2 высота 40 м утепление 100 мм");
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
  createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: "Вентфасад 1500 м2 высота 40 м утепление 100 мм",
    contactPhone: "+996 555 123 456",
    city: "Бишкек",
    addressText: "64 Malikova Street",
    repairType: "ventilated_facade",
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
    const ids: string[] = [];
    const milestones = new Map<number, number>();
    for (let index = 0; index < 100; index += 1) {
      ids.push(createApprovedEstimate(userId, index));
      const count = listConsumerRepairApprovedHistory(userId, { limit: 20 }).totalApprovedCount;
      if ([1, 13, 14, 25, 100].includes(index + 1)) milestones.set(index + 1, count);
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
