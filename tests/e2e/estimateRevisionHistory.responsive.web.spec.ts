import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442 20 \u043c2 \u0441 \u043f\u043b\u0438\u043d\u0442\u0443\u0441\u043e\u043c";

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeArtifact(payload: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const head = currentHead();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "responsive_results.json"), `${JSON.stringify({
    wave: WAVE,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
    ...payload,
  }, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", PROMPT);
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

test.describe("estimate revision history responsive web", () => {
  test.setTimeout(240_000);

  test("keeps revision labels visible on compact and desktop widths", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const results: Record<string, boolean> = {};
    for (const viewport of [
      { name: "mobile", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByTestId("request-estimate-revision-version")).toBeVisible({ timeout: 60_000 });
      const versionBox = await page.getByTestId("request-estimate-revision-version").boundingBox();
      const summaryBox = await page.getByTestId("request-estimate-summary-card").boundingBox();
      results[`${viewport.name}_revision_visible`] = Boolean(versionBox);
      results[`${viewport.name}_revision_inside_summary`] = Boolean(
        versionBox && summaryBox
          && versionBox.x >= summaryBox.x
          && versionBox.y >= summaryBox.y
          && versionBox.x + versionBox.width <= summaryBox.x + summaryBox.width + 1,
      );
    }

    expect(Object.values(results).every(Boolean)).toBe(true);
    writeArtifact({
      passed: true,
      browser_project: testInfo.project.name,
      ...results,
    });
  });
});
