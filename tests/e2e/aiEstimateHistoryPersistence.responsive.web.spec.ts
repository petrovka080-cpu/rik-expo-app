import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE");
const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const PROMPT = "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438 200 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435";

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function mergeArtifact(payload: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, "responsive_results.json");
  const previous = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown> : {};
  const head = currentHead();
  fs.writeFileSync(filePath, `${JSON.stringify({
    ...previous,
    wave: WAVE,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
    ...payload,
  }, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

test.describe("AI estimate history persistence responsive web", () => {
  test.setTimeout(240_000);

  test("keeps recovered draft and history visible on mobile and desktop widths", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const results: Record<string, boolean> = {};

    for (const viewport of [
      { name: "mobile", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
      await page.getByTestId("consumer-repair-prepare-draft").click();
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("consumer-repair-history-row")).toBeVisible({ timeout: 60_000 });

      const summaryBox = await page.getByTestId("request-estimate-summary-card").boundingBox();
      const historyBox = await page.getByTestId("consumer-repair-history-row").boundingBox();
      results[`${viewport.name}_summary_visible`] = Boolean(summaryBox);
      results[`${viewport.name}_history_visible`] = Boolean(historyBox);
    }

    expect(Object.values(results).every(Boolean)).toBe(true);
    mergeArtifact({
      [`responsive_${testInfo.project.name}_passed`]: true,
      ...results,
      failures: [],
    });
  });
});
