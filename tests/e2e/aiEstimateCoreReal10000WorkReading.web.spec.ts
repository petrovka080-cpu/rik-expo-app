import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";
import {
  AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR,
  INTERNAL_VISIBLE_PATTERN,
  MOJIBAKE_PATTERN,
  writeWaveJson,
} from "../../scripts/e2e/aiEstimateCoreReal10000Hardening.shared";
import { normalizeRuText } from "../../src/lib/text/encoding";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const CASE_COUNTS: Record<string, number> = {
  chromium: 8,
  firefox: 5,
  webkit: 5,
};

const WEB_SELECTED_WORK_KEYS = [
  "linoleum_laying",
  "paving_stone_laying",
  "metal_canopy_installation",
  "floor_screed",
  "drywall_partition",
  "electrical_wiring",
  "roof_waterproofing",
  "foundation_concrete",
] as const;

type TextInputState = {
  value: string;
  focused: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
};

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function artifactName(projectName: string): string {
  if (projectName === "chromium") return "web_chromium_results.json";
  if (projectName === "firefox") return "web_firefox_results.json";
  return "web_webkit_results.json";
}

function greenStatus(projectName: string): string {
  if (projectName === "chromium") return "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_CHROMIUM_READY";
  if (projectName === "firefox") return "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_FIREFOX_READY";
  return "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_WEBKIT_READY";
}

function selectedWorkCases(projectName: string) {
  const byKey = new Map(SELECTED_WORK_ENTERPRISE_1000_CASES.map((item) => [item.selectedWorkKey, item]));
  return WEB_SELECTED_WORK_KEYS.slice(0, CASE_COUNTS[projectName] ?? 5).map((key) => {
    const item = byKey.get(key);
    if (!item) throw new Error(`WEB_SELECTED_WORK_CASE_MISSING:${key}`);
    return item;
  });
}

function unitLabel(unit: string): string {
  if (unit === "sq_m") return "\u043c2";
  if (unit === "linear_m") return "\u043f\u043e\u0433.\u043c";
  if (unit === "m3") return "\u043c3";
  if (unit === "pcs") return "\u0448\u0442";
  if (unit === "set") return "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442";
  if (unit === "kg") return "\u043a\u0433";
  if (unit === "ton") return "\u0442\u043e\u043d\u043d";
  return unit;
}

function visibleText(value: string): string {
  return String(normalizeRuText(value) ?? "").replace(/\s+/g, " ").trim();
}

function forbiddenVisibleFound(text: string): boolean {
  return INTERNAL_VISIBLE_PATTERN.test(text) ||
    MOJIBAKE_PATTERN.test(text) ||
    /\b(fake|mock|demo)_?(price|supplier|catalog)\b/i.test(text) ||
    /\uFFFD/.test(text);
}

async function activeInputState(page: Page): Promise<TextInputState> {
  return page.getByTestId("consumer-repair-problem-input").evaluate((node) => {
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    return {
      value: input.value,
      focused: document.activeElement === input,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    };
  });
}

async function estimateSurfaceText(page: Page): Promise<string> {
  const parts = [
    await page.getByTestId("consumer-repair-problem-input").inputValue(),
    await page.getByTestId("request-estimate-summary-card").textContent({ timeout: 30_000 }),
    await page.getByTestId("request-estimate-items-editor").textContent({ timeout: 30_000 }),
    await page.locator("[data-testid^='consumer-repair-item-catalog-']").allTextContents(),
  ];
  return visibleText(parts.flat().filter(Boolean).join(" "));
}

function readArtifact(name: string): Record<string, unknown> | null {
  const filePath = path.join(AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function writeWebAggregate(): void {
  const chromium = readArtifact("web_chromium_results.json");
  const firefox = readArtifact("web_firefox_results.json");
  const webkit = readArtifact("web_webkit_results.json");
  const passed =
    chromium?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_CHROMIUM_READY" &&
    firefox?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_FIREFOX_READY" &&
    webkit?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_WEBKIT_READY";
  writeWaveJson("web_results.json", {
    final_status: passed
      ? "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_ALL_BROWSERS_READY"
      : "PARTIAL_AI_ESTIMATE_CORE_REAL_10000_WEB_BROWSER_PROOF",
    web_chromium_passed: chromium?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_CHROMIUM_READY",
    web_firefox_passed: firefox?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_FIREFOX_READY",
    web_webkit_passed: webkit?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_WEB_WEBKIT_READY",
    failures: [],
  });
}

test.describe("AI estimate core real 10000 work-reading web proof", () => {
  test.setTimeout(420_000);

  test("selects real work, appends quantity, builds BOQ, exposes PDF and catalog binding", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const rows = [];
    const cases = selectedWorkCases(testInfo.project.name);

    for (const testCase of cases) {
      await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

      await page.getByTestId("consumer-repair-problem-input").fill(testCase.smartSearchInput);
      await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
      const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
      const suggestionTexts = await suggestions.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
      const selectedIndex = suggestionTexts.findIndex((text) => visibleText(text).includes(testCase.selectedTitleRu));
      expect(selectedIndex).toBeGreaterThanOrEqual(0);
      await suggestions.nth(selectedIndex).click();

      await expect.poll(async () => (await activeInputState(page)).focused, { timeout: 10_000 }).toBe(true);
      const selectedState = await activeInputState(page);
      expect(visibleText(selectedState.value)).toContain(testCase.selectedTitleRu);
      expect(selectedState.selectionStart).toBe(selectedState.value.length);
      expect(selectedState.selectionEnd).toBe(selectedState.value.length);

      const quantityText = `${testCase.volume} ${unitLabel(testCase.unit)}`;
      await page.getByTestId("consumer-repair-problem-input").type(quantityText);
      const typedState = await activeInputState(page);
      expect(visibleText(typedState.value)).toContain(testCase.selectedTitleRu);
      expect(typedState.value).toContain(quantityText);

      await page.getByTestId("consumer-repair-prepare-draft").click();
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("[data-testid^='consumer-repair-item-']").first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").first()).toBeVisible({ timeout: 30_000 });

      expect(forbiddenVisibleFound(await estimateSurfaceText(page))).toBe(false);

      const catalogButton = page.locator("[data-testid^='consumer-repair-item-catalog-']").first();
      await catalogButton.click();
      await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
      const catalogQuery = await page.getByTestId("request-catalog-picker-search").inputValue();
      expect(catalogQuery).toMatch(/[\u0400-\u04ff]/);
      expect(forbiddenVisibleFound(catalogQuery)).toBe(false);

      rows.push({
        id: testCase.id,
        selectedWorkKey: testCase.selectedWorkKey,
        selectedTitleRu: testCase.selectedTitleRu,
        quantityText,
        suggestionClicked: true,
        quantityAppendWorks: true,
        estimateBuilds: true,
        boqVisible: true,
        pdfActionVisible: true,
        catalogBindingVisible: true,
        internalKeysVisible: 0,
        mojibakeFound: 0,
      });
    }

    writeWaveJson(artifactName(testInfo.project.name), {
      final_status: greenStatus(testInfo.project.name),
      browser_project: testInfo.project.name,
      real_selected_work_cases: rows.length,
      selected_work_works: true,
      quantity_append_works: true,
      estimate_builds: true,
      boq_visible: true,
      pdf_action_visible: true,
      catalog_binding_visible: true,
      internal_keys_visible: 0,
      mojibake_found: 0,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
      rows,
      failures: [],
    });
    writeWebAggregate();
  });
});
