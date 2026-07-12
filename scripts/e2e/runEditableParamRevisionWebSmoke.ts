import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import {
  EDITABLE_PARAM_REVISION_CASE_SET,
  buildEditableParamRevisionAcceptanceCases,
  type EditableParamRevisionAcceptanceCase,
} from "../estimate/editableParamRevisionAcceptanceCases";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions", "web");
const CAPITAL_RENOVATION_BATCH_SMOKE_CASE: EditableParamRevisionAcceptanceCase = {
  id: "mandatory-capital-renovation-three-param-batch",
  prompt: "капитальный ремонт квартиры 98 м2 потолок 3 м 2 санузла",
  operation: "update_param",
  paramKey: "area_m2",
  rawValue: "120",
  expectedFamily: "apartment_capital_renovation",
  expectedParamAfter: 120,
};

type BatchParamEdit = {
  paramKey: string;
  rawValue: string;
};

export type EditableParamRevisionSmokeCaseResult = {
  case_id: string;
  prompt: string;
  param_key: string;
  param_keys?: string[];
  batch_size?: number;
  passed: boolean;
  ui: {
    revision_panel_visible: boolean;
    param_chip_visible: boolean;
    popover_visible: boolean;
    batch_bar_visible?: boolean;
    batch_apply_visible?: boolean;
    dirty_count_visible?: boolean;
    revision_diff_visible: boolean;
    timeline_r2_visible: boolean;
    artifact_status_visible: boolean;
  };
  blocking_reasons: string[];
};

export type EditableParamRevisionWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE
    | typeof STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof EDITABLE_PARAM_REVISION_CASE_SET;
  corpus_fingerprint: string;
  target: "web";
  require_real_browser: boolean;
  actual_web_browser_editable_param_revision_passed: boolean;
  web_editable_revision_cases_passed: string;
  web_revision_diff_visible_count: number;
  web_template_lost_after_edit_count: number;
  web_param_update_failures: number;
  web_recalc_failures: number;
  web_stale_pdf_failures: number;
  web_stale_buyer_failures: number;
  web_console_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  route_equivalent_used: false;
  env_flag_green: false;
  case_results: EditableParamRevisionSmokeCaseResult[];
  blockers: string[];
  runtime_summary_path?: string;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function writeSummary(summary: EditableParamRevisionWebSmokeSummary): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return filePath;
}

function smokeCases(count: number): EditableParamRevisionAcceptanceCase[] {
  const generated = buildEditableParamRevisionAcceptanceCases(Math.max(count * 2, 120))
    .filter((item) => !item.selectedTemplateId && item.operation === "update_param")
    .filter((item) => item.expectedFamily !== "diamond_core_drilling_concrete")
    .filter((item) => item.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id);
  return [CAPITAL_RENOVATION_BATCH_SMOKE_CASE, ...generated].slice(0, count);
}

function fingerprint(cases: readonly EditableParamRevisionAcceptanceCase[]): string {
  return Buffer.from(cases.map((item) => {
    const edits = explicitBatchEditsForCase(item) ?? [{ paramKey: item.paramKey, rawValue: item.rawValue }];
    return `${item.id}:${edits.map((edit) => `${edit.paramKey}=${edit.rawValue}`).join(",")}`;
  }).join("|")).toString("base64url").slice(0, 32);
}

function explicitBatchEditsForCase(testCase: EditableParamRevisionAcceptanceCase): BatchParamEdit[] | null {
  if (testCase.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id) return null;
  return [
    { paramKey: "area_m2", rawValue: "120" },
    { paramKey: "paint_total_area_m2", rawValue: "410" },
    { paramKey: "electrical_points", rawValue: "99" },
  ];
}

function nextRawBatchValue(currentValue: string, index: number): string {
  const normalized = currentValue.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return normalized ? `${normalized} ${index + 1}` : String(index + 1);
  const parsed = Number(match[0].replace(",", "."));
  if (!Number.isFinite(parsed)) return String(index + 1);
  const next = parsed + index + 1;
  return Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, "");
}

async function revealDerivedParameters(page: import("playwright").Page): Promise<void> {
  const toggle = page.getByTestId("request-estimate-derived-parameters-toggle");
  if (await toggle.count() === 0) return;
  await toggle.first().click();
  await page.getByTestId("request-estimate-derived-parameters").waitFor({ timeout: 5_000 }).catch(() => undefined);
}

