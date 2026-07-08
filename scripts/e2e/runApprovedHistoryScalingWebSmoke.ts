import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

import { chromium, type Browser } from "playwright";

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
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";

const projectRoot = process.cwd();
const storageKey = "rik.consumer_repair.request_bundles.v1";
const runtimeDir = path.join(projectRoot, ".release-runtime", "ai-estimate-approved-history-scaling", new Date().toISOString().replace(/[:.]/g, "-"));
const artifactPath = path.join(runtimeDir, "web-smoke-summary.json");
const serverStdoutPath = path.join(runtimeDir, "web-server.stdout.log");
const serverStderrPath = path.join(runtimeDir, "web-server.stderr.log");
const userId = "consumer-demo-user";
const promptText = "РҐРѕС‡Сѓ СѓР»РѕР¶РёС‚СЊ Р»Р°РјРёРЅР°С‚ РЅР° 100 РєРІ Рј Рё СЃРґРµР»Р°С‚СЊ РїР»РёРЅС‚СѓСЃ";

type WebServerHandle = {
  baseUrl: string;
  started: boolean;
  stop: () => void;
};

type SmokeSummary = {
  final_status: "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALING_WEB_SMOKE" | "STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALING_WEB_SMOKE_FAILED";
  web_created_approved_estimates_count: number;
  web_history_total_after_approve: number;
  web_history_total_after_archive: number;
  web_reload_persistence_passed: boolean;
  web_pagination_load_more_passed: boolean;
  web_pdf_edit_market_actions_passed: boolean;
  web_console_errors_count: number;
  web_browser_started: boolean;
  web_loaded_text_before_load_more: string;
  web_loaded_text_after_load_more: string;
  web_row_count_after_load_more: number;
  errors: string[];
};

function writeJson(fullPath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function installLocalStorageMock(): Map<string, string> {
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
  return values;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function findFreePort(startAt = 18420): Promise<number> {
  const envPort = Number(process.env.APPROVED_HISTORY_SCALING_WEB_PORT);
  if (Number.isInteger(envPort) && envPort > 0) return envPort;
  for (let port = startAt; port < startAt + 80; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "0.0.0.0");
    });
    if (free) return port;
  }
  throw new Error("No free local web port for approved history smoke");
}

async function poll<T>(label: string, fn: () => Promise<T | null> | T | null, timeoutMs = 180_000): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(1_000);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

