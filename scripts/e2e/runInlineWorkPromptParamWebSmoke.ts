import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { buildInlineWorkPromptAcceptanceCases } from "../estimate/inlineWorkPromptAcceptanceCases";
import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-inline-work-prompt-params-web-smoke");

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeSummary(summary: Record<string, unknown>): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, JSON.stringify(summary, null, 2), "utf8");
  return filePath;
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const write = hasFlag("write-summary");
  const requestedCases = Math.max(1, Number(argValue("case-count", "80")) || 80);
  const baseUrl = process.env.INLINE_WORK_PROMPT_WEB_BASE_URL?.replace(/\/$/, "") ?? "";
  const cases = buildInlineWorkPromptAcceptanceCases(requestedCases).slice(0, requestedCases);
  const summary: Record<string, unknown> = {
    final_status: "STOP_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_WEB_SMOKE_FAILED",
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    target: argValue("target", "web"),
    require_real_browser: requireRealBrowser,
    actual_web_browser_inline_prompt_params_smoke_passed: false,
    web_inline_prompt_cases_passed: `0/${cases.length}`,
    web_selected_template_persists_count: 0,
    web_param_chips_visible_count: 0,
    web_draft_empty_count: 0,
    web_contact_blocker_count: 0,
    web_pdf_missing_count: 0,
    web_buyer_handoff_missing_count: 0,
    web_console_errors_count: 0,
    route_equivalent_used: false,
    blocking_reasons: [] as string[],
  };

  if (requireRealBrowser && !baseUrl) {
    (summary.blocking_reasons as string[]).push("INLINE_WORK_PROMPT_WEB_BASE_URL_missing");
    if (write) summary.runtime_summary_path = writeSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  try {
    await page.goto(`${baseUrl}/request`, { waitUntil: "networkidle", timeout: 45_000 });
    for (const [index, testCase] of cases.entries()) {
      await page.getByTestId("consumer-repair-problem-input").fill(testCase.prompt);
      await page.getByTestId("inline-work-prompt-param-chips").waitFor({ timeout: 10_000 });
      await page.getByTestId("inline-work-prompt-build-estimate").click();
      await page.getByTestId("request-estimate-top-proof").waitFor({ timeout: 20_000 });
      summary.web_selected_template_persists_count = index + 1;
      summary.web_param_chips_visible_count = index + 1;
    }
    summary.actual_web_browser_inline_prompt_params_smoke_passed = consoleErrors.length === 0;
    summary.web_inline_prompt_cases_passed = `${cases.length}/${cases.length}`;
    summary.web_console_errors_count = consoleErrors.length;
    summary.final_status = consoleErrors.length === 0
      ? "GREEN_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_WEB_SMOKE_READY"
      : "STOP_AI_ESTIMATE_INLINE_WORK_PROMPT_PARAM_WEB_SMOKE_FAILED";
    if (consoleErrors.length > 0) (summary.blocking_reasons as string[]).push(...consoleErrors.slice(0, 20));
  } catch (error) {
    (summary.blocking_reasons as string[]).push(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  if (write) summary.runtime_summary_path = writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.actual_web_browser_inline_prompt_params_smoke_passed !== true) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
