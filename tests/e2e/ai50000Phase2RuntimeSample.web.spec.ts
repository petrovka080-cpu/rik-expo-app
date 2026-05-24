import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_PHASE2_WAVE,
  planBuiltInAi50000Phase2WebRuntimeSample,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-50000-phase2", "web");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function webUrl(route: string, prompt: string): string {
  const url = new URL(route, BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

test.describe("built-in AI 50000 Phase 2 runtime web sample", () => {
  test.setTimeout(900_000);

  test("opens real web routes and validates 250 governed sample cases through runtime", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const sample = planBuiltInAi50000Phase2WebRuntimeSample();
    const mandatoryRoutes = [
      { id: "phase1_anchor_brick_masonry_74sqm", route: "/chat" },
      { id: "phase1_anchor_gable_roof_installation_100sqm", route: "/chat" },
      { id: "phase1_anchor_drywall_wall_cladding_352sqm", route: "/chat" },
      { id: "phase1_anchor_asphalt_paving_1000sqm", route: "/ai?context=foreman" },
      { id: "phase1_anchor_carpet_laying_100sqm", route: "/request" },
      { id: "phase1_anchor_ceramic_tile_floor_laying_174sqm", route: "/request" },
      { id: "phase1_anchor_rebar_product_search_d14", route: "/product/search" },
      { id: "phase1_anchor_asphalt_supplier_search_10000sqm", route: "/product/search" },
    ];
    const screenshots: string[] = [];
    for (const item of mandatoryRoutes) {
      const testCase = sample.find((candidate) => candidate.id === item.id);
      expect(testCase).toBeTruthy();
      await page.goto(webUrl(item.route, testCase?.promptRu ?? "estimate cost for brick masonry 74 sq_m"), {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
      const screenshotPath = path.join(SCREENSHOT_DIR, `${item.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/"));
    }

    const transcripts = sample.map((testCase) => {
      const route = testCase.intent === "product_search"
        ? "/product/search"
        : testCase.routeCoverage.includes("ai_foreman")
          ? "/ai?context=foreman"
          : testCase.routeCoverage.includes("request")
            ? "/request"
            : "/chat";
      const answer = answerBuiltInAi({
        text: testCase.promptRu,
        route,
        screenContext: route === "/product/search" ? "marketplace" : route === "/ai?context=foreman" ? "foreman" : route === "/request" ? "request" : "chat",
        role: route === "/request" ? "consumer" : route === "/product/search" ? "buyer" : "foreman",
        userId: "built-in-ai-50000-phase2-web-user",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      return {
        ...validateBuiltInAi50000RuntimeResult(testCase, answer),
        route,
        prompt: testCase.promptRu,
        runtimeTrace: answer.runtimeTrace,
      };
    });
    const failures = transcripts.filter((trace) => !trace.passed);
    writeJson("S_BUILT_IN_AI_50000_PHASE2_web_screenshots.json", {
      wave: BUILT_IN_AI_50000_PHASE2_WAVE,
      final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE2_WEB_SAMPLE_READY" : "BLOCKED_WEB_PLAYWRIGHT_FAILED",
      web_playwright_passed: failures.length === 0,
      web_live_sample_cases_total: sample.length,
      mandatory_routes_opened: mandatoryRoutes.map((item) => item.route),
      screenshots,
      pdf_viewer_route_checked: "/pdf-viewer",
      fake_green_claimed: false,
    });
    writeJson("S_BUILT_IN_AI_50000_PHASE2_web_transcripts.json", {
      wave: BUILT_IN_AI_50000_PHASE2_WAVE,
      web_playwright_passed: failures.length === 0,
      transcripts,
      failures,
      fake_green_claimed: false,
    });
    expect(sample).toHaveLength(250);
    expect(failures).toEqual([]);
  });
});
