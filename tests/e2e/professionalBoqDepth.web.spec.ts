import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import {
  calculateGlobalConstructionEstimateSync,
  formatRequestEstimateSummary,
  validateEstimateBoqDepth,
  validateProfessionalEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { BASE_URL, REALITY_CASES, assertRealityCase, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "professional-boq-depth");
const PREFIX = "S_GLOBAL_ESTIMATE_BOQ_DEPTH";
const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(prompt: string): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

function backendCase(workKey: string, volume: number, unit = "sq_m") {
  const estimate = calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const depth = validateEstimateBoqDepth(estimate);
  const formula = validateProfessionalEstimateFormulaQuality(estimate);
  expect(depth.passed).toBe(true);
  expect(formula.passed).toBe(true);
  return { estimate, depth, formula };
}

test.describe("global estimate professional BOQ depth", () => {
  test("validates live web routes without short estimates or raw backend text", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const foundation = calculateGlobalConstructionEstimateSync({
      text: FOUNDATION_PROMPT,
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const foundationDepth = validateEstimateBoqDepth(foundation);
    const foundationFormula = validateProfessionalEstimateFormulaQuality(foundation);
    expect(foundation.work.workKey).toBe("strip_foundation");
    expect(foundation.input.dimensions?.concreteVolumeM3).toBe(32.64);
    expect(foundationDepth.actualRows).toBeGreaterThanOrEqual(12);
    expect(foundationFormula.passed).toBe(true);

    await page.goto(requestUrl(FOUNDATION_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    let bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    const itemCount = await page.locator("[data-testid^='consumer-repair-item-']").count();
    expect(itemCount).toBeGreaterThanOrEqual(12);
    expect(bodyText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
    expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    expect(bodyText).not.toContain("Строительные работы");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_foundation.png"), fullPage: true });

    const liveTranscripts = [
      await assertRealityCase(page, REALITY_CASES.brick_masonry),
      await assertRealityCase(page, REALITY_CASES.gable_roof_installation),
      await assertRealityCase(page, REALITY_CASES.asphalt_paving),
    ];

    const tile = backendCase("ceramic_tile_floor_laying", 174);
    const gkl = backendCase("drywall_partition", 352);
    const tileDraft = buildConsumerRepairAiDraft("смета на укладку кафельной плитки 174 м²");
    const gklDraft = buildConsumerRepairAiDraft("смета на установку ГКЛ 352 м²");
    expect(tileDraft.items.length).toBeGreaterThanOrEqual(8);
    expect(gklDraft.items.length).toBeGreaterThanOrEqual(10);

    await page.goto(requestUrl("смета на укладку кафельной плитки 174 м²"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_tile.png"), fullPage: true });

    await page.goto(requestUrl("смета на установку ГКЛ 352 м²"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_gkl.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      screenshots: {
        request_foundation: "artifacts/screenshots/professional-boq-depth/request_foundation.png",
        request_tile: "artifacts/screenshots/professional-boq-depth/request_tile.png",
        request_gkl: "artifacts/screenshots/professional-boq-depth/request_gkl.png",
        live_routes: liveTranscripts.map((item) => item.screenshotPath),
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      web_playwright_passed: true,
      routes: ["/request", "/chat", "/ai?context=foreman"],
      foundation: {
        prompt: FOUNDATION_PROMPT,
        summary: formatRequestEstimateSummary(foundation),
        rowCount: foundationDepth.actualRows,
        concreteVolumeM3: foundation.input.dimensions?.concreteVolumeM3,
      },
      tile: { rowCount: tile.depth.actualRows, workKey: tile.estimate.work.workKey },
      gkl: { rowCount: gkl.depth.actualRows, workKey: gkl.estimate.work.workKey },
      liveTranscripts,
      fake_green_claimed: false,
    });
  });
});
