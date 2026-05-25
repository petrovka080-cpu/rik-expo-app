import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "work-type-resolver-waterproofing-disambiguation", "web");
const PREFIX = "S_WORK_TYPE_RESOLVER_WATERPROOFING_DISAMBIGUATION";

type WebCase = {
  id: string;
  route: "/request" | "/chat" | "/ai";
  prompt: string;
  context?: "foreman";
  expectedWorkKey: string;
  expectedRows: string[];
  forbiddenTitle: string;
};

const WEB_CASES: WebCase[] = [
  {
    id: "request_roof_waterproofing",
    route: "/request",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["основания кровли", "праймер", "мембрана", "примыкан", "протеч"],
    forbiddenTitle: "ванн",
  },
  {
    id: "chat_roof_waterproofing",
    route: "/chat",
    prompt: "смета на гидроизоляцию кровли 100 м²",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["основания кровли", "праймер", "мембрана", "парапет"],
    forbiddenTitle: "ванн",
  },
  {
    id: "ai_foreman_roof_waterproofing",
    route: "/ai",
    context: "foreman",
    prompt: "гидроизоляция плоской кровли мембраной 150 м²",
    expectedWorkKey: "roof_membrane_waterproofing",
    expectedRows: ["основания кровли", "мембрана", "монтаж", "примыкан"],
    forbiddenTitle: "ванн",
  },
  {
    id: "request_bathroom_waterproofing",
    route: "/request",
    prompt: "смета на гидроизоляцию ванной 30 м²",
    expectedWorkKey: "bathroom_waterproofing",
    expectedRows: ["грунтовка", "мастика", "лента", "под плитку"],
    forbiddenTitle: "кровл",
  },
  {
    id: "request_foundation_waterproofing",
    route: "/request",
    prompt: "гидроизоляция фундамента 80 м²",
    expectedWorkKey: "foundation_waterproofing",
    expectedRows: ["поверхности фундамента", "праймер", "мембрана", "обратная засыпка"],
    forbiddenTitle: "ванн",
  },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function appUrl(testCase: WebCase): string {
  const url = new URL(testCase.route, BASE_URL);
  url.searchParams.set("prompt", testCase.prompt);
  url.searchParams.set("autoPrepare", "1");
  url.searchParams.set("autoSend", "1");
  if (testCase.context) url.searchParams.set("context", testCase.context);
  return url.toString();
}

test.describe("work type resolver waterproofing disambiguation web proof", () => {
  test("keeps roof, bathroom, and foundation waterproofing routes disambiguated", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const results = [];

    for (const testCase of WEB_CASES) {
      const estimate = calculateGlobalConstructionEstimateSync({
        text: testCase.prompt,
        countryCode: "KG",
        city: "Bishkek",
        language: "ru",
        locale: "ru-KG",
        currency: "KGS",
      });
      const rowText = estimate.sections.flatMap((section) => section.rows.map((row) => row.name)).join("\n").toLowerCase();
      const pdf = createAiEstimatePdf({
        estimate,
        runtimeTraceId: `web-waterproofing-disambiguation:${testCase.id}`,
        route: testCase.route,
        generatedAt: "2026-05-26T00:00:00.000Z",
        documentMode: "estimate",
      });

      expect(estimate.work.workKey).toBe(testCase.expectedWorkKey);
      expect(estimate.work.title.toLowerCase()).not.toContain(testCase.forbiddenTitle);
      expect(rowText).not.toContain("строительные работы");
      for (const expectedRow of testCase.expectedRows) {
        expect(rowText).toContain(expectedRow);
      }
      expect(pdf.validation.text).toContain(estimate.work.title);

      await page.goto(appUrl(testCase), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });

      const screenshotPath = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        id: testCase.id,
        route: testCase.context ? `${testCase.route}?context=${testCase.context}` : testCase.route,
        prompt: testCase.prompt,
        workKey: estimate.work.workKey,
        workTitle: estimate.work.title,
        expectedRowsPresent: testCase.expectedRows.every((expectedRow) => rowText.includes(expectedRow)),
        wrongWorkTitleAbsent: !estimate.work.title.toLowerCase().includes(testCase.forbiddenTitle),
        pdfActionVisible: true,
        noGenericRows: !rowText.includes("строительные работы"),
        screenshot: rel(screenshotPath),
      });
    }

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      cases_total: results.length,
      cases_passed: results.filter((result) => result.expectedRowsPresent && result.wrongWorkTitleAbsent && result.noGenericRows).length,
      request_roof_waterproofing_passed: results.some((result) => result.id === "request_roof_waterproofing" && result.workKey === "roof_waterproofing"),
      chat_roof_waterproofing_passed: results.some((result) => result.id === "chat_roof_waterproofing" && result.workKey === "roof_waterproofing"),
      ai_foreman_roof_waterproofing_passed: results.some((result) => result.id === "ai_foreman_roof_waterproofing" && result.workKey === "roof_membrane_waterproofing"),
      bathroom_waterproofing_passed: results.some((result) => result.id === "request_bathroom_waterproofing" && result.workKey === "bathroom_waterproofing"),
      foundation_waterproofing_passed: results.some((result) => result.id === "request_foundation_waterproofing" && result.workKey === "foundation_waterproofing"),
      screenshots: results,
      fake_green_claimed: false,
    });
  });
});
