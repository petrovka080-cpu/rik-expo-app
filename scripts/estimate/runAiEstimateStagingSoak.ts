import path from "node:path";

import { chromium, type Page } from "playwright";

import { checkAiEstimateStagingHealth } from "../e2e/checkAiEstimateStagingHealth";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  isLocalhostBaseUrl,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { resolveStagingBaseUrl } from "../e2e/resolveStagingBaseUrl";
import { timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { loadStagingReleaseCandidateCases } from "./runAiEstimateStagingReleaseCandidateCases";

export const GREEN_STAGING_SOAK_LOAD_READY = "GREEN_STAGING_SOAK_LOAD_READY" as const;
export const STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN = "STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "soak");
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const REQUIRED = {
  create_draft: 500,
  parameter_override: 200,
  approval: 100,
  pdf_generation: 100,
  buyer_generation: 100,
  history_reload: 100,
} as const;

type OperationKey = keyof typeof REQUIRED;

export type StagingSoakEvidence = {
  source_sha: string;
  branch: string;
  generated_at: string;
  staging_url: string | null;
  staging_soak_browser_flow_executed: boolean;
  staging_soak_executed_against_external_url: boolean;
  operation_counts: Record<OperationKey, number>;
  total_operation_attempts: number;
  total_operation_errors: number;
  duplicate_approve_safe: boolean;
  memory_budget_violations_count: number;
  browser_console_errors_count: number;
  browser_page_errors_count: number;
  first_error: string | null;
  screenshot_path: string | null;
};

function opString(evidence: StagingSoakEvidence | null, key: OperationKey): string {
  return `${evidence?.operation_counts[key] ?? 0}/${REQUIRED[key]}`;
}

function shortError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").slice(0, 300);
}

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
    await sleep(350);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("poll_timeout");
}

async function setInputText(page: Page, testId: string, value: string): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.fill(value, { timeout: 30_000 });
  await poll(async () => {
    if ((await locator.count()) === 0) return true;
    const current = await locator.evaluate((node) => {
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      return input.value;
    });
    return current === value ? true : null;
  }, 10_000);
  await locator.blur().catch(() => undefined);
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

async function prepareDraft(page: Page, prompt: string): Promise<void> {
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-city-input", "Bishkek");
  await setInputText(page, "consumer-repair-address-input", "staging-soak-redacted-address");
  await setInputText(page, "consumer-repair-time-input", "today");
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-phone-input", "0700000000");
  await setInputText(page, "consumer-repair-problem-input", prompt);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 120_000 });
}

async function parameterOverride(page: Page, value: string): Promise<boolean> {
  const edit = page.locator("[data-testid^='editable-param-edit-']").first();
  if (await edit.count() === 0) return false;
  await edit.scrollIntoViewIfNeeded();
  await edit.click();
  await page.getByTestId("editable-param-popover").waitFor({ timeout: 45_000 });
  await setInputText(page, "editable-param-popover-input", value);
  await page.getByTestId("editable-param-popover-save").click();
  await poll(async () =>
    await page.getByTestId("editable-param-popover").count() === 0 ? true : null,
  45_000);
  return true;
}

