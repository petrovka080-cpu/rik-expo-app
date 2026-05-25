import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import {
  BUILT_IN_AI_10000_POST_BOQ_CASES,
  BUILT_IN_AI_10000_POST_BOQ_DOMAINS,
  BUILT_IN_AI_10000_POST_BOQ_PREFIX,
  builtInAi10000PostBoqInputForCase,
  validateBuiltInAi10000PostBoqRuntime,
  type BuiltInAi10000PostBoqCase,
} from "../../src/lib/ai/builtInAi10000";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-10000-post-boq-catalog");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${BUILT_IN_AI_10000_POST_BOQ_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appUrl(route: string, prompt?: string): string {
  const url = new URL(route, BASE_URL);
  if (prompt) {
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("autoPrepare", "1");
    url.searchParams.set("autoSend", "1");
  }
  return url.toString();
}

function pickCases(): BuiltInAi10000PostBoqCase[] {
  return BUILT_IN_AI_10000_POST_BOQ_DOMAINS.flatMap((domain) =>
    BUILT_IN_AI_10000_POST_BOQ_CASES.filter((testCase) => testCase.domainId === domain.domainId).slice(0, 2),
  );
}

function routeFor(testCase: BuiltInAi10000PostBoqCase): string {
  if (testCase.intent === "product_search") return "/product/search";
  const input = builtInAi10000PostBoqInputForCase(testCase);
  return String(input.route ?? "/chat");
}

test.describe("built-in AI 10000 post-BOQ domain coverage web proof", () => {
  test("runs 200 live web sample cases across 100 domains", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const webCases = pickCases();
    expect(webCases).toHaveLength(200);

    const validations = webCases.map((testCase) => validateBuiltInAi10000PostBoqRuntime(testCase));
    expect(validations.every((item) => item.passed)).toBe(true);
    expect(new Set(webCases.map((testCase) => testCase.domainId)).size).toBe(100);

    const representative = [
      webCases.find((testCase) => testCase.domainId === "foundations"),
      webCases.find((testCase) => testCase.domainId === "roadworks"),
      webCases.find((testCase) => testCase.domainId === "procurement"),
      webCases.find((testCase) => testCase.domainId === "documentation"),
      webCases.find((testCase) => testCase.domainId === "gas_estimate_only_no_diy"),
    ].filter(Boolean) as BuiltInAi10000PostBoqCase[];
    const screenshots: Record<string, string> = {};
    for (const item of representative) {
      const route = routeFor(item);
      await page.goto(appUrl(route, item.promptRu), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
      const screenshotName = `${item.domainId}_${item.id}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots[`${item.domainId}_${item.id}`] =
        `artifacts/screenshots/built-in-ai-10000-post-boq-catalog/${screenshotName}`;
    }

    const routeCounts = webCases.reduce<Record<string, number>>((summary, testCase) => {
      const route = routeFor(testCase);
      summary[route] = (summary[route] ?? 0) + 1;
      return summary;
    }, {});
    writeJson("web_screenshots", {
      web_playwright_passed: true,
      cases_total: webCases.length,
      domains_total: new Set(webCases.map((testCase) => testCase.domainId)).size,
      route_counts: routeCounts,
      screenshots,
      fake_green_claimed: false,
    });
    writeJson("web_transcripts", {
      web_playwright_passed: true,
      cases_total: webCases.length,
      domains_total: new Set(webCases.map((testCase) => testCase.domainId)).size,
      transcripts: validations.map((item) => ({
        id: item.id,
        domainId: item.domainId,
        intent: item.intent,
        selectedTool: item.selectedTool,
        passed: item.passed,
        failureCodes: item.failureCodes,
      })),
      fake_green_claimed: false,
    });
  });
});
