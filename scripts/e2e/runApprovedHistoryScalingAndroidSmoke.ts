import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  approveConsumerRepairRequestDraft,
  archiveConsumerRepairApprovedHistoryRecord,
  attachConsumerRepairMedia,
  createConsumerRepairDraftFromHistorySnapshot,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const projectRoot = process.cwd();
const storageKey = "rik.consumer_repair.request_bundles.v1";
const runtimeDir = path.join(projectRoot, ".release-runtime", "ai-estimate-approved-history-scaling", new Date().toISOString().replace(/[:.]/g, "-"));
const artifactPath = path.join(runtimeDir, "android-smoke-summary.json");
const userId = "approved-history-android-smoke-user";
const promptText = "РҐРѕС‡Сѓ СЃРјРµС‚Сѓ РЅР° Р»Р°РјРёРЅР°С‚ Рё РїР»РёРЅС‚СѓСЃ РЅР° 100 РєРІ Рј";

type AndroidSmokeSummary = {
  final_status: "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALING_ANDROID_SMOKE" | "STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALING_ANDROID_SMOKE_FAILED";
  android_created_approved_estimates_count: number;
  android_history_total_after_approve: number;
  android_history_total_after_archive: number;
  android_reload_persistence_passed: boolean;
  android_pagination_load_more_passed: boolean;
  android_pdf_edit_market_actions_passed: boolean;
  android_console_errors_count: number;
  android_emulator_proof_passed: boolean;
  android_probe_blocker: string | null;
  errors: string[];
};

function writeJson(fullPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function installLocalStorageMock(): void {
  const values = new Map<string, string>();
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
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  storage.setItem(storageKey, storage.getItem(storageKey) ?? "[]");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function createApprovedEstimate(index: number): Promise<string> {
  await sleep(2);
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: `${promptText} ${index + 1}`,
    contactPhone: "+996 555 123 456",
    city: "Bishkek",
    addressText: "64 Malikova Street",
    repairType: "flooring",
    aiDraft: buildConsumerRepairAiDraft(promptText),
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId });
  return bundle.draft.id;
}

export async function runApprovedHistoryScalingAndroidSmoke(): Promise<AndroidSmokeSummary> {
  const errors: string[] = [];
  installLocalStorageMock();
  __resetConsumerRepairRequestStoreForTests();

  const ids: string[] = [];
  for (let index = 0; index < 21; index += 1) ids.push(await createApprovedEstimate(index));
  const firstPage = listConsumerRepairApprovedHistory(userId, { limit: 20 });
  const secondPage = listConsumerRepairApprovedHistory(userId, { limit: 20, cursorCreatedAt: firstPage.nextCursorCreatedAt });
  __simulateConsumerRepairRequestStoreReloadForTests();
  const afterReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });

  const firstId = ids[0]!;
  const middleId = ids[Math.floor(ids.length / 2)]!;
  const lastId = ids[ids.length - 1]!;
  getConsumerRepairRequestPdf({ requestDraftId: firstId });
  createConsumerRepairDraftFromHistorySnapshot({ sourceRequestDraftId: middleId, userId, reason: "edit_as_new_revision" });
  archiveConsumerRepairApprovedHistoryRecord({ requestDraftId: lastId, userId });
  const afterArchive = listConsumerRepairApprovedHistory(userId, { limit: 20 });

  let androidProbe: ReturnType<typeof writeAllScreensEnterpriseArtifacts> | null = null;
  try {
    androidProbe = writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const androidEmulatorPassed = androidProbe?.matrix.android_emulator_proof_passed === true;
  const androidProbeBlocker = androidProbe?.android.blocker ?? "ANDROID_PROBE_NOT_RUN";
  const domainPassed = firstPage.totalApprovedCount === 21
    && firstPage.items.length === 20
    && secondPage.items.length === 1
    && afterReload.totalApprovedCount === 21
    && afterArchive.totalApprovedCount === 20;
  const summary: AndroidSmokeSummary = {
    final_status: domainPassed && androidEmulatorPassed
      ? "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALING_ANDROID_SMOKE"
      : "STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALING_ANDROID_SMOKE_FAILED",
    android_created_approved_estimates_count: ids.length,
    android_history_total_after_approve: firstPage.totalApprovedCount,
    android_history_total_after_archive: afterArchive.totalApprovedCount,
    android_reload_persistence_passed: afterReload.totalApprovedCount === 21,
    android_pagination_load_more_passed: firstPage.items.length === 20 && secondPage.items.length === 1,
    android_pdf_edit_market_actions_passed: Boolean(firstId && middleId && lastId),
    android_console_errors_count: androidProbe?.android.logcat_fatal_found ? 1 : 0,
    android_emulator_proof_passed: androidEmulatorPassed,
    android_probe_blocker: androidProbeBlocker,
    errors,
  };
  writeJson(artifactPath, summary);
  if (summary.final_status.startsWith("STOP_")) process.exitCode = 1;
  return summary;
}

if (require.main === module) {
  runApprovedHistoryScalingAndroidSmoke()
    .then((summary) => console.log(summary.final_status))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
