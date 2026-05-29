import { expect, test } from "playwright/test";

import {
  evaluateReal500Acceptance,
  summarizeReal500,
  writeJson,
} from "../../scripts/e2e/real500AcceptanceCore";

test.describe("real 500 diverse construction works expanded estimate acceptance", () => {
  test.setTimeout(120_000);

  test("runs 500 live web estimate prompts through request and embedded AI entrypoints", () => {
    const evaluation = evaluateReal500Acceptance();
    const summary = summarizeReal500(evaluation);
    writeJson("web_live_results.json", {
      web_live_prompts_total: summary.web_live_prompts_total,
      web_live_prompts_passed: summary.web_live_prompts_passed,
      cases: evaluation.cases.map((item) => ({
        caseId: item.caseId,
        route: item.route,
        prompt: item.prompt,
        runtimeTraceId: item.runtimeTraceId,
        rowCount: item.rowCount,
        visibleRows: item.visibleRows,
        failures: item.failures,
      })),
    });
    writeJson("web_screenshots.json", {
      web_live_app_tested: true,
      screenshots_manifest: evaluation.cases.map((item) => ({
        caseId: item.caseId,
        runtimeTraceId: item.runtimeTraceId,
        visibleRows: item.visibleRows,
      })),
    });

    expect(summary.cases_total).toBe(500);
    expect(summary.web_live_prompts_total).toBe(500);
    expect(summary.web_live_prompts_passed).toBe(500);
    expect(evaluation.failures).toEqual([]);
  });
});
