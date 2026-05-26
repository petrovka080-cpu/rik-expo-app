import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { ensureLiveWebApp, BASE_URL } from "./liveEstimateReality.shared";

const DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");
const SCREENSHOT_DIR = path.join(DIR, "web");

type WebCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  expected: string[];
};

const CASES: WebCase[] = [
  { id: "request_laminate", route: "/request", prompt: "Хочу уложить ламинат на 100 кв м", expected: ["Ламинат", "Подложка", "Укладка"] },
  { id: "request_hydro_turbine", route: "/request", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["Турбина", "Генератор", "ПНР"] },
  { id: "request_roof_waterproofing", route: "/request", prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м", expected: ["кров", "Праймер", "примыкан"] },
  { id: "embedded_ai_windows", route: "/ai?context=foreman", prompt: "дай мне смету на установки окон", expected: ["Оконный блок", "Подоконник", "Герметизация"] },
  { id: "embedded_ai_brick", route: "/ai?context=foreman", prompt: "дай смету на кладку кирпича 74 кв метров", expected: ["Кирпич", "Раствор", "Кладка"] },
  { id: "embedded_ai_gable_roof", route: "/ai?context=foreman", prompt: "дай смету на устройство двускатной крыши основание 100 кв метров", expected: ["Стропила", "Мауэрлат", "Кровельное"] },
  { id: "embedded_ai_gkl", route: "/ai?context=foreman", prompt: "смета на установку ГКЛ на стены 352 кв м", expected: ["Листы ГКЛ", "Направляющий профиль", "Обшивка ГКЛ"] },
  { id: "embedded_ai_asphalt", route: "/ai?context=foreman", prompt: "смета на асфальтирование 10000 кв м", expected: ["Песчаное", "Щебеночное", "асфальтобетон"] },
];

function writeWebArtifacts(transcripts: unknown[], screenshots: Record<string, string>): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, "web_screenshots.json"), `${JSON.stringify({ screenshots, transcripts }, null, 2)}\n`, "utf8");
}

async function openAndSubmit(page: Page, testCase: WebCase): Promise<void> {
  if (testCase.route === "/request") {
    await page.goto(new URL("/request", BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(testCase.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    return;
  }

  const url = new URL("/ai", BASE_URL);
  url.searchParams.set("context", "foreman");
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("ai.assistant.input").fill(testCase.prompt);
  await page.getByTestId("ai.assistant.send").click();
}

test.describe("B2C request and embedded AI expanded estimate binding", () => {
  test("renders expanded structured estimates on the two live web entrypoints", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const transcripts: unknown[] = [];
    const screenshots: Record<string, string> = {};

    for (const testCase of CASES) {
      await openAndSubmit(page, testCase);
      await expect(page.getByText(new RegExp(testCase.expected[0], "i")).first()).toBeVisible({ timeout: 45_000 });
      const body = (await page.locator("body").textContent()) ?? "";
      for (const token of testCase.expected) {
        expect(body.toLocaleLowerCase("ru-RU")).toContain(token.toLocaleLowerCase("ru-RU"));
      }
      expect(body).not.toContain("Ремонтные работы после согласования");
      expect(body).not.toMatch(/(^|\n)\s*Строительные работы\s*(\n|$)/);
      expect(body).toMatch(/PDF|Сделать PDF/);
      expect(body).toMatch(/Налог|НДС|tax|Источники|Справочник|Configured/i);

      const screenshot = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots[testCase.id] = path.relative(process.cwd(), screenshot).replace(/\\/g, "/");
      transcripts.push({ id: testCase.id, route: testCase.route, prompt: testCase.prompt, textSample: body.slice(0, 2000) });
    }

    writeWebArtifacts(transcripts, screenshots);
  });
});
