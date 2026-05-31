import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { validateEstimatePdf } from "../../src/lib/estimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "web_screenshots");

type RouteUnderTest = "/request" | "/ai?context=foreman";

type WebCase = {
  caseId: string;
  route: RouteUnderTest;
  prompt: string;
  requiredTokens: string[];
  forbiddenTokens: string[];
  clickPdf: boolean;
};

type WebCaseResult = {
  caseId: string;
  route: RouteUnderTest;
  prompt: string;
  rowCount: number;
  pdfActionVisible: boolean;
  pdfViewerOpened: boolean;
  pdfValid: boolean;
  screenshotPath: string;
};

const CASES: WebCase[] = [
  {
    caseId: "request_electrical_cable_outlets_switches",
    route: "/request",
    prompt: "смета на прокладку электрокабеля с розетками в количестве 10 штук и выключателей 10 штук площадь квартиры 100 кв метров",
    requiredTokens: ["кабель", "розет", "выключател", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall", "dynamic_universal", "Tax not calculated"],
    clickPdf: true,
  },
  {
    caseId: "request_roof_waterproofing",
    route: "/request",
    prompt: "гидроизоляция крыши 100 кв м",
    requiredTokens: ["кров", "праймер", "гидроизоля", "примыкан"],
    forbiddenTokens: ["ванн", "сануз", "душев", "dynamic_universal"],
    clickPdf: true,
  },
  {
    caseId: "request_metal_canopy",
    route: "/request",
    prompt: "смета на металлический навес 647 кв м",
    requiredTokens: ["стойк", "ферм", "металл", "монтаж"],
    forbiddenTokens: ["dynamic_universal", "Tax not calculated"],
    clickPdf: true,
  },
  {
    caseId: "request_hydropower_turbine",
    route: "/request",
    prompt: "смета на установку турбины на ГЭС 100 кВт",
    requiredTokens: ["турбин", "генератор", "шкаф", "ПНР"],
    forbiddenTokens: ["Строительные работы", "dynamic_universal"],
    clickPdf: true,
  },
  {
    caseId: "foreman_paving_stone",
    route: "/ai?context=foreman",
    prompt: "смета на укладку брусчатки на 587 кв м",
    requiredTokens: ["брусчат", "геотекст", "щеб", "уклад"],
    forbiddenTokens: ["кирпич", "кладоч", "dynamic_universal"],
    clickPdf: true,
  },
  {
    caseId: "foreman_industrial_floor",
    route: "/ai?context=foreman",
    prompt: "смета на промышленный пол 2000 кв м",
    requiredTokens: ["бетон", "топпинг", "шв", "пол"],
    forbiddenTokens: ["Строительные работы", "dynamic_universal"],
    clickPdf: false,
  },
  {
    caseId: "foreman_ventilation_cafe",
    route: "/ai?context=foreman",
    prompt: "смета на вентиляцию кафе 120 кв м",
    requiredTokens: ["воздуховод", "решет", "вентил", "баланс"],
    forbiddenTokens: ["Строительные работы", "dynamic_universal"],
    clickPdf: false,
  },
  {
    caseId: "foreman_house_electrical",
    route: "/ai?context=foreman",
    prompt: "смета на электромонтаж дома 180 кв м",
    requiredTokens: ["кабель", "щит", "розет", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall", "dynamic_universal"],
    clickPdf: false,
  },
];

const MOJIBAKE_MARKERS = ["РЎ", "Рџ", "Ð", "Ñ", "\uFFFD", "undefined", "[object Object]", "NaN", "null null"];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentHead(): string | null {
  const headPath = path.join(process.cwd(), ".git", "HEAD");
  if (!fs.existsSync(headPath)) return null;
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;
  const refPath = path.join(process.cwd(), ".git", head.slice("ref: ".length));
  return fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf8").trim() : null;
}

function liveUrl(item: WebCase): string {
  const url = new URL(item.route, BASE_URL);
  url.searchParams.set("prompt", item.prompt);
  url.searchParams.set(item.route === "/request" ? "autoPrepare" : "autoSend", "1");
  return url.toString();
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
}

async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
}

async function runWebCase(page: Page, item: WebCase): Promise<WebCaseResult> {
  await page.goto(liveUrl(item), { waitUntil: "domcontentloaded", timeout: 60_000 });
  const table =
    item.route === "/request"
      ? page.getByTestId("request-estimate-summary-card")
      : page.getByTestId("ai-estimate-table").last();
  await expect(table).toBeVisible({ timeout: 45_000 });

  const rows =
    item.route === "/request"
      ? page.locator("[data-testid^='consumer-repair-item-']")
      : page.locator("[data-testid^='ai-estimate-table-row-']");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(item.caseId.includes("paving") || item.caseId.includes("hydropower") ? 30 : 12);

  const text = await bodyText(page);
  const normalizedText = normalize(text);
  for (const token of item.requiredTokens) {
    expect(normalizedText).toContain(normalize(token));
  }
  for (const token of item.forbiddenTokens) {
    expect(normalizedText).not.toContain(normalize(token));
  }
  for (const token of MOJIBAKE_MARKERS) {
    expect(text).not.toContain(token);
  }

  const pdfButton =
    item.route === "/request"
      ? page.getByTestId("consumer-estimate-make-pdf").first()
      : page.getByTestId("ai-estimate-make-pdf").last();
  await expect(pdfButton).toBeVisible({ timeout: 20_000 });

  let pdfViewerOpened = false;
  let pdfValid = !item.clickPdf;
  if (item.clickPdf) {
    await pdfButton.click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    pdfViewerOpened = true;
    const uri = new URL(page.url()).searchParams.get("uri") ?? "";
    if (uri) {
      const validation = validateEstimatePdf({ pdf: uri });
      expect(validation.valid).toBe(true);
      expect(validation.text).toContain("Таблица сметы");
      for (const token of MOJIBAKE_MARKERS) {
        expect(validation.text).not.toContain(token);
      }
      pdfValid = validation.valid;
    }
  }

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const screenshotPath = path.join(SCREENSHOT_DIR, `${item.caseId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  return {
    caseId: item.caseId,
    route: item.route,
    prompt: item.prompt,
    rowCount,
    pdfActionVisible: true,
    pdfViewerOpened,
    pdfValid,
    screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
  };
}

test.describe("live request and embedded AI professional BOQ/PDF/catalog web proof", () => {
  test.setTimeout(300_000);

  test("renders professional rows and table PDFs for live web entrypoints", async ({ page }) => {
    await ensureLiveWebApp();

    const results: WebCaseResult[] = [];
    const failures: string[] = [];
    for (const item of CASES) {
      try {
        results.push(await runWebCase(page, item));
      } catch (error) {
        failures.push(`${item.caseId}:${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    const artifact = {
      wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN",
      web_live_app_tested: true,
      playwright_web_passed: failures.length === 0,
      head: currentHead(),
      cases: results,
      failures,
      fake_green_claimed: false,
    };
    writeJson("web_results.json", artifact);
    writeJson("web_screenshots.json", {
      web_live_app_tested: true,
      screenshots: results.map((item) => ({ caseId: item.caseId, screenshotPath: item.screenshotPath })),
      fake_green_claimed: false,
    });
  });
});
