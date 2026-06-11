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

const VIEWPORTS = [
  {
    id: "mobile",
    width: 390,
    height: 844,
    artifact: "responsive_mobile_results.json",
    status: "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_MOBILE_READY",
  },
  {
    id: "tablet",
    width: 834,
    height: 1112,
    artifact: "responsive_tablet_results.json",
    status: "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_TABLET_READY",
  },
] as const;

const RESPONSIVE_SELECTED_WORK_KEYS = [
  "facade_insulation",
  "ceramic_tile_laying",
  "plumbing_basic",
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

function selectedWorkCases() {
  const byKey = new Map(SELECTED_WORK_ENTERPRISE_1000_CASES.map((item) => [item.selectedWorkKey, item]));
  return RESPONSIVE_SELECTED_WORK_KEYS.map((key) => {
    const item = byKey.get(key);
    if (!item) throw new Error(`RESPONSIVE_SELECTED_WORK_CASE_MISSING:${key}`);
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

function writeResponsiveAggregate(): void {
  const mobile = readArtifact("responsive_mobile_results.json");
  const tablet = readArtifact("responsive_tablet_results.json");
  const passed =
    mobile?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_MOBILE_READY" &&
    tablet?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_TABLET_READY";
  writeWaveJson("responsive_results.json", {
    final_status: passed
      ? "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_READY"
      : "PARTIAL_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_PROOF",
    responsive_mobile_passed: mobile?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_MOBILE_READY",
    responsive_tablet_passed: tablet?.final_status === "GREEN_AI_ESTIMATE_CORE_REAL_10000_RESPONSIVE_TABLET_READY",
    failures: [],
  });
}

test.describe("AI estimate core real 10000 responsive work-reading proof", () => {
  test.setTimeout(420_000);

  test("keeps selected work, quantity append, BOQ, PDF and catalog visible on mobile/tablet", async ({ page }, testInfo) => {
    await ensureLiveWebApp();

    for (const viewport of VIEWPORTS) {
      const rows = [];
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const testCase of selectedWorkCases()) {
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
        const quantityText = `${testCase.volume} ${unitLabel(testCase.unit)}`;
        await page.getByTestId("consumer-repair-problem-input").type(quantityText);
        const typedState = await activeInputState(page);
        expect(visibleText(typedState.value)).toContain(testCase.selectedTitleRu);
        expect(typedState.value).toContain(quantityText);

        await page.getByTestId("consumer-repair-prepare-draft").click();
        await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
        await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible({ timeout: 30_000 });
        await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").first()).toBeVisible({ timeout: 30_000 });

        expect(forbiddenVisibleFound(await estimateSurfaceText(page))).toBe(false);

        rows.push({
          id: testCase.id,
          viewport: viewport.id,
          browser_project: testInfo.project.name,
          selectedWorkKey: testCase.selectedWorkKey,
          quantityAppendWorks: true,
          estimateBuilds: true,
          boqVisible: true,
          pdfActionVisible: true,
          catalogBindingVisible: true,
          internalKeysVisible: 0,
          mojibakeFound: 0,
        });
      }

      writeWaveJson(viewport.artifact, {
        final_status: viewport.status,
        browser_project: testInfo.project.name,
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        selected_work_works: true,
        quantity_append_works: true,
        estimate_builds: true,
        boq_visible: true,
        pdf_action_visible: true,
        catalog_binding_visible: true,
        internal_keys_visible: 0,
        mojibake_found: 0,
        rows,
        failures: [],
      });
      writeResponsiveAggregate();
    }
  });
});