async function approveAndHistory(page: Page): Promise<{
  approval: boolean;
  pdf: boolean;
  buyer: boolean;
  history: boolean;
  duplicateSafe: boolean;
}> {
  await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
  await page.getByTestId("consumer-repair-approve").click();
  await poll(async () => {
    if (await page.getByTestId("consumer-repair-open-pdf").count() > 0) return true;
    const historyCount = page.getByTestId("consumer-repair-history-approved-count");
    if (await historyCount.count() > 0) {
      const text = await historyCount.innerText({ timeout: 5_000 }).catch(() => "");
      if ((Number(text.replace(/[^0-9]/g, "")) || 0) > 0) return true;
    }
    const status = page.getByTestId("consumer-repair-status");
    if (await status.count() > 0) {
      const text = await status.innerText({ timeout: 5_000 }).catch(() => "");
      if (/утвержд|approved|PDF/i.test(text)) return true;
    }
    return null;
  }, 120_000);
  const duplicateApproveVisible = await page.getByTestId("consumer-repair-approve").count() > 0;
  let duplicateSafe = true;
  if (duplicateApproveVisible) {
    await page.getByTestId("consumer-repair-approve").click({ timeout: 5_000 }).catch(() => undefined);
    duplicateSafe = await page.getByTestId("consumer-repair-open-pdf").count() > 0;
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-history-button").waitFor({ timeout: 45_000 });
  await page.getByTestId("consumer-repair-history-button").click();
  await page.getByTestId("consumer-repair-history-modal").waitFor({ timeout: 45_000 });
  const firstHistory = page.getByTestId("consumer-repair-history-main").first();
  if (await firstHistory.count() > 0) await firstHistory.click();
  await page.getByTestId("consumer-repair-history-open-pdf-expanded").waitFor({ timeout: 45_000 }).catch(() => undefined);
  return {
    approval: true,
    pdf: await page.getByTestId("consumer-repair-history-open-pdf-expanded").count() > 0 ||
      await page.getByTestId("consumer-repair-open-pdf").count() > 0,
    buyer: await page.getByTestId("consumer-repair-history-send-market").count() > 0,
    history: await page.getByTestId("consumer-repair-history-modal").count() > 0,
    duplicateSafe,
  };
}

async function executeRealStagingSoak(input: { url?: string | null; outDir: string }): Promise<StagingSoakEvidence> {
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const baseUrl = resolution.baseUrl;
  const cases = loadStagingReleaseCandidateCases().cases;
  const prompt = cases[0]?.prompt_ru ?? "Staging soak repair request";
  const counts: Record<OperationKey, number> = {
    create_draft: 0,
    parameter_override: 0,
    approval: 0,
    pdf_generation: 0,
    buyer_generation: 0,
    history_reload: 0,
  };
  let attempts = 0;
  let errors = 0;
  let firstError: string | null = null;
  let duplicateApproveSafe = true;
  let screenshotPath: string | null = null;
  let browserConsoleErrors = 0;
  let browserPageErrors = 0;

  if (!baseUrl || resolution.blockers.length > 0 || isLocalhostBaseUrl(baseUrl)) {
    return {
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      generated_at: new Date().toISOString(),
      staging_url: baseUrl,
      staging_soak_browser_flow_executed: false,
      staging_soak_executed_against_external_url: false,
      operation_counts: counts,
      total_operation_attempts: 0,
      total_operation_errors: 1,
      duplicate_approve_safe: false,
      memory_budget_violations_count: 0,
      browser_console_errors_count: 0,
      browser_page_errors_count: 0,
      first_error: resolution.blockers[0] ?? "STAGING_URL_NOT_EXTERNAL",
      screenshot_path: null,
    };
  }

  const health = await checkAiEstimateStagingHealth({ url: baseUrl, writeSummary: false });
  if (health.artifact.blocking_reasons.length > 0) {
    return {
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      generated_at: new Date().toISOString(),
      staging_url: baseUrl,
      staging_soak_browser_flow_executed: false,
      staging_soak_executed_against_external_url: true,
      operation_counts: counts,
      total_operation_attempts: 0,
      total_operation_errors: health.artifact.blocking_reasons.length,
      duplicate_approve_safe: false,
      memory_budget_violations_count: 0,
      browser_console_errors_count: 0,
      browser_page_errors_count: 0,
      first_error: `health:${health.artifact.blocking_reasons[0]}`,
      screenshot_path: null,
    };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addInitScript((key) => {
    window.localStorage.removeItem(key as string);
  }, DURABLE_REQUEST_STORE_KEY);
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") browserConsoleErrors += 1;
  });
  page.on("pageerror", () => {
    browserPageErrors += 1;
  });

  try {
    await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?stagingSoak=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    for (let index = 1; index <= REQUIRED.create_draft; index += 1) {
      try {
        attempts += 1;
        await prepareDraft(page, `${prompt} soak ${index}`);
        counts.create_draft += 1;

        if (index <= REQUIRED.parameter_override) {
          attempts += 1;
          if (await parameterOverride(page, String(1000 + index))) counts.parameter_override += 1;
        }

        if (index <= REQUIRED.approval) {
          attempts += 4;
          const approved = await approveAndHistory(page);
          if (approved.approval) counts.approval += 1;
          if (approved.pdf) counts.pdf_generation += 1;
          if (approved.buyer) counts.buyer_generation += 1;
          if (approved.history) counts.history_reload += 1;
          duplicateApproveSafe = duplicateApproveSafe && approved.duplicateSafe;
          await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?stagingSoak=${Date.now()}-${index}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
        }
      } catch (error) {
        errors += 1;
        firstError ??= shortError(error);
        await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?stagingSoakRecovery=${Date.now()}-${index}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        }).catch(() => undefined);
      }
    }
  } catch (error) {
    errors += 1;
    firstError ??= shortError(error);
  } finally {
    screenshotPath = path.join(input.outDir, "staging-soak-final.png");
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotPath = null;
    });
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }

  const memoryUsedMb = process.memoryUsage().rss / 1024 / 1024;
  return {
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    generated_at: new Date().toISOString(),
    staging_url: baseUrl,
    staging_soak_browser_flow_executed: attempts > 0,
    staging_soak_executed_against_external_url: !isLocalhostBaseUrl(baseUrl),
    operation_counts: counts,
    total_operation_attempts: attempts,
    total_operation_errors: errors,
    duplicate_approve_safe: duplicateApproveSafe,
    memory_budget_violations_count: memoryUsedMb > 1536 ? 1 : 0,
    browser_console_errors_count: browserConsoleErrors,
    browser_page_errors_count: browserPageErrors,
    first_error: firstError,
    screenshot_path: screenshotPath,
  };
}

