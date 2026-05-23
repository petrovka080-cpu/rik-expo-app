import fs from "node:fs";
import path from "node:path";
import { test, expect } from "playwright/test";

import { validateEstimatePdf } from "../../src/lib/estimatePdf";

const BASE_URL = process.env.LIVE_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL || "http://127.0.0.1:8081";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const WEB_ARTIFACT = path.join(ARTIFACT_DIR, "S_LIVE_AI_ESTIMATE_PDF_REALITY_web_screenshots.json");

type UiCase = {
  id: string;
  path: string;
  prompt: string;
  tokens: string[];
};

const AI_CASES: UiCase[] = [
  {
    id: "asphalt",
    path: "/ai?context=foreman",
    prompt: "сделай мне смету на асфальтирование на 1000 кв м",
    tokens: ["Песчаное основание", "Щебеночное основание", "Битумная эмульсия", "асфальтобетона", "Мобилизация техники"],
  },
  {
    id: "gkl",
    path: "/ai?context=foreman",
    prompt: "смету на установку ГКЛ на 352 кв м",
    tokens: ["Листы ГКЛ", "Направляющий профиль", "Стоечный профиль", "Лента для швов", "Обшивка ГКЛ"],
  },
  {
    id: "gable_roof",
    path: "/chat",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    tokens: ["Стропила", "Мауэрлат", "Гидроизоляция", "Обрешётка", "Монтаж кровли"],
  },
  {
    id: "brick_masonry",
    path: "/chat",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    tokens: ["Кирпич", "Раствор", "Кладочная сетка", "Кладка кирпича", "Расшивка"],
  },
];

function artifactUrl(item: UiCase): string {
  const url = new URL(item.path, BASE_URL);
  url.searchParams.set("prompt", item.prompt);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

function writeWebArtifact(value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(WEB_ARTIFACT, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("live estimate PDF web reality", () => {
  test.setTimeout(180_000);

  test("AI estimate flow creates specific rows and readable PDF", async ({ page }) => {
    const transcripts: unknown[] = [];
    page.on("dialog", (dialog) => dialog.accept());

    for (const item of AI_CASES) {
      await page.goto(artifactUrl(item), { waitUntil: "domcontentloaded", timeout: 60_000 });
      for (const token of item.tokens) {
        await expect(page.getByText(token, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
      }
      await expect(page.getByText("Основной материал: Строительные работы", { exact: false })).toHaveCount(0);

      await page.getByTestId("ai-estimate-make-pdf").last().click();
      await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
      const currentUrl = new URL(page.url());
      const uri = currentUrl.searchParams.get("uri") || "";
      const validation = validateEstimatePdf({ pdf: uri });
      expect(validation.valid).toBe(true);
      expect(validation.text).toContain("Таблица сметы");
      transcripts.push({
        id: item.id,
        url: currentUrl.pathname,
        pdf_valid: validation.valid,
        pdf_text_sample: validation.text.slice(0, 500),
      });
    }

    writeWebArtifact({
      web_live_app_tested: true,
      playwright_web_passed: true,
      transcripts,
      fake_green_claimed: false,
    });
  });

  test("request screen creates carpet-specific draft", async ({ page }) => {
    await page.goto(new URL("/request", BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill("Хочу уложить ковролин на 100 кв м");
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByText("Ковролин", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Подложка", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Укладка ковролина", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Строительные работы", { exact: true })).toHaveCount(0);
  });
});
