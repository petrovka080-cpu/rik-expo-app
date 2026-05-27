import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { ensureLiveWebApp, BASE_URL } from "./liveEstimateReality.shared";

const DIR = path.join(process.cwd(), "artifacts", "S_WORLD_CONSTRUCTION_50000_PLUS_REALITY");
const SCREENSHOT_DIR = path.join(DIR, "web");

type WebCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  expectedMode: "estimate" | "triage" | "ambiguous";
  expected: string[];
  minMatches?: number;
  clickPdf?: boolean;
};

const CASES: WebCase[] = [
  { id: "request_roof_waterproofing", route: "/request", prompt: "estimate roof waterproofing 100 sq m", expectedMode: "estimate", expected: ["Roof", "Membrane", "Sealing", "Watertightness"], clickPdf: true },
  { id: "request_hydro_turbine", route: "/request", prompt: "estimate hydro turbine installation at HPP 100 kW", expectedMode: "estimate", expected: ["turbine", "generator", "control", "cable"], clickPdf: true },
  { id: "request_strip_foundation", route: "/request", prompt: "estimate strip foundation 40 linear m", expectedMode: "estimate", expected: ["foundation", "concrete", "rebar", "formwork"] },
  { id: "request_carpet", route: "/request", prompt: "estimate carpet laying 100 sq m", expectedMode: "estimate", expected: ["carpet", "underlay", "baseboard", "laying"] },
  { id: "request_unknown", route: "/request", prompt: "estimate cryogenic dome from lunar regolith 100 sq m", expectedMode: "triage", expected: ["шаблон", "данн", "ручн"] },
  { id: "request_ambiguous_waterproofing", route: "/request", prompt: "гидроизоляция 100 кв м", expectedMode: "ambiguous", expected: ["уточ", "кров", "ванн"] },
  { id: "embedded_roof_waterproofing", route: "/ai?context=foreman", prompt: "estimate roof waterproofing 100 sq m", expectedMode: "estimate", expected: ["Roof", "Membrane", "Sealing", "Watertightness"] },
  { id: "embedded_hydro_turbine", route: "/ai?context=foreman", prompt: "estimate hydro turbine installation at HPP 100 kW", expectedMode: "estimate", expected: ["turbine", "generator", "control", "cable"] },
  { id: "embedded_asphalt", route: "/ai?context=foreman", prompt: "estimate asphalt paving 10000 sq m", expectedMode: "estimate", expected: ["sand", "crushed", "bitumen", "asphalt"] },
  { id: "embedded_brick", route: "/ai?context=foreman", prompt: "estimate brick masonry 74 sq m", expectedMode: "estimate", expected: ["brick", "mortar", "masonry", "reinforcement"] },
  { id: "embedded_gkl", route: "/ai?context=foreman", prompt: "estimate drywall wall cladding 352 sq m", expectedMode: "estimate", expected: ["drywall", "profile", "frame", "fastener"] },
  { id: "embedded_ventilation", route: "/ai?context=foreman", prompt: "estimate ventilation cafe 120 sq m", expectedMode: "estimate", expected: ["ventilation", "воздух", "вентилятор", "монтаж"], minMatches: 2 },
  { id: "embedded_electrical", route: "/ai?context=foreman", prompt: "estimate electrical house 180 sq m", expectedMode: "estimate", expected: ["cable", "panel", "test", "electrical"] },
  { id: "embedded_solar", route: "/ai?context=foreman", prompt: "estimate solar panels 30 kW", expectedMode: "estimate", expected: ["solar", "inverter", "cable", "commission"] },
  { id: "embedded_well", route: "/ai?context=foreman", prompt: "estimate well drilling 80 m", expectedMode: "estimate", expected: ["well", "casing", "drilling", "pump"] },
  { id: "embedded_dangerous_regulated", route: "/ai?context=foreman", prompt: "estimate hydro turbine installation at HPP 100 kW", expectedMode: "estimate", expected: ["turbine", "generator", "control", "cable"] },
];

function writeWebArtifacts(transcripts: unknown[], screenshots: Record<string, string>): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DIR, "web_screenshots.json"),
    `${JSON.stringify({ wave: "S_WORLD_CONSTRUCTION_50000_PLUS_SHARDED_LIVE_REALITY_PROOF_POINT_OF_NO_RETURN", screenshots, transcripts, web_playwright_passed: true }, null, 2)}\n`,
    "utf8",
  );
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

test.describe("world construction 50000 live web reality sample", () => {
  test("renders real entrypoint output for sampled construction prompts", async ({ page }) => {
    test.setTimeout(360_000);
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const transcripts: unknown[] = [];
    const screenshots: Record<string, string> = {};

    for (const testCase of CASES) {
      await openAndSubmit(page, testCase);
      if (testCase.expectedMode === "estimate") {
        await expect(page.getByText(/PDF/i).first()).toBeVisible({ timeout: 45_000 });
      } else {
        await page.waitForTimeout(2500);
      }
      const body = (await page.locator("body").textContent()) ?? "";
      const lower = body.toLocaleLowerCase("ru-RU");
      const visibleTokenCount = testCase.expected.filter((token) => lower.includes(token.toLocaleLowerCase("ru-RU"))).length;
      if (testCase.expectedMode === "estimate") {
        expect(visibleTokenCount).toBeGreaterThanOrEqual(testCase.minMatches ?? 1);
      } else {
        expect(body.length).toBeGreaterThan(500);
      }
      expect(body).not.toMatch(/^\s*(Строительные работы|Осмотр|Ремонтные работы|Ремонтные работы после согласования)\s*$/m);
      if (testCase.expectedMode === "estimate") {
        expect(body).toMatch(/PDF|ПДФ|Сделать PDF|Создать PDF/i);
        expect(body).toMatch(/налог|НДС|tax|источник|уверенность|справочник|каталог/i);
      }
      const screenshot = path.join(SCREENSHOT_DIR, `${testCase.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      screenshots[testCase.id] = path.relative(process.cwd(), screenshot).replace(/\\/g, "/");
      transcripts.push({ id: testCase.id, route: testCase.route, prompt: testCase.prompt, textSample: body.slice(0, 2400) });
    }

    writeWebArtifacts(transcripts, screenshots);
  });
});