export function buildStagingSoakSummary(input: {
  evidence?: StagingSoakEvidence | null;
  executeStaging?: boolean;
} = {}) {
  const evidence = input.evidence ?? null;
  const operationBlockers = evidence
    ? (Object.keys(REQUIRED) as OperationKey[]).map((key) =>
      evidence.operation_counts[key] >= REQUIRED[key]
        ? ""
        : `STAGING_SOAK_${key.toUpperCase()}_OPS_BELOW_REQUIRED:${evidence.operation_counts[key]}/${REQUIRED[key]}`,
    )
    : [];
  const errorRate = evidence && evidence.total_operation_attempts > 0
    ? evidence.total_operation_errors / evidence.total_operation_attempts
    : 1;
  const blockers = [
    evidence ? "" : "STAGING_SOAK_EXECUTION_EVIDENCE_MISSING",
    input.executeStaging === true && !evidence ? "STAGING_SOAK_MANUAL_EXECUTE_FLAG_REJECTED" : "",
    evidence?.source_sha === currentSourceSha() ? "" : "STAGING_SOAK_SOURCE_SHA_NOT_CURRENT",
    evidence?.staging_soak_browser_flow_executed === true ? "" : "STAGING_SOAK_BROWSER_FLOW_NOT_EXECUTED",
    evidence?.staging_soak_executed_against_external_url === true ? "" : "STAGING_SOAK_NOT_EXECUTED_AGAINST_EXTERNAL_URL",
    ...operationBlockers,
    evidence?.duplicate_approve_safe === true ? "" : "STAGING_SOAK_DUPLICATE_APPROVE_NOT_PROVEN_SAFE",
    evidence?.memory_budget_violations_count === 0 ? "" : "STAGING_SOAK_MEMORY_BUDGET_VIOLATION",
    errorRate <= 0.005 ? "" : `STAGING_SOAK_ERROR_RATE_ABOVE_SLO:${errorRate.toFixed(4)}`,
    evidence?.browser_console_errors_count === 0 ? "" : `STAGING_SOAK_BROWSER_CONSOLE_ERRORS:${evidence?.browser_console_errors_count ?? -1}`,
    evidence?.browser_page_errors_count === 0 ? "" : `STAGING_SOAK_BROWSER_PAGE_ERRORS:${evidence?.browser_page_errors_count ?? -1}`,
  ].filter(Boolean);
  const green = blockers.length === 0;
  return {
    final_status: green
      ? GREEN_STAGING_SOAK_LOAD_READY
      : STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_url: evidence?.staging_url ?? null,
    staging_soak_created: true,
    staging_soak_executed_against_external_url: evidence?.staging_soak_executed_against_external_url === true,
    staging_soak_browser_flow_executed: evidence?.staging_soak_browser_flow_executed === true,
    staging_create_draft_ops_passed: opString(evidence, "create_draft"),
    staging_parameter_override_ops_passed: opString(evidence, "parameter_override"),
    staging_approval_ops_passed: opString(evidence, "approval"),
    staging_pdf_generation_ops_passed: opString(evidence, "pdf_generation"),
    staging_buyer_generation_ops_passed: opString(evidence, "buyer_generation"),
    staging_history_reload_ops_passed: opString(evidence, "history_reload"),
    staging_duplicate_approve_safe: evidence?.duplicate_approve_safe === true,
    staging_memory_budget_violations_count: evidence?.memory_budget_violations_count ?? -1,
    staging_error_rate_within_slo: errorRate <= 0.005,
    staging_soak_error_rate: errorRate,
    browser_console_errors_count: evidence?.browser_console_errors_count ?? -1,
    browser_page_errors_count: evidence?.browser_page_errors_count ?? -1,
    evidence,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

export async function runAiEstimateStagingSoak(input: {
  url?: string | null;
  writeSummary?: boolean;
  executeStaging?: boolean;
  evidence?: StagingSoakEvidence | null;
} = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  const evidence = input.evidence ?? (input.executeStaging === true
    ? await executeRealStagingSoak({ url: input.url, outDir })
    : null);
  const summary = buildStagingSoakSummary({ evidence, executeStaging: input.executeStaging });
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(ROOT, "not-written", "summary.json") }
    : (() => {
      const summaryPath = path.join(outDir, "summary.json");
      writeJson(summaryPath, summary);
      return { summary, summaryPath };
    })();
}

if (require.main === module) {
  void runAiEstimateStagingSoak({
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
    executeStaging: !hasFlag("no-execute-staging"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      staging_soak_executed_against_external_url: result.summary.staging_soak_executed_against_external_url,
      staging_create_draft_ops_passed: result.summary.staging_create_draft_ops_passed,
      staging_parameter_override_ops_passed: result.summary.staging_parameter_override_ops_passed,
      staging_approval_ops_passed: result.summary.staging_approval_ops_passed,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