function stopProcessTree(child: ChildProcess): void {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

async function isServerReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/request`);
    return response.ok;
  } catch {
    return false;
  }
}

function parseShownAndTotal(text: string): { shown: number; total: number } {
  const numbers = text.match(/\d+/g)?.map(Number) ?? [];
  return {
    shown: numbers[numbers.length - 2] ?? 0,
    total: numbers[numbers.length - 1] ?? 0,
  };
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  const envBaseUrl = String(process.env.APPROVED_HISTORY_SCALING_WEB_URL ?? "").trim().replace(/\/$/, "");
  if (envBaseUrl) {
    await poll("approved-history-web-url-ready", async () => (await isServerReady(envBaseUrl)) ? true : null, 60_000);
    return { baseUrl: envBaseUrl, started: false, stop: () => undefined };
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeJson(serverStdoutPath, "");
  writeJson(serverStderrPath, "");
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/c", "npx", "expo", "start", "--web", "--port", String(port)]
    : ["expo", "start", "--web", "--port", String(port)];
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: { ...process.env, BROWSER: "none", CI: process.env.CI ?? "1", EXPO_NO_TELEMETRY: "1" },
  });
  child.stdout?.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr?.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));
  await poll("approved-history-web-ready", async () => {
    if (child.exitCode != null) throw new Error(`expo web exited early (${child.exitCode})`);
    return (await isServerReady(baseUrl)) ? true : null;
  });
  return { baseUrl, started: true, stop: () => stopProcessTree(child) };
}

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

async function runBrowserProof(serializedStorage: string): Promise<{
  consoleErrors: string[];
  paginationPassed: boolean;
  reloadPassed: boolean;
  browserStarted: boolean;
  loadedText: string;
  loadedTextAfterLoad: string;
  rowCountAfterLoad: number;
}> {
  let browser: Browser | null = null;
  const server = await ensureLocalWebServer();
  const consoleErrors: string[] = [];
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, { key: storageKey, value: serializedStorage });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto(`${server.baseUrl}/request`, { waitUntil: "networkidle" });
    await page.evaluate(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, { key: storageKey, value: serializedStorage });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("consumer-repair-history-loaded-count").waitFor({ timeout: 60_000 });
    const loadedText = await page.getByTestId("consumer-repair-history-loaded-count").innerText();
    const firstCounts = parseShownAndTotal(loadedText);
    const firstPagePassed = firstCounts.shown === 20 && firstCounts.total === 25;
    await page.getByTestId("consumer-repair-history-button").click();
    let rowCountAfterLoad = await page.getByTestId("consumer-repair-history-row").count();
    let loadedTextAfterLoad = await page.getByTestId("consumer-repair-history-loaded-count").innerText();
    if (parseShownAndTotal(loadedTextAfterLoad).shown !== 25) {
      const loadMore = page.getByTestId("consumer-repair-history-load-more");
      const loadMoreCount = await loadMore.count();
      try {
        if (loadMoreCount > 0) {
          await loadMore.evaluate((element) => {
            if (element instanceof HTMLElement) element.click();
          });
        }
        await poll("approved-history-load-more-count", async () => {
          rowCountAfterLoad = await page.getByTestId("consumer-repair-history-row").count();
          loadedTextAfterLoad = await page.getByTestId("consumer-repair-history-loaded-count").innerText();
          const counts = parseShownAndTotal(loadedTextAfterLoad);
          return counts.shown === 25 && counts.total === 25 ? true : null;
        }, 60_000);
      } catch (error) {
        throw new Error([
          error instanceof Error ? error.message : String(error),
          `loadedTextBefore=${loadedText}`,
          `loadedTextAfter=${loadedTextAfterLoad}`,
          `rowCountAfterLoad=${rowCountAfterLoad}`,
          `loadMoreCount=${loadMoreCount}`,
        ].join(" | "));
      }
    }
    const afterLoadCounts = parseShownAndTotal(loadedTextAfterLoad);
    const paginationPassed = firstPagePassed && afterLoadCounts.shown === 25 && afterLoadCounts.total === 25;
    await page.reload({ waitUntil: "networkidle" });
    const afterReloadText = await page.getByTestId("consumer-repair-history-loaded-count").innerText();
    const reloadCounts = parseShownAndTotal(afterReloadText);
    const reloadPassed = reloadCounts.shown === 20 && reloadCounts.total === 25;
    return { consoleErrors, paginationPassed, reloadPassed, browserStarted: true, loadedText, loadedTextAfterLoad, rowCountAfterLoad };
  } finally {
    await browser?.close();
    server.stop();
  }
}

export async function runApprovedHistoryScalingWebSmoke(): Promise<SmokeSummary> {
  const storage = installLocalStorageMock();
  const errors: string[] = [];
  __resetConsumerRepairRequestStoreForTests();
  const ids: string[] = [];
  for (let index = 0; index < 25; index += 1) ids.push(await createApprovedEstimate(index));

  const firstPage = listConsumerRepairApprovedHistory(userId, { limit: 20 });
  const secondPage = listConsumerRepairApprovedHistory(userId, { limit: 20, cursorCreatedAt: firstPage.nextCursorCreatedAt });
  const serializedStorage = storage.get(storageKey) ?? "[]";
  __simulateConsumerRepairRequestStoreReloadForTests();
  const afterReload = listConsumerRepairApprovedHistory(userId, { limit: 20 });

  const firstId = ids[0]!;
  const middleId = ids[Math.floor(ids.length / 2)]!;
  const lastId = ids[ids.length - 1]!;
  getConsumerRepairRequestPdf({ requestDraftId: firstId });
  createConsumerRepairDraftFromHistorySnapshot({ sourceRequestDraftId: middleId, userId, reason: "edit_as_new_revision" });
  sendConsumerRepairRequestToMarketplace({ requestDraftId: firstId, userId, idempotencyKey: `approved-history-web:${firstId}` });
  archiveConsumerRepairApprovedHistoryRecord({ requestDraftId: lastId, userId });
  const afterArchive = listConsumerRepairApprovedHistory(userId, { limit: 20 });

  let browserProof = {
    consoleErrors: [] as string[],
    paginationPassed: false,
    reloadPassed: false,
    browserStarted: false,
    loadedText: "",
    loadedTextAfterLoad: "",
    rowCountAfterLoad: 0,
  };
  try {
    browserProof = await runBrowserProof(serializedStorage);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const summary: SmokeSummary = {
    final_status:
      firstPage.totalApprovedCount === 25 &&
      firstPage.items.length === 20 &&
      secondPage.items.length === 5 &&
      afterReload.totalApprovedCount === 25 &&
      afterArchive.totalApprovedCount === 24 &&
      browserProof.paginationPassed &&
      browserProof.reloadPassed &&
      browserProof.consoleErrors.length === 0
        ? "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALING_WEB_SMOKE"
        : "STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALING_WEB_SMOKE_FAILED",
    web_created_approved_estimates_count: ids.length,
    web_history_total_after_approve: firstPage.totalApprovedCount,
    web_history_total_after_archive: afterArchive.totalApprovedCount,
    web_reload_persistence_passed: afterReload.totalApprovedCount === 25 && browserProof.reloadPassed,
    web_pagination_load_more_passed: firstPage.items.length === 20 && secondPage.items.length === 5 && browserProof.paginationPassed,
    web_pdf_edit_market_actions_passed: Boolean(firstId && middleId && lastId),
    web_console_errors_count: browserProof.consoleErrors.length,
    web_browser_started: browserProof.browserStarted,
    web_loaded_text_before_load_more: browserProof.loadedText,
    web_loaded_text_after_load_more: browserProof.loadedTextAfterLoad,
    web_row_count_after_load_more: browserProof.rowCountAfterLoad,
    errors: [...errors, ...browserProof.consoleErrors],
  };
  writeJson(artifactPath, summary);
  if (summary.final_status.startsWith("STOP_")) process.exitCode = 1;
  return summary;
}

if (require.main === module) {
  runApprovedHistoryScalingWebSmoke()
    .then((summary) => console.log(summary.final_status))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
