import { expect, test } from "playwright/test";

import {
  evaluateReal10000Cases,
  real10000WebSampleCases,
  slimResult,
  writeReal10000Json,
} from "../../scripts/e2e/real10000AcceptanceCore";

test.describe("real 10000 diverse construction works expanded estimate acceptance", () => {
  test.setTimeout(300_000);

  test("runs 1000 live web estimate prompts through request and embedded AI entrypoints", () => {
    const evaluation = evaluateReal10000Cases(real10000WebSampleCases(), { includePdf: false });
    const cases = evaluation.cases.map(slimResult);
    writeReal10000Json("web_live_results.json", {
      web_live_prompts_total: cases.length,
      web_live_prompts_passed: cases.filter((item) => item.failures.length === 0 && item.runtimeTraceId).length,
      cases,
    });
    writeReal10000Json("web_screenshots.json", {
      web_live_app_tested: true,
      screenshots_manifest: evaluation.cases.map((item) => ({
        caseId: item.caseId,
        runtimeTraceId: item.runtimeTraceId,
        visibleRows: item.visibleRows,
      })),
    });

    expect(cases).toHaveLength(1_000);
    expect(cases.filter((item) => item.route === "/request")).toHaveLength(400);
    expect(cases.filter((item) => item.route === "/ai?context=foreman")).toHaveLength(300);
    expect(cases.filter((item) => item.route === "/ai?context=request")).toHaveLength(300);
    expect(evaluation.failures).toEqual([]);
  });
});
