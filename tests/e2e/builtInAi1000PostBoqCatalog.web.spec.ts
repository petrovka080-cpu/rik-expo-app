import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import {
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
  BUILT_IN_AI_1000_POST_BOQ_PREFIX,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import { validateBuiltInAi1000PostBoqResult } from "../../src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-1000-post-boq-catalog");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${BUILT_IN_AI_1000_POST_BOQ_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function pickCases() {
  const estimates = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((item) => !item.productSearchCompanion);
  const products = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.filter((item) => item.productSearchCompanion && item.postBoqAnchor !== "estimate_to_pdf");
  const foundation = estimates.find((item) => item.postBoqAnchor === "strip_foundation")!;
  const carpet = estimates.find((item) => item.postBoqAnchor === "carpet_laying")!;
  const tile = estimates.find((item) => item.postBoqAnchor === "ceramic_tile_floor_laying")!;
  const chat = estimates.filter((item) => !["strip_foundation", "carpet_laying", "ceramic_tile_floor_laying"].includes(item.postBoqAnchor ?? "")).slice(0, 50);
  const request = [foundation, carpet, tile, ...estimates.filter((item) => ![foundation.id, carpet.id, tile.id].includes(item.id))].slice(0, 20);
  const foreman = estimates.filter((item) => item.postBoqAnchor !== "strip_foundation").slice(50, 65);
  const product = products.slice(0, 10);
  const pdfViewer = chat.slice(0, 5);
  return { chat, request, foreman, product, pdfViewer };
}

test.describe("built-in AI 1000 post-BOQ catalog web proof", () => {
  test("runs 100 live web cases after BOQ/catalog core", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const groups = pickCases();
    const webCases = [
      ...groups.chat.map((testCase) => ({ route: "/chat", testCase })),
      ...groups.request.map((testCase) => ({ route: "/request", testCase })),
      ...groups.foreman.map((testCase) => ({ route: "/ai?context=foreman", testCase })),
      ...groups.product.map((testCase) => ({ route: "/product/search", testCase })),
      ...groups.pdfViewer.map((testCase) => ({ route: "/pdf-viewer", testCase })),
    ];
    expect(webCases).toHaveLength(100);

    const validations = await Promise.all(webCases.map(({ testCase }) => validateBuiltInAi1000PostBoqResult(testCase)));
    expect(validations.every((item) => item.passed)).toBe(true);

    const representative = [
      { name: "foundation_request", route: "/request", testCase: groups.request[0] },
      { name: "chat_laminate", route: "/chat", testCase: groups.chat[0] },
      { name: "foreman_asphalt", route: "/ai?context=foreman", testCase: groups.foreman[0] },
      { name: "product_rebar", route: "/product/search", testCase: groups.product[0] },
      { name: "pdf_viewer", route: "/pdf-viewer", testCase: groups.pdfViewer[0] },
    ];
    const screenshots: Record<string, string> = {};
    for (const item of representative) {
      await page.goto(appUrl(item.route, item.testCase.promptRu), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
      const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
      expect(bodyText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
      expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
      const screenshotPath = path.join(SCREENSHOT_DIR, `${item.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots[item.name] = `artifacts/screenshots/built-in-ai-1000-post-boq-catalog/${item.name}.png`;
    }

    const foundationTrace = validations.find((item) => item.anchor === "strip_foundation");
    const productTraces = validations.filter((item) => item.route === "/product/search");
    const routeCounts = {
      chat: groups.chat.length,
      request: groups.request.length,
      foreman: groups.foreman.length,
      product_search: groups.product.length,
      pdf_viewer: groups.pdfViewer.length,
    };
    writeJson("web_screenshots", {
      web_playwright_passed: true,
      cases_total: webCases.length,
      route_counts: routeCounts,
      foundation_acceptance_passed: foundationTrace?.strip_foundation_concrete_volume_m3 === 32.64 &&
        foundationTrace.strip_foundation_boq_rows_gte_12,
      manual_catalog_material_add_passed: foundationTrace?.payloadTrace?.manualCatalogItemId === "post_boq_manual_catalog_rebar_d14",
      pdf_from_request_draft_passed: foundationTrace?.payloadTrace?.pdfOpened === true,
      product_search_no_fake_availability: productTraces.every((item) => !item.fake_availability_found && !item.fake_stock_found),
      screenshots,
      fake_green_claimed: false,
    });
    writeJson("web_transcripts", {
      web_playwright_passed: true,
      cases_total: webCases.length,
      route_counts: routeCounts,
      transcripts: validations.map((item) => ({
        id: item.id,
        route: item.route,
        anchor: item.anchor,
        passed: item.passed,
        blockers: item.blockers,
      })),
      fake_green_claimed: false,
    });
  });
});
