import fs from "node:fs";
import path from "node:path";
import { test } from "playwright/test";

import {
  REALITY_CASES,
  assertRealityCase,
  backendTraceFor,
  ensureLiveWebApp,
  type RealityCase,
  type WebTranscript,
} from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "ai-route-parity");
const ROUTES: readonly RealityCase["route"][] = ["/chat", "/ai?context=foreman", "/request"] as const;
const CASES: readonly RealityCase[] = [
  REALITY_CASES.asphalt_paving,
  REALITY_CASES.carpet_laying,
  REALITY_CASES.drywall_gkl,
  REALITY_CASES.gable_roof_installation,
  REALITY_CASES.brick_masonry,
] as const;

function routeKey(route: RealityCase["route"]): string {
  if (route === "/ai?context=foreman") return "ai_foreman";
  return route.replace("/", "");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(900_000);

test("runs estimate route parity through live web routes", async ({ page }) => {
  await ensureLiveWebApp();
  const transcripts: Array<WebTranscript & { parityRoute: string; parityScreenshotPath: string }> = [];
  const traces: unknown[] = [];

  for (const route of ROUTES) {
    for (const testCase of CASES) {
      const routedCase: RealityCase = { ...testCase, route };
      const clickPdf = testCase.id === "asphalt_paving";
      const transcript = await assertRealityCase(page, routedCase, { clickPdf });
      const parityScreenshotPath = path.join(SCREENSHOT_DIR, `${testCase.id}_${routeKey(route)}${clickPdf ? "_pdf" : ""}.png`);
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: parityScreenshotPath, fullPage: true });
      transcripts.push({ ...transcript, parityRoute: routeKey(route), parityScreenshotPath });
      traces.push({
        id: testCase.id,
        route,
        prompt: testCase.prompt,
        trace: backendTraceFor(routedCase),
      });
    }
  }

  writeJson("S_AI_ROUTE_PARITY_web_transcripts.json", {
    wave: "S_AI_ROUTE_PARITY_CHAT_FOREMAN_REQUEST_POINT_OF_NO_RETURN",
    web_playwright_passed: true,
    routes: ROUTES,
    cases: CASES.map((testCase) => testCase.id),
    transcripts,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ROUTE_PARITY_route_trace.json", {
    wave: "S_AI_ROUTE_PARITY_CHAT_FOREMAN_REQUEST_POINT_OF_NO_RETURN",
    traces,
    fake_green_claimed: false,
  });
});
