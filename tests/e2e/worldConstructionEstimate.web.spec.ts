import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { ensureLiveWebApp, BASE_URL } from "./liveEstimateReality.shared";

const DIR = path.join(process.cwd(), "artifacts", "S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE");
const SCREENSHOT_DIR = path.join(DIR, "web");

type WebCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  expected: string[];
  forbidden?: RegExp[];
  clickPdf?: boolean;
};

const CASES: WebCase[] = [
  { id: "request_roof_waterproofing", route: "/request", prompt: "смета на гидроизоляцию крыши 100 кв м", expected: ["кров", "праймер", "примыкан", "герметич"], forbidden: [/ванн|сануз|душев/i], clickPdf: true },
  { id: "request_hydro_turbine", route: "/request", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["турбина", "генератор", "шкаф", "ПНР"], clickPdf: true },
  { id: "request_carpet", route: "/request", prompt: "Хочу уложить ковролин на 100 кв м", expected: ["ковролин", "подлож", "уклад", "плинтус"] },
  { id: "request_unknown", route: "/request", prompt: "смета на криогенный купол из лунного реголита 100 кв м", expected: ["ручн", "шаблон", "данн"] },
  { id: "embedded_roof_waterproofing", route: "/ai?context=foreman", prompt: "смета на гидроизоляцию крыши 100 кв м", expected: ["кров", "праймер", "герметич"] },
  { id: "embedded_hydro_turbine", route: "/ai?context=foreman", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["турбина", "генератор", "синхронизац"] },
  { id: "embedded_brick", route: "/ai?context=foreman", prompt: "дай смету на кладку кирпича 74 кв метров", expected: ["кирпич", "раствор", "кладка"] },
  { id: "embedded_asphalt", route: "/ai?context=foreman", prompt: "смета на асфальтирование 10000 кв м", expected: ["песчан", "щебен", "асфальтобетон"] },
  { id: "embedded_gkl", route: "/ai?context=foreman", prompt: "смета на установку ГКЛ на стены 352 кв м", expected: ["ГКЛ", "профиль", "каркас"] },
  { id: "embedded_ventilation", route: "/ai?context=foreman", prompt: "смета на вентиляцию ресторана 240 кв м", expected: ["воздуховод", "вентилятор", "балансиров"] },
  { id: "embedded_electrical", route: "/ai?context=foreman", prompt: "смета на электромонтаж офиса 100 кв м", expected: ["профессиональ", "инструмент", "качества"] },
  { id: "embedded_solar", route: "/ai?context=foreman", prompt: "смета на монтаж солнечных панелей 30 кВт", expected: ["солнеч", "инвертор", "кабел"] },
  { id: "embedded_well", route: "/ai?context=foreman", prompt: "смета на бурение скважины 80 метров", expected: ["скваж", "обсад", "бурение"] },
  { id: "embedded_ambiguous_waterproofing", route: "/ai?context=foreman", prompt: "гидроизоляция 100 кв м", expected: ["уточ", "кровля", "ванная"] },
  { id: "embedded_dangerous_regulated", route: "/ai?context=foreman", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["турбина", "генератор", "допуск"] },
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

test.describe("world construction estimate live web", () => {
  test("renders professional table behavior for open-world construction prompts", async ({ page }) => {
    test.setTimeout(300_000);
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const transcripts: unknown[] = [];
    const screenshots: Record<string, string> = {};

    for (const testCase of CASES) {
      await openAndSubmit(page, testCase);
      await expect(page.getByText(new RegExp(testCase.expected[0], "i")).first()).toBeVisible({ timeout: 45_000 });
      const body = (await page.locator("body").textContent()) ?? "";
      const lower = body.toLocaleLowerCase("ru-RU");
      for (const token of testCase.expected) {
        expect(lower).toContain(token.toLocaleLowerCase("ru-RU"));
      }
      for (const forbidden of testCase.forbidden ?? []) {
        expect(body).not.toMatch(forbidden);
      }
      expect(body).not.toMatch(/^\s*(Строительные работы|Осмотр|Ремонтные работы)\s*$/m);
      if (!testCase.id.includes("unknown") && !testCase.id.includes("ambiguous")) {
        expect(body).toMatch(/PDF|Сделать PDF|Создать PDF/i);
        expect(body).toMatch(/Налог|НДС|tax|источник|уверенность|справочник|каталог/i);
      }

      const screenshot = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots[testCase.id] = path.relative(process.cwd(), screenshot).replace(/\\/g, "/");
      transcripts.push({ id: testCase.id, route: testCase.route, prompt: testCase.prompt, textSample: body.slice(0, 2400) });
    }

    writeWebArtifacts(transcripts, screenshots);
  });
});
