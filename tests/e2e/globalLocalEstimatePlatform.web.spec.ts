import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_GLOBAL_LOCAL_ESTIMATE_PLATFORM");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "web");

type GlobalLocalWebCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  mode: "estimate" | "missing_location" | "ambiguous";
  workTokens: string[];
  localTokens: string[];
  minWorkMatches?: number;
  minLocalMatches?: number;
};

const CASES: GlobalLocalWebCase[] = [
  {
    id: "request_hydro_turbine_kyrgyzstan",
    route: "/request",
    prompt: "смета на установку турбины на ГЭС 100 кВт в Кыргызстане, Бишкек",
    mode: "estimate",
    workTokens: ["турбина", "генератор", "шкаф", "ПНР", "кабель"],
    localTokens: ["Кыргызстан", "Бишкек", "KGS", "НДС", "источник", "валюта"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "request_roof_waterproofing_bishkek",
    route: "/request",
    prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке",
    mode: "estimate",
    workTokens: ["кров", "праймер", "гидроизоляц", "мембран", "примыкан"],
    localTokens: ["Бишкек", "KGS", "регион", "налог", "источник", "точность"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "request_missing_location_brick",
    route: "/request",
    prompt: "смета на кладку кирпича 74 кв метров",
    mode: "missing_location",
    workTokens: ["кирпич", "раствор", "кладк", "армирован"],
    localTokens: ["регион не указан", "уточните", "страна", "город", "ориентировоч"],
    minWorkMatches: 3,
    minLocalMatches: 2,
  },
  {
    id: "embedded_asphalt_almaty",
    route: "/ai?context=foreman",
    prompt: "смета на асфальтирование 10000 кв м в Алматы",
    mode: "estimate",
    workTokens: ["песок", "щеб", "битум", "асфальтобетон", "уплотн"],
    localTokens: ["Алматы", "KZT", "Казахстан", "VAT", "источник", "валюта"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "embedded_drywall_austin",
    route: "/ai?context=foreman",
    prompt: "estimate for drywall installation on 1200 sq ft in Austin Texas",
    mode: "estimate",
    workTokens: ["drywall", "profile", "frame", "fastener", "joint"],
    localTokens: ["Austin", "Texas", "USD", "sales tax", "source", "currency"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "embedded_ambiguous_waterproofing_no_location",
    route: "/ai?context=foreman",
    prompt: "гидроизоляция 100 кв м",
    mode: "ambiguous",
    workTokens: ["уточ", "кров", "ванн", "фундамент"],
    localTokens: ["регион", "город", "страна", "уточните"],
    minWorkMatches: 3,
    minLocalMatches: 2,
  },
];

const forbiddenGenericRows = [
  /^Строительные работы$/im,
  /^Осмотр$/im,
  /^Ремонтные работы$/im,
  /^Материалы по согласованию$/im,
  /^Работы по согласованию$/im,
  /^Construction work$/im,
  /^Repair work$/im,
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function tokenMatches(text: string, tokens: string[]): number {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return tokens.filter((token) => normalized.includes(token.toLocaleLowerCase("ru-RU"))).length;
}

function routeUrl(testCase: GlobalLocalWebCase): string {
  if (testCase.route === "/request") {
    return new URL("/request", BASE_URL).toString();
  }
  const url = new URL("/ai", BASE_URL);
  url.searchParams.set("context", "foreman");
  return url.toString();
}

async function openAndSubmit(page: Page, testCase: GlobalLocalWebCase): Promise<void> {
  await page.goto(routeUrl(testCase), { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (testCase.route === "/request") {
    await page.getByTestId("consumer-repair-problem-input").fill(testCase.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    return;
  }
  await page.getByTestId("ai.assistant.input").fill(testCase.prompt);
  await page.getByTestId("ai.assistant.send").click();
}

test.describe("global local estimate platform live web", () => {
  test("shows local context, currency, tax/source warning, catalog policy, and PDF action", async ({ page }) => {
    test.setTimeout(300_000);
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const transcripts: Array<Record<string, unknown>> = [];
    const screenshots: Record<string, string> = {};

    for (const testCase of CASES) {
      await openAndSubmit(page, testCase);
      await page.waitForTimeout(testCase.mode === "estimate" ? 4500 : 2500);
      const text = (await page.locator("body").textContent({ timeout: 45_000 })) ?? "";
      const workMatches = tokenMatches(text, testCase.workTokens);
      const localMatches = tokenMatches(text, testCase.localTokens);

      expect(workMatches).toBeGreaterThanOrEqual(testCase.minWorkMatches ?? testCase.workTokens.length);
      expect(localMatches).toBeGreaterThanOrEqual(testCase.minLocalMatches ?? testCase.localTokens.length);
      for (const forbidden of forbiddenGenericRows) {
        expect(text).not.toMatch(forbidden);
      }
      expect(text).toMatch(/каталог|catalog|catalog gap|нет локального кандидата|источник|source|confidence|уверенн/i);
      expect(text).toMatch(/налог|НДС|VAT|GST|sales tax|tax|валюта|currency|KGS|KZT|USD/i);
      if (testCase.mode === "estimate") {
        expect(text).toMatch(/PDF|Сделать PDF|Создать PDF/i);
      }

      const screenshot = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots[testCase.id] = path.relative(process.cwd(), screenshot).replace(/\\/g, "/");
      transcripts.push({
        id: testCase.id,
        route: testCase.route,
        mode: testCase.mode,
        prompt: testCase.prompt,
        workMatches,
        localMatches,
        textSample: text.slice(0, 2400),
      });
    }

    writeJson("web_screenshots", {
      screenshots,
      transcripts,
      web_screenshots_real: Object.keys(screenshots).length === CASES.length,
    });
    writeJson("web_results", {
      web_live_app_tested: true,
      playwright_web_passed: true,
      web_screenshots_real: Object.keys(screenshots).length === CASES.length,
      local_context_visible_all: transcripts.every((item) => Number(item.localMatches) >= 2),
      fake_green_claimed: false,
    });
  });
});
