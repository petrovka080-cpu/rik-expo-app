import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_PHASE4_WAVE,
  buildBuiltInAi50000Phase4CanaryPlan,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import type { BuiltInAi50000Case, BuiltInAi50000Phase3SampleItem } from "../../src/lib/ai/builtInAi50000";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-50000-phase4", "web-canary");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function webUrl(route: string, prompt: string): string {
  const [pathname, search = ""] = route.split("?");
  const url = new URL(pathname, BASE_URL);
  if (search) {
    for (const [key, value] of new URLSearchParams(search)) url.searchParams.set(key, value);
  }
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("autoSend", "1");
  url.searchParams.set("debugTrace", "1");
  url.searchParams.set("canaryMode", "phase4-disabled-proof");
  return url.toString();
}

function caseById(caseId: string): BuiltInAi50000Case {
  const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.id === caseId);
  if (!testCase) throw new Error(`Missing Phase 4 canary case: ${caseId}`);
  return testCase;
}

function runtimeContext(item: BuiltInAi50000Phase3SampleItem): {
  route: string;
  screenContext: BuiltInAiScreenContext;
  role: string;
} {
  if (item.route === "/product/search") return { route: item.route, screenContext: "marketplace", role: "buyer" };
  if (item.route === "/ai?context=foreman") return { route: item.route, screenContext: "foreman", role: "foreman" };
  if (item.route === "/request") return { route: item.route, screenContext: "request", role: "consumer" };
  return { route: item.route === "/pdf-viewer" ? "/chat" : item.route, screenContext: "chat", role: "foreman" };
}

function validateSampleItem(item: BuiltInAi50000Phase3SampleItem) {
  const route = runtimeContext(item);
  const answer = answerBuiltInAi({
    text: item.prompt,
    route: route.route,
    screenContext: route.screenContext,
    role: route.role,
    userId: "built-in-ai-50000-phase4-web-canary-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  return {
    ...validateBuiltInAi50000RuntimeResult(caseById(item.caseId), answer),
    route: item.route,
    prompt: item.prompt,
    runtimeTrace: answer.runtimeTrace,
    actionIds: answer.actions.map((action) => action.id),
  };
}

test.describe("built-in AI 50000 Phase 4 canary safety web smoke", () => {
  test.setTimeout(300_000);

  test("keeps canary disabled while validating live web canary sample", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    const sample = plan.webCanaryCases;
    const screenshots: string[] = [];
    for (const item of sample.slice(0, 10)) {
      await page.goto(webUrl(item.route === "/pdf-viewer" ? "/chat" : item.route, item.prompt), {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
      const screenshotPath = path.join(SCREENSHOT_DIR, `${item.caseId}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/"));
    }

    const transcripts = sample.map(validateSampleItem);
    const failures = transcripts.filter((trace) => !trace.passed);
    const passed = failures.length === 0 && sample.length === 50 && plan.productionRolloutEnabled === false;
    writeJson("S_AI_ESTIMATE_50000_PHASE4_web_smoke.json", {
      wave: BUILT_IN_AI_50000_PHASE4_WAVE,
      final_status: passed ? "GREEN_AI_ESTIMATE_50000_PHASE4_WEB_CANARY_SMOKE_READY" : "BLOCKED_WEB_CANARY_SMOKE_FAILED",
      web_playwright_passed: passed,
      web_canary_cases_total: sample.length,
      web_canary_cases_passed: transcripts.length - failures.length,
      production_rollout_enabled: plan.productionRolloutEnabled,
      canary_initial_state: plan.canaryInitialState,
      screenshots,
      transcripts,
      failures,
      fake_green_claimed: false,
    });
    expect(sample).toHaveLength(50);
    expect(plan.productionRolloutEnabled).toBe(false);
    expect(failures).toEqual([]);
  });
});
