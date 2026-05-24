import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_PHASE3_WAVE,
  planBuiltInAi50000Phase3RequestDraftSample,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-50000-phase3", "request-draft");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("built-in AI 50000 Phase 3 request draft sample", () => {
  test.setTimeout(900_000);

  test("validates 100 request draft cases with estimate items", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const sample = planBuiltInAi50000Phase3RequestDraftSample();
    await page.goto(new URL("/request?prompt=carpet_laying%20100%20м²&autoSend=1", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    const screenshotPath = path.join(SCREENSHOT_DIR, "request_carpet_laying_100sqm.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const drafts = sample.map((item) => {
      const testCase = BUILT_IN_AI_50000_FULL_CASES.find((candidate) => candidate.id === item.caseId);
      if (!testCase) throw new Error(`Missing request sample case: ${item.caseId}`);
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: "/request",
        screenContext: "request",
        role: "consumer",
        userId: "built-in-ai-50000-phase3-request-user",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const validation = validateBuiltInAi50000RuntimeResult(testCase, answer);
      const rows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows) ?? [];
      return {
        ...validation,
        route: item.route,
        prompt: item.prompt,
        title: answer.toolResult.estimate?.work.title ?? item.workFamily,
        description: answer.answerTextRu.slice(0, 240),
        workKey: answer.toolResult.estimate?.work.workKey ?? item.workKey,
        estimateId: answer.toolResult.estimate?.estimateId ?? null,
        estimateItems: rows.map((row) => ({ name: row.name, quantity: row.quantity, unit: row.unit })),
        editableQuantity: rows.every((row) => row.quantity > 0),
        makePdfAction: answer.actions.some((action) => action.id === "make_pdf" && action.visible),
        sendOrCreateRequestAction: answer.actions.some((action) => action.id === "create_request" || action.id === "save_estimate"),
      };
    });
    const failures = drafts.filter((draft) =>
      !draft.passed ||
      !draft.estimateId ||
      draft.estimateItems.length === 0 ||
      !draft.editableQuantity ||
      !draft.makePdfAction ||
      /^Строительные работы$/i.test(draft.title)
    );
    writeJson("S_BUILT_IN_AI_50000_PHASE3_request_drafts.json", {
      wave: BUILT_IN_AI_50000_PHASE3_WAVE,
      final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE3_REQUEST_DRAFT_SAMPLE_READY" : "BLOCKED_REQUEST_DRAFT_SAMPLE_FAILED",
      request_draft_cases_total: sample.length,
      request_draft_cases_passed: sample.length - failures.length,
      request_generic_draft_found: failures.some((draft) => /^Строительные работы$/i.test(draft.title)),
      screenshots: [path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/")],
      drafts,
      failures,
      fake_green_claimed: false,
    });
    expect(sample).toHaveLength(100);
    expect(failures).toEqual([]);
  });
});