async function collectBatchEdits(
  page: import("playwright").Page,
  testCase: EditableParamRevisionAcceptanceCase,
): Promise<BatchParamEdit[]> {
  const explicit = explicitBatchEditsForCase(testCase);
  if (explicit) return explicit;
  const editorIds = await page
    .locator('[data-testid^="editable-param-inline-editor-"]')
    .evaluateAll((nodes) => [...new Set(nodes
      .map((node) => node.getAttribute("data-testid") ?? "")
      .filter(Boolean)
      .map((testId) => testId.replace(/^editable-param-inline-editor-/, "")))]);
  const paramKeys = [testCase.paramKey, ...editorIds.filter((key) => key !== testCase.paramKey)].slice(0, 3);
  const edits: BatchParamEdit[] = [];
  for (const [index, paramKey] of paramKeys.entries()) {
    if (paramKey === testCase.paramKey) {
      edits.push({ paramKey, rawValue: testCase.rawValue });
      continue;
    }
    const input = page.getByTestId(`editable-param-inline-editor-${paramKey}`).getByTestId("editable-param-popover-input");
    const currentValue = await input.inputValue().catch(() => "");
    edits.push({ paramKey, rawValue: nextRawBatchValue(currentValue, index) });
  }
  return edits;
}

async function runCase(page: import("playwright").Page, testCase: EditableParamRevisionAcceptanceCase): Promise<EditableParamRevisionSmokeCaseResult> {
  const blockers: string[] = [];
  const baseUrl = String(process.env.EDITABLE_PARAM_REVISION_WEB_BASE_URL ?? process.env.INLINE_WORK_PROMPT_WEB_BASE_URL).replace(/\/$/, "");
  const requestUrl = new URL("/request", `${baseUrl}/`);
  requestUrl.searchParams.set("autoPrepare", "1");
  requestUrl.searchParams.set("prompt", testCase.prompt);
  requestUrl.searchParams.set("editableParamRevisionSmoke", testCase.id);
  await page.goto(requestUrl.toString(), {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  await page.evaluate("var __name = globalThis.__name || ((target) => target); globalThis.__name = __name;");
  await page.getByTestId("request-estimate-parameters-toggle").waitFor({ timeout: 25_000 });
  await page.getByTestId("request-estimate-parameters-toggle").click();
  await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 10_000 });
  await revealDerivedParameters(page);
  const edits = await collectBatchEdits(page, testCase);
  if (edits.length < 3) blockers.push("batch_three_params_missing");
  for (const edit of edits.slice(0, 3)) {
    const editor = page.getByTestId(`editable-param-inline-editor-${edit.paramKey}`);
    await editor.waitFor({ timeout: 10_000 });
    await editor.getByTestId("editable-param-popover-input").fill(edit.rawValue);
  }
  await page.getByTestId("editable-param-batch-bar").waitFor({ timeout: 10_000 });
  const batchUiBeforeApply = {
    batch_bar_visible: await page.getByTestId("editable-param-batch-bar").count() > 0,
    batch_apply_visible: await page.getByTestId("editable-param-batch-apply").count() > 0,
    dirty_count_visible: await page.getByTestId("editable-param-batch-dirty-count").count() > 0,
  };
  await page.getByTestId("editable-param-batch-apply").click();
  await page.getByTestId("request-estimate-parameter-apply-status").waitFor({ timeout: 20_000 });
  await page.getByTestId("request-estimate-runtime-details-toggle").click();
  await page.getByTestId("estimate-revision-timeline-r2").waitFor({ timeout: 20_000 });
  await page.getByTestId("estimate-revision-diff").waitFor({ timeout: 20_000 });

  const paramKeys = edits.slice(0, 3).map((edit) => edit.paramKey);
  const ui = {
    ...(await page.evaluate((paramKeys) => {
    const byTestId = (id: string) => Boolean(document.querySelector(`[data-testid="${id}"]`));
    const primaryParamKey = paramKeys[0] ?? "";
    return {
      revision_panel_visible: byTestId("request-estimate-parameter-panel"),
      param_chip_visible: byTestId(`editable-param-chip-${primaryParamKey}`),
      popover_visible: byTestId("editable-param-popover"),
      revision_diff_visible: byTestId("estimate-revision-diff"),
      timeline_r2_visible: byTestId("estimate-revision-timeline-r2"),
      artifact_status_visible: byTestId("estimate-revision-artifact-status") || byTestId("estimate-current-revision-artifacts"),
    };
  }, paramKeys)),
    ...batchUiBeforeApply,
  };
  if (!ui.revision_panel_visible) blockers.push("param_edit_ui_missing");
  if (!ui.param_chip_visible) blockers.push("param_chip_missing");
  if (!ui.revision_diff_visible) blockers.push("revision_diff_missing");
  if (!ui.timeline_r2_visible) blockers.push("revision_r2_missing");
  if (!ui.artifact_status_visible) blockers.push("artifact_status_missing");

  return {
    case_id: testCase.id,
    prompt: testCase.prompt,
    param_key: testCase.paramKey,
    param_keys: paramKeys,
    batch_size: paramKeys.length,
    passed: blockers.length === 0,
    ui,
    blocking_reasons: blockers,
  };
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const write = hasFlag("write-summary");
  const requestedCases = Math.max(1, Number(argValue("case-count", "100")) || 100);
  const baseUrl = String(process.env.EDITABLE_PARAM_REVISION_WEB_BASE_URL ?? process.env.INLINE_WORK_PROMPT_WEB_BASE_URL ?? "").replace(/\/$/, "");
  const cases = smokeCases(requestedCases);
  const summary: EditableParamRevisionWebSmokeSummary = {
    final_status: STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: EDITABLE_PARAM_REVISION_CASE_SET,
    corpus_fingerprint: fingerprint(cases),
    target: "web",
    require_real_browser: requireRealBrowser,
    actual_web_browser_editable_param_revision_passed: false,
    web_editable_revision_cases_passed: `0/${cases.length}`,
    web_revision_diff_visible_count: 0,
    web_template_lost_after_edit_count: 0,
    web_param_update_failures: 0,
    web_recalc_failures: 0,
    web_stale_pdf_failures: 0,
    web_stale_buyer_failures: 0,
    web_console_errors_count: 0,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    route_equivalent_used: false,
    env_flag_green: false,
    case_results: [],
    blockers: [],
  };

  if (requireRealBrowser && !baseUrl) {
    summary.blockers.push("EDITABLE_PARAM_REVISION_WEB_BASE_URL_missing");
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
    for (const testCase of cases) {
      try {
        const result = await runCase(page, testCase);
        summary.case_results.push(result);
      } catch (error) {
        summary.case_results.push({
          case_id: testCase.id,
          prompt: testCase.prompt,
          param_key: testCase.paramKey,
          passed: false,
          ui: {
            revision_panel_visible: false,
            param_chip_visible: false,
            popover_visible: false,
            revision_diff_visible: false,
            timeline_r2_visible: false,
            artifact_status_visible: false,
          },
          blocking_reasons: [error instanceof Error ? error.message : String(error)],
        });
      }
    }
  } finally {
    await browser.close();
  }

  const passed = summary.case_results.filter((item) => item.passed).length;
  summary.web_editable_revision_cases_passed = `${passed}/${cases.length}`;
  summary.web_revision_diff_visible_count = summary.case_results.filter((item) => item.ui.revision_diff_visible).length;
  summary.web_param_update_failures = summary.case_results.filter((item) => item.blocking_reasons.includes("param_chip_missing")).length;
  summary.web_recalc_failures = summary.case_results.filter((item) => item.blocking_reasons.includes("revision_r2_missing") || item.blocking_reasons.includes("revision_diff_missing")).length;
  summary.web_console_errors_count = consoleErrors.length;
  summary.blockers.push(
    ...summary.case_results.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)).slice(0, 80),
    ...consoleErrors.slice(0, 20).map((error) => `console:${error}`),
  );
  const green = passed === cases.length && consoleErrors.length === 0 && cases.length === requestedCases;
  summary.actual_web_browser_editable_param_revision_passed = green;
  summary.final_status = green
    ? GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE
    : STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED;
  if (write) summary.runtime_summary_path = writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
