import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { buildInlineWorkPromptAcceptanceCases } from "../estimate/inlineWorkPromptAcceptanceCases";
import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-inline-work-prompt-params-android-smoke");
const ADB_TIMEOUT_MS = 20_000;
const CHROME_PACKAGE = "com.android.chrome";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function writeSummary(summary: Record<string, unknown>): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, JSON.stringify(summary, null, 2), "utf8");
  return filePath;
}

function adbDevices(): string {
  try {
    return execFileSync("adb", ["devices"], { encoding: "utf8", timeout: 10_000 });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function adb(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbNoThrow(args: string[], timeoutMs = ADB_TIMEOUT_MS): boolean {
  try {
    adb(args, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLocalhostBaseUrl(baseUrl: string): boolean {
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function resolveBaseUrl(): string {
  return String(
    process.env.INLINE_WORK_PROMPT_ANDROID_BASE_URL ??
    process.env.INLINE_WORK_PROMPT_WEB_BASE_URL ??
    "http://127.0.0.1:18080",
  ).replace(/\/+$/, "");
}

async function connectAndroidChrome() {
  const deadline = Date.now() + 45_000;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9222");
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(`ANDROID_CHROME_CDP_CONNECT_FAILED:${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function runAndroidChromeCases(input: {
  serial: string;
  baseUrl: string;
  cases: ReturnType<typeof buildInlineWorkPromptAcceptanceCases>;
}) {
  if (isLocalhostBaseUrl(input.baseUrl)) {
    const port = resolvePort(input.baseUrl);
    adb(["-s", input.serial, "reverse", `tcp:${port}`, `tcp:${port}`]);
  }
  adb(["-s", input.serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  const targetUrl = `${input.baseUrl}/request`;
  adbNoThrow(["-s", input.serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
  adb([
    "-s",
    input.serial,
    "shell",
    "am",
    "start",
    "-n",
    `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
    "-a",
    "android.intent.action.VIEW",
    "-d",
    targetUrl,
  ]);
  await sleep(2500);

  const browser = await connectAndroidChrome();
  const consoleErrors: string[] = [];
  try {
    const context = browser.contexts()[0] ?? await browser.newContext();
    let page = context.pages().find((candidate) => candidate.url().includes("/request")) ?? context.pages()[0];
    if (!page) page = await context.newPage();
    page.on("console", (message) => {
      const location = message.location();
      const locationUrl = location.url ? ` @ ${location.url}` : "";
      if (message.type() === "error") consoleErrors.push(`${message.text()}${locationUrl}`);
    });
    page.setDefaultTimeout(20_000);
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate("var __name = globalThis.__name || ((target) => target); globalThis.__name = __name;");

    let casesPassed = 0;
    let selectedTemplatePersistsCount = 0;
    let paramChipsVisibleCount = 0;
    let draftEmptyCount = 0;
    let contactBlockerCount = 0;
    let pdfMissingCount = 0;
    let buyerHandoffMissingCount = 0;
    const failures: string[] = [];

    for (const [index, testCase] of input.cases.entries()) {
      let casePassed = false;
      const caseFailuresBefore = failures.length;
      try {
        const ui = await page.evaluate(async ({ prompt }) => {
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
          const waitFor = async (id: string, timeoutMs = 20_000) => {
            const started = Date.now();
            while (Date.now() - started <= timeoutMs) {
              const node = byTestId(id);
              if (node) return node;
              await sleep(200);
            }
            throw new Error(`WAIT_TIMEOUT:${id}`);
          };
          const setText = async (id: string, value: string) => {
            const node = await waitFor(id);
            const input = node as HTMLInputElement | HTMLTextAreaElement;
            const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
            setter?.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.dispatchEvent(new Event("blur", { bubbles: true }));
          };
          const click = async (id: string) => {
            const node = await waitFor(id);
            node.scrollIntoView({ block: "center", inline: "nearest" });
            await sleep(50);
            node.click();
          };
          await setText("consumer-repair-problem-input", prompt);
          await waitFor("inline-work-prompt-param-chips", 10_000);
          const paramChipsVisibleBeforeBuild = Boolean(document.querySelector('[data-testid="inline-work-prompt-param-chips"]'));
          await click("inline-work-prompt-build-estimate");
          await waitFor("request-estimate-top-proof", 20_000);
          const bodyText = document.body?.innerText ?? "";
          return {
            matched: Boolean(document.querySelector('[data-testid="inline-work-prompt-matched-work"]')),
            paramChipsVisible: paramChipsVisibleBeforeBuild,
            draftVisible: Boolean(document.querySelector('[data-testid="inline-work-prompt-draft-preview"]')) ||
              Boolean(document.querySelector('[data-testid="request-estimate-top-proof"]')),
            contactBlocker: /телефон|contact|адрес/i.test(bodyText) && !document.querySelector('[data-testid="request-estimate-top-proof"]'),
            pdfVisible: Boolean(document.querySelector('[data-testid="consumer-repair-open-pdf"]')) || /PDF/i.test(bodyText),
            buyerHandoffVisible: /закуп|buyer|снабжен|handoff|материал/i.test(bodyText),
          };
        }, { prompt: testCase.prompt });
        if (ui.paramChipsVisible) paramChipsVisibleCount += 1;
        if (ui.matched) selectedTemplatePersistsCount += 1;
        if (!ui.draftVisible) draftEmptyCount += 1;
        if (ui.contactBlocker) contactBlockerCount += 1;
        if (!ui.pdfVisible) pdfMissingCount += 1;
        if (!ui.buyerHandoffVisible) buyerHandoffMissingCount += 1;
        const passed = ui.matched && ui.draftVisible && !ui.contactBlocker;
        casePassed = passed;
        if (passed) casesPassed += 1;
        else failures.push(`${testCase.id}:matched=${ui.matched}:draft=${ui.draftVisible}:contact=${ui.contactBlocker}`);
      } catch (error) {
        failures.push(`${testCase.id}:${error instanceof Error ? error.message : String(error)}`);
      } finally {
        console.info(JSON.stringify({
          case_id: testCase.id,
          passed: casePassed,
          cases_done: index + 1,
          cases_total: input.cases.length,
          new_failures: failures.length - caseFailuresBefore,
        }));
      }
    }

    return {
      targetUrl,
      casesPassed,
      selectedTemplatePersistsCount,
      paramChipsVisibleCount,
      draftEmptyCount,
      contactBlockerCount,
      pdfMissingCount,
      buyerHandoffMissingCount,
      consoleErrors,
      failures,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const requireEmulator = hasFlag("require-emulator");
  const write = hasFlag("write-summary");
  const requestedCases = Math.max(1, Number(argValue("case-count", "80")) || 80);
  const baseUrl = resolveBaseUrl();
  const cases = buildInlineWorkPromptAcceptanceCases(requestedCases).slice(0, requestedCases);
  const devices = adbDevices();
  const emulatorDetected = /\bemulator-\d+\s+device\b/.test(devices);
  const initialHealth = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  const summary: Record<string, unknown> = {
    final_status: "STOP_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_ANDROID_SMOKE_FAILED",
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    target: argValue("target", "android-chrome"),
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    actual_android_emulator_inline_prompt_params_smoke_passed: false,
    android_inline_prompt_cases_passed: `0/${cases.length}`,
    android_emulator_detected: initialHealth.emulator_detected || emulatorDetected,
    android_chrome_launched_or_attached: false,
    android_device_id: initialHealth.selected_serial,
    android_lab_health_checked: true,
    android_lab_healthy: initialHealth.android_lab_healthy,
    android_health_blocking_reasons: initialHealth.blocking_reasons,
    android_selected_template_persists_count: 0,
    android_param_chips_visible_count: 0,
    android_draft_empty_count: 0,
    android_contact_blocker_count: 0,
    android_pdf_missing_count: 0,
    android_buyer_handoff_missing_count: 0,
    android_console_errors_count: 0,
    android_emulator_health_degraded: !emulatorDetected,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    route_equivalent_used: false,
    env_flag_green: false,
    blocking_reasons: [] as string[],
  };

  if (requireEmulator && !emulatorDetected) {
    (summary.blocking_reasons as string[]).push("android_emulator_not_detected");
  }
  if (!requireRealBrowser) {
    (summary.blocking_reasons as string[]).push("real_browser_required_flag_missing");
  }
  const selectedSerial = initialHealth.selected_serial;
  if (!initialHealth.android_lab_healthy || !selectedSerial) {
    (summary.blocking_reasons as string[]).push(...initialHealth.blocking_reasons);
    if (!selectedSerial) (summary.blocking_reasons as string[]).push("android_selected_serial_missing");
  }

  if ((summary.blocking_reasons as string[]).length === 0 && selectedSerial) {
    try {
      const result = await runAndroidChromeCases({
        serial: selectedSerial,
        baseUrl,
        cases,
      });
      summary.android_chrome_launched_or_attached = true;
      summary.android_inline_prompt_cases_passed = `${result.casesPassed}/${cases.length}`;
      summary.android_selected_template_persists_count = result.selectedTemplatePersistsCount;
      summary.android_param_chips_visible_count = result.paramChipsVisibleCount;
      summary.android_draft_empty_count = result.draftEmptyCount;
      summary.android_contact_blocker_count = result.contactBlockerCount;
      summary.android_pdf_missing_count = result.pdfMissingCount;
      summary.android_buyer_handoff_missing_count = result.buyerHandoffMissingCount;
      summary.android_console_errors_count = result.consoleErrors.length;
      (summary.blocking_reasons as string[]).push(
        ...result.failures.slice(0, 20),
        ...result.consoleErrors.slice(0, 20).map((error) => `console:${error}`),
      );
      const passed =
        result.casesPassed === cases.length &&
        result.selectedTemplatePersistsCount === cases.length &&
        result.paramChipsVisibleCount === cases.length &&
        result.consoleErrors.length === 0 &&
        result.failures.length === 0;
      summary.actual_android_emulator_inline_prompt_params_smoke_passed = passed;
      summary.final_status = passed
        ? "GREEN_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_ANDROID_SMOKE_READY"
        : "STOP_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_ANDROID_SMOKE_FAILED";
    } catch (error) {
      (summary.blocking_reasons as string[]).push(error instanceof Error ? error.message : String(error));
    }
  }

  if (write) summary.runtime_summary_path = writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.actual_android_emulator_inline_prompt_params_smoke_passed !== true) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
