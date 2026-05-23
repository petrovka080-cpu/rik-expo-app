import fs from "node:fs";
import path from "node:path";
import { test, expect } from "playwright/test";

import { validateEstimatePdf } from "../../src/lib/estimatePdf";

const BASE_URL = process.env.LIVE_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL || "http://127.0.0.1:8081";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_CORE_COMPLETION_web_screenshots.json");

type WebCase = {
  id: string;
  route: string;
  prompt: string;
  tokens: string[];
  pdf?: boolean;
};

const CASES: WebCase[] = [
  { id: "asphalt_paving", route: "/ai?context=foreman", prompt: "сделай мне смету на асфальтирование на 1000 кв м", tokens: ["Песчаное основание", "Щебеночное основание", "Битумная эмульсия", "асфальтобетона", "Укладка"], pdf: true },
  { id: "carpet_laying", route: "/request", prompt: "хочу уложить ковролин на 100 кв м", tokens: ["Ковролин", "Подложка", "Укладка ковролина"] },
  { id: "drywall_gkl", route: "/chat", prompt: "смету на установку ГКЛ на стены 352 кв м", tokens: ["ГКЛ", "профиль", "креп", "монтаж"], pdf: true },
  { id: "gable_roof", route: "/chat", prompt: "дай смету на устройство двускатной крыши основание 100 кв метров", tokens: ["Стропила", "Мауэрлат", "Обреш", "Монтаж кровли"], pdf: true },
  { id: "brick_masonry", route: "/chat", prompt: "дай смету на кладку кирпича 74 кв метров", tokens: ["Кирпич", "Раствор", "Кладка кирпича"], pdf: true },
  { id: "tile_floor", route: "/chat", prompt: "смета на укладку кафельной плитки на пол 174 кв м", tokens: ["плитка", "клей", "затирка"], pdf: true },
  { id: "laminate", route: "/chat", prompt: "дай смету на укладку ламината 100 м²", tokens: ["Ламинат", "Подложка", "Укладка ламината"] },
  { id: "bathroom_waterproofing", route: "/chat", prompt: "смета на bathroom_waterproofing 30 м²", tokens: ["гидроизоля", "праймер", "нанес"] },
  { id: "electrical_wiring", route: "/chat", prompt: "смета на электропроводка квартиры 80 м²", tokens: ["кабель", "монтаж", "автоматы"] },
  { id: "pipe_replacement", route: "/chat", prompt: "смета на замена труб 40 пог. м", tokens: ["труб", "фитинг", "монтаж"] },
  { id: "facade_insulation", route: "/chat", prompt: "смета на утепление фасада 200 м²", tokens: ["утеплитель", "клей", "дюбели"] },
  { id: "concrete_slab", route: "/chat", prompt: "смета на бетонная плита 200 м²", tokens: ["бетон", "арматур", "залив"] },
];

function urlFor(item: WebCase): string {
  const url = new URL(item.route, BASE_URL);
  url.searchParams.set("prompt", item.prompt);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

function writeArtifact(value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function submitCase(page: import("playwright/test").Page, item: WebCase): Promise<void> {
  if (item.route === "/request") {
    await page.goto(new URL("/request", BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(item.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    return;
  }
  await page.goto(urlFor(item), { waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("AI estimate core completion web", () => {
  test.setTimeout(240_000);

  test("renders structured estimates, actions, sources, tax and PDF viewer", async ({ page }) => {
    const transcripts: unknown[] = [];
    for (const item of CASES) {
      await submitCase(page, item);
      for (const token of item.tokens) {
        await expect(page.getByText(token, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
      }
      await expect(page.getByText("Строительные работы", { exact: true })).toHaveCount(0);
      await expect(page.getByText(/Источник|Sources|confidence|точност/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Налог|Tax|НДС|warning/i).first()).toBeVisible({ timeout: 30_000 });
      if (item.route === "/request") {
        await expect(page.getByText(/PDF/i).last()).toBeVisible({ timeout: 30_000 });
      } else {
        await expect(page.getByTestId("ai-estimate-make-pdf").last()).toBeVisible({ timeout: 30_000 });
      }

      let pdfValid: boolean | null = null;
      if (item.pdf) {
        await page.getByTestId("ai-estimate-make-pdf").last().click();
        await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
        const uri = new URL(page.url()).searchParams.get("uri") || "";
        const validation = validateEstimatePdf({ pdf: uri });
        expect(validation.valid).toBe(true);
        expect(validation.text).toMatch(/[А-Яа-яЁё]/);
        pdfValid = validation.valid;
      }
      transcripts.push({ id: item.id, route: item.route, pdfValid });
    }
    writeArtifact({ web_playwright_passed: true, web_live_app_tested: true, transcripts, fake_green_claimed: false });
  });
});
