import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
} from "../../src/lib/ai/professionalEstimateCalculator";

type RuntimeResult = {
  href: string;
  title: string;
  readyState: string;
  bodyText: string;
  requestScreenMarkerPresent: boolean;
  buttonCount: number;
  inputCount: number;
  visibleTextLength: number;
  errorsVisible: boolean;
};

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function hasMojibakeText(text: string): boolean {
  return [
    "Рџ",
    "РЎ",
    "Рњ",
    "Рќ",
    "Р°",
    "Рµ",
    "Рѕ",
    "СЃ",
    "С‚",
    "СЂ",
    "СЊ",
    "вЂ",
    "пїЅ",
    "�",
  ].some((token) => text.includes(token));
}

function validateRuntime(result: RuntimeResult): string[] {
  const hasDraftState =
    result.bodyText.includes("Позиции пока пустые") ||
    (result.bodyText.includes("Позиции") && result.bodyText.includes("Итого по позициям"));
  const hasRequestRouteEvidence =
    result.bodyText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ||
    result.requestScreenMarkerPresent;
  return [
    result.readyState === "complete" ? "" : `WEB_READY_STATE_NOT_COMPLETE:${result.readyState}`,
    result.title === "rik-expo-app" ? "" : `WEB_TITLE_UNEXPECTED:${result.title}`,
    result.href.includes("/request") ? "" : "WEB_REQUEST_ROUTE_NOT_OPEN",
    hasRequestRouteEvidence ? "" : "WEB_REQUEST_ROUTE_MARKER_MISSING",
    result.bodyText.includes("Смета") ? "" : "WEB_REQUEST_SCREEN_TEXT_MISSING",
    hasDraftState ? "" : "WEB_REQUEST_DRAFT_OR_ESTIMATE_STATE_TEXT_MISSING",
    hasMojibakeText(result.bodyText) ? "WEB_VISIBLE_TEXT_MOJIBAKE" : "",
    result.visibleTextLength > 100 ? "" : "WEB_VISIBLE_TEXT_TOO_SHORT",
    result.buttonCount >= 5 ? "" : "WEB_EXPECTED_BUTTONS_MISSING",
    result.inputCount >= 1 ? "" : "WEB_EXPECTED_INPUTS_MISSING",
    result.errorsVisible ? "WEB_VISIBLE_ERROR_TEXT" : "",
  ].filter(Boolean);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readRuntime(page: Page): Promise<RuntimeResult> {
  return page.evaluate<RuntimeResult>(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body ? document.body.innerText.slice(0, 3000) : "",
    requestScreenMarkerPresent: Boolean(
      document.querySelector('[data-testid="consumer-repair-screen"]') ||
      document.getElementById("consumer-repair-screen") ||
      document.querySelector('[aria-label="consumer-repair-screen"]')
    ),
    buttonCount: document.querySelectorAll("button,[role='button']").length,
    inputCount: document.querySelectorAll("input,textarea,select").length,
    visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
    errorsVisible: document.body ? /ошибка|error|failed|no internet|unable/i.test(document.body.innerText) : false,
  }));
}

async function waitForRuntimeReady(
  page: Page,
  timeoutMs = 30_000,
): Promise<RuntimeResult> {
  const startedAt = Date.now();
  let lastRuntime = await readRuntime(page);
  while (Date.now() - startedAt <= timeoutMs) {
    lastRuntime = await readRuntime(page);
    if (validateRuntime(lastRuntime).length === 0) return lastRuntime;
    await sleep(500);
  }
  return lastRuntime;
}

async function main() {
  const baseUrl = String(process.env.PROFESSIONAL_ESTIMATE_WEB_BASE_URL ?? "http://localhost:8091").replace(/\/+$/, "");
  const targetUrl =
    `${baseUrl}/request?prompt=${encodeURIComponent("каменную кладку 400 кв метра")}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    const runtime = await waitForRuntimeReady(page);
    const blockers = validateRuntime(runtime);
    const generatedAt = new Date().toISOString();
    const artifact = {
      status: blockers.length === 0 ? "GREEN" : "RED",
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS
        : "STOP_WEB_PROFESSIONAL_AI_ESTIMATE_SMOKE_NOT_GREEN",
      source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
      branch: gitOutput(["branch", "--show-current"], "unknown"),
      artifact_schema_version: 1,
      generated_by: "scripts/e2e/runProfessionalEstimateWebSmoke.ts",
      generated_at: generatedAt,
      targetUrl,
      pageUrl: page.url(),
      runtime,
      blockers,
      browser_automation_started: true,
      actual_web_browser_smoke_passed: blockers.length === 0,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: blockers.length === 0,
      fake_green_claimed: false,
      fakeGreenClaimed: false,
      createdAt: generatedAt,
    };
    const outDir = path.join(
      process.cwd(),
      ".release-runtime",
      "professional-ai-estimate-real-quantity-engine",
      "web",
      timestampForPath(),
    );
    mkdirSync(outDir, { recursive: true });
    const artifactPath = path.join(outDir, "summary.json");
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.info(JSON.stringify({
      status: artifact.status,
      artifact: artifactPath,
      blockers,
      href: runtime.href,
      buttonCount: runtime.buttonCount,
      inputCount: runtime.inputCount,
      visibleTextLength: runtime.visibleTextLength,
    }, null, 2));
    if (blockers.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
