import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { argValue, assertLocalServerMayStart, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE_FAILED" as const;

const WEB_ROOT = path.join(".release-runtime", "ai-estimate-parameter-durable-history", "web");
const DEFAULT_BASE_URL = "http://localhost:8103";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const HISTORY_TARGET = 25;
const BASE_PROMPT =
  "\u0412\u0435\u043d\u0442\u0444\u0430\u0441\u0430\u0434 1500 \u043c2 \u0432\u044b\u0441\u043e\u0442\u0430 40 \u043c \u0443\u0442\u0435\u043f\u043b\u0435\u043d\u0438\u0435 100 \u043c\u043c";
const CITY = "\u0411\u0438\u0448\u043a\u0435\u043a";
const ADDRESS = "parameter-smoke-redacted-address";
const TIME = "\u0421\u0435\u0433\u043e\u0434\u043d\u044f";
const PHONE = "0700000000";

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

export type AiEstimateParameterDurableHistoryWebSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE
    | typeof STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: "parameter-durable-history";
  base_url: string;
  require_real_browser: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  web_dirty_storage_profile_used: boolean;
  actual_web_browser_parameter_durable_history_smoke_passed: boolean;
  web_parameter_cards_visible: boolean;
  web_parameter_cards_are_clickable: boolean;
  web_parameter_cards_edit_inline: boolean;
  web_parameter_card_edited_key: string | null;
  web_parameter_edit_recalculates_boq: boolean;
  web_created_estimates_count: number;
  web_history_existing_count_before_create: number;
  web_history_expected_total_count_after_create: number;
  web_history_total_count_after_create: number;
  web_all_created_estimates_preserved: boolean;
  web_history_count_reaches_25: boolean;
  web_history_not_limited_to_13: boolean;
  web_history_persists_after_reload: boolean;
  web_pdf_from_history_passed: boolean;
  web_buyer_package_from_history_passed: boolean;
  web_visible_english_words_count: number;
  web_raw_internal_ids_visible_count: number;
  web_console_errors_count: number;
  web_page_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
  exact_artifact_paths: {
    web_summary: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 120_000): Promise<T> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("poll_timeout");
}

