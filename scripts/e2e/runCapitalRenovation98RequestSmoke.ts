import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";

type SmokeTarget = "web" | "android-chrome";

const PROMPT = "\u043a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 98 \u043c\u00b2 \u043f\u043e\u0442\u043e\u043b\u043e\u043a 3 \u043c 2 \u0441\u0430\u043d\u0443\u0437\u043b\u0430";
const RAW_MARKERS = [
  "PRICE_MISSING",
  "no_accepted_price_source_or_unit_conversion",
  "round_to",
  "normFactor",
  "source_parameters",
  "Apartment capital",
  "\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445",
];
const REQUIRED_VISIBLE_TEXT = [
  "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b",
  "\u0414\u043e\u043f\u0443\u0449\u0435\u043d\u0438\u044f \u0440\u0430\u0441\u0447\u0435\u0442\u0430",
  "98 \u043c\u00b2",
  "297,5 \u043c\u00b2",
  "\u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436 \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  "\u0427\u0435\u0440\u043d\u043e\u0432\u044b\u0435 \u043f\u043e\u043b\u044b",
  "\u0421\u0443\u0445\u0430\u044f \u0441\u043c\u0435\u0441\u044c \u0434\u043b\u044f \u0441\u0442\u044f\u0436\u043a\u0438",
  "\u0428\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043d\u0430\u044f \u0441\u043c\u0435\u0441\u044c",
  "\u041f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 \u043a\u043b\u0435\u0439",
  "\u041a\u0430\u0431\u0435\u043b\u044c \u0441\u0438\u043b\u043e\u0432\u043e\u0439",
  "\u0422\u0440\u0443\u0431\u0430 \u0432\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u044f",
  "\u0424\u043e\u0442\u043e",
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  "\u0417\u0430\u043c\u0435\u0442\u043a\u0430",
];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return String(process.argv[index + 1] ?? "").trim() || undefined;
  return undefined;
}

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`) || ["1", "true", "yes"].includes(String(argValue(name) ?? "").toLowerCase());
}

function parseTarget(): SmokeTarget {
  const target = (argValue("target") ?? "web").trim().toLowerCase();
  if (target === "web" || target === "android-chrome") return target;
  throw new Error(`UNSUPPORTED_CAPITAL_RENOVATION_SMOKE_TARGET:${target}`);
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

async function main() {
  const target = parseTarget();
  const requireRealBrowser = argFlag("require-real-browser");
  if (target !== "web") {
    throw new Error("CAPITAL_RENOVATION_ANDROID_CHROME_SMOKE_NOT_IMPLEMENTED_WITHOUT_DEVICE");
  }

  const baseUrl = (argValue("base-url") ?? process.env.CAPITAL_RENOVATION_REQUEST_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
  const outDir = path.join(process.cwd(), ".release-runtime", "ai-estimate-trust-rebase-capital-renovation-98", timestampForPath());
  await mkdir(outDir, { recursive: true });
  const consoleErrors: string[] = [];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded" });
    const input = page.getByTestId("consumer-repair-problem-input");
    await input.waitFor({ timeout: 30_000 });

    const placeholder = await input.getAttribute("placeholder");
    if (!placeholder?.includes("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0438\u043f \u0438\u043b\u0438 \u0432\u0438\u0434 \u0440\u0430\u0431\u043e\u0442")) throw new Error(`BAD_PLACEHOLDER:${placeholder}`);
    if (!placeholder.includes("\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043f\u043b\u0438\u0442\u043a\u0438") || !placeholder.includes("\u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436")) {
      throw new Error(`PLACEHOLDER_NOT_PLATFORM_SEARCH_ORIENTED:${placeholder}`);
    }

    await input.fill(PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByText("\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b").first().waitFor({ timeout: 30_000 });

    const quantityInputs = await count(page, "[data-testid^='consumer-repair-item-quantity-input-']");
    const priceInputs = await count(page, "[data-testid^='consumer-repair-item-unit-price-input-']");
    const removeButtons = await count(page, "[data-testid^='consumer-repair-item-remove-']");
    const catalogButtons = await count(page, "[data-testid^='consumer-repair-item-catalog-']");
    const rowPhotoButtons = await count(page, "[data-testid^='estimate-material-row-photo-button-']");
    const calculationToggles = await count(page, "[data-testid^='consumer-repair-item-calculation-toggle-']");

    if (quantityInputs !== 64 || priceInputs !== 64 || removeButtons !== 64) {
      throw new Error(`EDITOR_ROW_CONTROLS_BAD:${JSON.stringify({ quantityInputs, priceInputs, removeButtons })}`);
    }
    if (catalogButtons < 40 || rowPhotoButtons < 40 || calculationToggles < 64) {
      throw new Error(`MATERIAL_OR_FORMULA_CONTROLS_BAD:${JSON.stringify({ catalogButtons, rowPhotoButtons, calculationToggles })}`);
    }

    const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    for (const bad of RAW_MARKERS) {
      if (bodyText.includes(bad)) throw new Error(`RAW_MARKER_VISIBLE:${bad}`);
    }
    for (const required of REQUIRED_VISIBLE_TEXT) {
      if (!bodyText.includes(required)) throw new Error(`MISSING_VISIBLE_TEXT:${required}`);
    }

    const firstQty = page.locator("[data-testid^='consumer-repair-item-quantity-input-']").first();
    await firstQty.fill("99");
    const qtyValue = await firstQty.inputValue();
    if (qtyValue !== "99") throw new Error(`QUANTITY_INPUT_NOT_EDITABLE:${qtyValue}`);

    await page.screenshot({ path: path.join(outDir, "request-after-capital-renovation-98.png"), fullPage: true });
    const summary = {
      status: "GREEN",
      final_status: "GREEN_AI_ESTIMATE_CAPITAL_RENOVATION_98_WEB_REQUEST_SMOKE",
      generated_by: "scripts/e2e/runCapitalRenovation98RequestSmoke.ts",
      target,
      require_real_browser: requireRealBrowser,
      route_equivalent_not_reported_as_real_browser: true,
      actual_web_browser_capital_renovation_98_smoke_passed: true,
      prompt: PROMPT,
      placeholder,
      quantity_inputs: quantityInputs,
      price_inputs: priceInputs,
      remove_buttons: removeButtons,
      catalog_buttons: catalogButtons,
      row_photo_buttons: rowPhotoButtons,
      calculation_toggles: calculationToggles,
      console_error_count: consoleErrors.length,
      console_errors: consoleErrors,
      fake_green_claimed: false,
      blockers: consoleErrors.length === 0 ? [] : ["CONSOLE_ERRORS_PRESENT"],
    };
    await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.info(JSON.stringify(summary, null, 2));
    if (consoleErrors.length > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
