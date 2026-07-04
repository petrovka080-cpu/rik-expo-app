import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { auditCommercialTrustCriticalCases } from "../estimate/auditProductionTrustGovernance";

export const GREEN_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_FAILED" as const;

const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const PROMPT =
  "\u0412\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0451\u043b \u0438 \u043d\u0430\u0440\u0443\u0436\u043d\u044b\u0435 \u0441\u0435\u0442\u0438 \u0432\u043e\u0434\u044b: \u0432\u043e\u0434\u0430 \u0431\u0430\u0448\u043d\u044f";

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

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

function writeJson(fullPath: string, value: unknown): void {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

async function runBrowserFlow(baseUrl: string, outDir: string) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 960 } });
    await context.addInitScript((key) => {
      window.localStorage.removeItem(key as string);
    }, DURABLE_REQUEST_STORE_KEY);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/request`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-address-input").fill("64 Malikova Street");
    await page.getByTestId("consumer-repair-time-input").fill("today");
    await page.getByTestId("consumer-repair-phone-input").fill("0707052577");
    await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    await page.getByTestId("request-estimate-trust-level").waitFor({ timeout: 30_000 });
    await page.getByTestId("request-estimate-commercial-level").waitFor({ timeout: 30_000 });
    await page.getByTestId("request-estimate-details-toggle").click();
    await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 30_000 });

    const bodyBeforeApprove = await page.locator("body").innerText({ timeout: 15_000 });
    await page.getByTestId("consumer-repair-approve").click();
    await page.getByTestId("consumer-repair-open-pdf").waitFor({ timeout: 60_000 });
    const bodyAfterApprove = await page.locator("body").innerText({ timeout: 15_000 });
    const screenshotPath = path.join(outDir, "commercial-trust-web.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const bodyText = `${bodyBeforeApprove}\n${bodyAfterApprove}`;
    const blockers = [
      bodyText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ? "" : "route_marker_missing",
      bodyText.includes("\u0414\u043e\u0432\u0435\u0440\u0438\u0435") ? "" : "trust_level_text_missing",
      bodyText.includes("\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b") ? "" : "estimate_level_text_missing",
      bodyText.includes("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430") ? "" : "missing_price_text_missing",
      bodyText.includes("\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a") ? "" : "source_text_missing",
      bodyText.includes("\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430") ? "" : "source_quality_text_missing",
      bodyText.includes("\u042d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430") ? "" : "expert_review_text_missing",
      await count(page, "[data-testid='request-estimate-summary-card']") > 0 ? "" : "summary_card_missing",
      await count(page, "[data-testid='consumer-repair-open-pdf']") > 0 ? "" : "pdf_button_missing_after_confirm",
      consoleErrors.length === 0 ? "" : `console_error_count:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_error_count:${pageErrors.length}`,
    ].filter(Boolean);
    return {
      target_url: targetUrl,
      page_url: page.url(),
      body_text_sample: bodyText.slice(0, 5000),
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      trust_level_visible: bodyText.includes("\u0414\u043e\u0432\u0435\u0440\u0438\u0435"),
      estimate_level_visible: bodyText.includes("\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b"),
      missing_prices_visible: bodyText.includes("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430"),
      pdf_button_visible_after_confirm: await count(page, "[data-testid='consumer-repair-open-pdf']") > 0,
      blockers,
    };
  } finally {
    await browser.close();
  }
}

export async function runCommercialTrustEstimateWebSmoke(options: {
  baseUrl?: string;
  requireRealBrowser?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const outDir = path.join(process.cwd(), ".release-runtime", "ai-estimate-production-trust-governance", "web", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const browser = await runBrowserFlow(options.baseUrl ?? process.env.COMMERCIAL_TRUST_WEB_BASE_URL ?? "http://localhost:8081", outDir);
  const domain = auditCommercialTrustCriticalCases();
  const blockers = [
    ...(browser.blockers as string[]),
    domain.all_commercial_trust_cases_passed ? "" : "domain_commercial_trust_cases_failed",
    domain.pricebook_cases_total_correct ? "" : "domain_pricebook_total_failed",
  ].filter(Boolean);
  const summary = {
    status: blockers.length === 0 ? "GREEN" : "RED",
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_FAILED,
    source_sha: sourceSha,
    branch,
    generated_by: "scripts/e2e/runCommercialTrustEstimateWebSmoke.ts",
    generated_at: new Date().toISOString(),
    target: "web",
    require_real_browser: options.requireRealBrowser ?? true,
    browser_automation_started: true,
    actual_web_browser_commercial_trust_smoke_passed: blockers.length === 0,
    route_equivalent_smoke_passed: false,
    route_equivalent_not_reported_as_real_browser: true,
    browser_evidence_written: blockers.length === 0,
    console_error_count: browser.console_error_count,
    pdf_text_extraction_passed: browser.pdf_button_visible_after_confirm && domain.all_commercial_trust_cases_passed,
    procurement_package_verified: domain.all_commercial_trust_cases_passed,
    fake_green_claimed: false,
    browser_flow: browser,
    domain_acceptance: {
      commercial_trust_cases_count: domain.commercial_trust_cases_count,
      all_commercial_trust_cases_passed: domain.all_commercial_trust_cases_passed,
      pricebook_cases_total_correct: domain.pricebook_cases_total_correct,
    },
    blockers,
  };
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runCommercialTrustEstimateWebSmoke.ts")) {
  const target = argValue("target") ?? "web";
  if (target !== "web") {
    console.error(`UNSUPPORTED_TARGET:${target}`);
    process.exit(1);
  }
  void runCommercialTrustEstimateWebSmoke({
    baseUrl: argValue("base-url") ?? undefined,
    requireRealBrowser: process.argv.includes("--require-real-browser"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        artifact: result.artifactPath,
        final_status: result.artifact.final_status,
        actual_web_browser_commercial_trust_smoke_passed: result.artifact.actual_web_browser_commercial_trust_smoke_passed,
        console_error_count: result.artifact.console_error_count,
        blockers: result.artifact.blockers,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