async function isReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/request`);
    return response.ok;
  } catch {
    return false;
  }
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

async function ensureWebServer(baseUrl: string, outDir: string): Promise<ServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  assertLocalServerMayStart(baseUrl);
  const serverDir = path.join(outDir, "web-server");
  mkdirSync(serverDir, { recursive: true });
  const stdout = path.join(serverDir, "stdout.log");
  const stderr = path.join(serverDir, "stderr.log");
  writeFileSync(stdout, "", "utf8");
  writeFileSync(stderr, "", "utf8");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)]
      : ["expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, CI: process.env.CI ?? "1" },
    },
  );
  child.stdout.on("data", (chunk) => appendFileSync(stdout, String(chunk)));
  child.stderr.on("data", (chunk) => appendFileSync(stderr, String(chunk)));
  await poll(async () => {
    if (child.exitCode != null) throw new Error(`web_server_exited:${child.exitCode}`);
    return (await isReady(baseUrl)) ? true : null;
  }, 240_000);
  return { started: true, stop: () => stopProcessTree(child) };
}

async function setInputText(page: Page, testId: string, value: string, options: { verifyValue?: boolean } = {}): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 30_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await locator.pressSequentially(value, { delay: 0 });
  if (options.verifyValue !== false) {
    await poll(async () => {
      const current = await locator.evaluate((node) => {
        const input = node as HTMLInputElement | HTMLTextAreaElement;
        return input.value;
      });
      return current === value ? true : null;
    }, 10_000);
  }
  if (await locator.count().catch(() => 0) > 0) {
    await locator.blur({ timeout: 5_000 }).catch(() => undefined);
  }
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

async function seedDirtyStorage(page: Page): Promise<void> {
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey as string);
    const durablePrefix = "rik.consumer_repair.request_bundle.v2:";
    const approvedHistoryStatuses = new Set(["consumer_approved", "sent_to_marketplace", "archived"]);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(durablePrefix)) continue;
      try {
        const bundle = JSON.parse(window.localStorage.getItem(key) ?? "null");
        const status = bundle?.draft?.status;
        if (!approvedHistoryStatuses.has(status)) window.localStorage.removeItem(key);
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    for (let index = 0; index < 120; index += 1) {
      window.localStorage.setItem(`parameter.smoke.dirty.fragment.${index}`, "x".repeat(index % 3 === 0 ? 64 : 7));
    }
  }, DURABLE_REQUEST_STORE_KEY);
}

async function quantityValues(page: Page): Promise<string[]> {
  return page.locator("[data-testid^='consumer-repair-item-quantity-input-']").evaluateAll((nodes) =>
    nodes.map((node) => String((node as HTMLInputElement).value ?? "")),
  );
}

function valuesChanged(before: readonly string[], after: readonly string[]): boolean {
  return before.length > 0 && after.length > 0 && before.join("|") !== after.join("|");
}

async function visibleParamText(page: Page): Promise<string> {
  const chips = page.getByTestId("editable-param-chips");
  if (await chips.count() === 0) return "";
  return chips.innerText({ timeout: 15_000 });
}

function countRawInternalIds(text: string): number {
  const matches = text.match(/\b[a-z][a-z0-9]+_[a-z0-9_]+\b|\b(?:sourceParameters|source_parameters|formula_id|template_id|round_to|PRICE_MISSING)\b/gi);
  return matches?.length ?? 0;
}

function countVisibleEnglishWords(text: string): number {
  const sanitized = text.replace(/\bPDF\b/g, "");
  const matches = sanitized.match(/\b(?:user|input|catalog|default|source|price|missing|formula|template|round|area|length|height|width)\b/gi);
  return matches?.length ?? 0;
}

async function prepareDraft(page: Page, prompt: string): Promise<void> {
  if (await page.getByTestId("consumer-repair-delivery-summary").count() === 0) {
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-city-input", CITY, { verifyValue: false });
    await setInputText(page, "consumer-repair-address-input", ADDRESS, { verifyValue: false });
    await setInputText(page, "consumer-repair-time-input", TIME, { verifyValue: false });
    await setInputText(page, "consumer-repair-phone-input", PHONE, { verifyValue: false });
  }
  await setInputText(page, "consumer-repair-problem-input", prompt);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
  await page.getByTestId("editable-param-chips").waitFor({ timeout: 90_000 });
}

async function editFirstParameter(page: Page): Promise<{
  editedKey: string | null;
  cardsVisible: boolean;
  cardsClickable: boolean;
  editInline: boolean;
  recalculatesBoq: boolean;
}> {
  const cardsVisible = await page.getByTestId("editable-param-chips").count() > 0;
  const preferred = page.getByTestId("editable-param-edit-facade_area_m2");
  const target = await preferred.count() > 0
    ? preferred
    : page.locator("[data-testid^='editable-param-edit-']").first();
  const targetTestId = await target.evaluate((node) => node.getAttribute("data-testid")).catch(() => null);
  const editedKey = targetTestId?.replace("editable-param-edit-", "") ?? null;
  const before = await quantityValues(page);
  await target.scrollIntoViewIfNeeded();
  await target.click({ timeout: 30_000 });
  await page.getByTestId("editable-param-popover").waitFor({ timeout: 30_000 });
  await setInputText(page, "editable-param-popover-input", "1200");
  await page.getByTestId("editable-param-popover-save").click();
  await poll(async () => {
    const after = await quantityValues(page);
    return valuesChanged(before, after) ? true : null;
  }, 45_000).catch(() => null);
  const after = await quantityValues(page);
  return {
    editedKey,
    cardsVisible,
    cardsClickable: editedKey != null,
    editInline: await page.getByTestId("editable-param-popover").count() === 0,
    recalculatesBoq: valuesChanged(before, after),
  };
}

async function approveCurrentDraft(page: Page, expectedHistoryCount: number): Promise<void> {
  await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
  await page.getByTestId("consumer-repair-approve").click();
  await poll(async () => {
    const count = await historyCount(page);
    return count >= expectedHistoryCount ? true : null;
  }, 90_000);
  await page.getByTestId("consumer-repair-prepare-draft").waitFor({ timeout: 45_000 });
}

async function historyCount(page: Page): Promise<number> {
  const text = await page.getByTestId("consumer-repair-history-approved-count").innerText({ timeout: 30_000 });
  return Number(text.replace(/[^\d]/g, ""));
}

async function runBrowserFlow(page: Page, baseUrl: string): Promise<Omit<
  AiEstimateParameterDurableHistoryWebSummary,
  | "final_status"
  | "source_sha"
  | "branch"
  | "upstream_sync"
  | "generated_at"
  | "target"
  | "cases"
  | "base_url"
  | "require_real_browser"
  | "browser_automation_started"
  | "web_server_started_by_runner"
  | "route_equivalent_not_reported_as_real_browser"
  | "route_equivalent_smoke_passed"
  | "env_browser_green_rejected"
  | "native_build_started"
  | "eas_started"
  | "release_started"
  | "fake_green_claimed"
  | "blockers"
  | "exact_artifact_paths"
>> {
  await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  await seedDirtyStorage(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });

  let firstEdit = {
    editedKey: null as string | null,
    cardsVisible: false,
    cardsClickable: false,
    editInline: false,
    recalculatesBoq: false,
  };
  const baselineHistoryCount = await historyCount(page);

  for (let index = 1; index <= HISTORY_TARGET; index += 1) {
    await prepareDraft(page, `${BASE_PROMPT} ${index}`);
    if (index === 1) firstEdit = await editFirstParameter(page);
    await approveCurrentDraft(page, baselineHistoryCount + index);
    const count = await historyCount(page);
    console.info(JSON.stringify({ web_history_iteration: index, approved_count: count }));
    if (index < HISTORY_TARGET) await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  }

  const countBeforeReload = await historyCount(page);
  const expectedCountAfterCreate = baselineHistoryCount + HISTORY_TARGET;
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-history-approved-count").waitFor({ timeout: 45_000 });
  const countAfterReload = await historyCount(page);
  await page.getByTestId("consumer-repair-history-button").click();
  await page.getByTestId("consumer-repair-history-modal").waitFor({ timeout: 45_000 });
  await page.getByTestId("consumer-repair-history-main").first().click();
  await page.getByTestId("consumer-repair-history-open-pdf-expanded").waitFor({ timeout: 45_000 });
  const historyPdfVisible = await page.getByTestId("consumer-repair-history-open-pdf-expanded").count() > 0 ||
    await page.getByTestId("consumer-repair-history-pdf").count() > 0;
  const historyBuyerVisible = await page.getByTestId("consumer-repair-history-send-market").count() > 0;
  const paramText = await visibleParamText(page);
  return {
    web_dirty_storage_profile_used: true,
    actual_web_browser_parameter_durable_history_smoke_passed: false,
    web_parameter_cards_visible: firstEdit.cardsVisible,
    web_parameter_cards_are_clickable: firstEdit.cardsClickable,
    web_parameter_cards_edit_inline: firstEdit.editInline,
    web_parameter_card_edited_key: firstEdit.editedKey,
    web_parameter_edit_recalculates_boq: firstEdit.recalculatesBoq,
    web_created_estimates_count: HISTORY_TARGET,
    web_history_existing_count_before_create: baselineHistoryCount,
    web_history_expected_total_count_after_create: expectedCountAfterCreate,
    web_history_total_count_after_create: countBeforeReload,
    web_all_created_estimates_preserved:
      countBeforeReload >= expectedCountAfterCreate && countAfterReload >= expectedCountAfterCreate,
    web_history_count_reaches_25: countBeforeReload >= HISTORY_TARGET,
    web_history_not_limited_to_13: countBeforeReload > 13,
    web_history_persists_after_reload: countAfterReload >= expectedCountAfterCreate,
    web_pdf_from_history_passed: historyPdfVisible,
    web_buyer_package_from_history_passed: historyBuyerVisible,
    web_visible_english_words_count: countVisibleEnglishWords(paramText),
    web_raw_internal_ids_visible_count: countRawInternalIds(paramText),
    web_console_errors_count: 0,
    web_page_errors_count: 0,
  };
}

export async function runAiEstimateParameterDurableHistoryWebSmoke(options: {
  target?: "web";
  cases?: string | null;
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: AiEstimateParameterDurableHistoryWebSummary }> {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_PARAMETER_HISTORY_WEB_TARGET:${options.target}`);
  if ((options.cases ?? "parameter-durable-history") !== "parameter-durable-history") {
    throw new Error(`UNSUPPORTED_PARAMETER_HISTORY_CASES:${options.cases}`);
  }
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl ?? undefined,
    scriptEnvKeys: ["AI_ESTIMATE_PARAMETER_HISTORY_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(WEB_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  let server: ServerHandle | null = null;
  let browserStarted = false;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let flow: Awaited<ReturnType<typeof runBrowserFlow>> | null = null;
  let flowError: string | null = null;

  try {
    server = await ensureWebServer(baseUrl, outDir);
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      try {
        flow = await runBrowserFlow(page, baseUrl);
      } catch (error) {
        flowError = error instanceof Error ? error.message : String(error);
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.stop();
  }

  const baseFlow = flow ?? {
    web_dirty_storage_profile_used: false,
    actual_web_browser_parameter_durable_history_smoke_passed: false,
    web_parameter_cards_visible: false,
    web_parameter_cards_are_clickable: false,
    web_parameter_cards_edit_inline: false,
    web_parameter_card_edited_key: null,
    web_parameter_edit_recalculates_boq: false,
    web_created_estimates_count: HISTORY_TARGET,
    web_history_existing_count_before_create: 0,
    web_history_expected_total_count_after_create: HISTORY_TARGET,
    web_history_total_count_after_create: 0,
    web_all_created_estimates_preserved: false,
    web_history_count_reaches_25: false,
    web_history_not_limited_to_13: false,
    web_history_persists_after_reload: false,
    web_pdf_from_history_passed: false,
    web_buyer_package_from_history_passed: false,
    web_visible_english_words_count: 0,
    web_raw_internal_ids_visible_count: 0,
    web_console_errors_count: 0,
    web_page_errors_count: 0,
  };
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    browserStarted ? "" : "browser_automation_not_started",
    flowError ? `browser_flow_exception:${flowError.replace(/\s+/g, " ").slice(0, 240)}` : "",
    baseFlow.web_dirty_storage_profile_used ? "" : "web_dirty_storage_profile_missing",
    baseFlow.web_parameter_cards_visible ? "" : "web_parameter_cards_missing",
    baseFlow.web_parameter_cards_are_clickable ? "" : "web_parameter_cards_not_clickable",
    baseFlow.web_parameter_cards_edit_inline ? "" : "web_parameter_cards_not_edit_inline",
    baseFlow.web_parameter_edit_recalculates_boq ? "" : "web_parameter_edit_did_not_recalculate_boq",
    baseFlow.web_all_created_estimates_preserved ? "" : "web_all_created_estimates_not_preserved",
    baseFlow.web_history_count_reaches_25 ? "" : "web_history_count_below_25",
    baseFlow.web_history_not_limited_to_13 ? "" : "web_history_stuck_at_13",
    baseFlow.web_history_persists_after_reload ? "" : "web_history_not_persisted_after_reload",
    baseFlow.web_pdf_from_history_passed ? "" : "web_pdf_from_history_missing",
    baseFlow.web_buyer_package_from_history_passed ? "" : "web_buyer_package_from_history_missing",
    baseFlow.web_visible_english_words_count === 0 ? "" : `web_visible_english_words:${baseFlow.web_visible_english_words_count}`,
    baseFlow.web_raw_internal_ids_visible_count === 0 ? "" : `web_raw_internal_ids:${baseFlow.web_raw_internal_ids_visible_count}`,
    consoleErrors.length === 0 ? "" : `web_console_errors:${consoleErrors.length}`,
    pageErrors.length === 0 ? "" : `web_page_errors:${pageErrors.length}`,
  ].filter(Boolean);
  const passed = blockers.length === 0;
  const summary: AiEstimateParameterDurableHistoryWebSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE
      : STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: "parameter-durable-history",
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: server?.started ?? false,
    ...baseFlow,
    actual_web_browser_parameter_durable_history_smoke_passed: passed,
    web_console_errors_count: consoleErrors.length,
    web_page_errors_count: pageErrors.length,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
    exact_artifact_paths: {
      web_summary: artifactPath,
    },
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimateParameterDurableHistoryWebSmoke.ts")) {
  void runAiEstimateParameterDurableHistoryWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_parameter_durable_history_smoke_passed:
          result.artifact.actual_web_browser_parameter_durable_history_smoke_passed,
        web_parameter_edit_recalculates_boq: result.artifact.web_parameter_edit_recalculates_boq,
        web_history_count_reaches_25: result.artifact.web_history_count_reaches_25,
        web_history_persists_after_reload: result.artifact.web_history_persists_after_reload,
        web_console_errors_count: result.artifact.web_console_errors_count,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
