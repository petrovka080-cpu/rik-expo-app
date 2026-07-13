import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u043e\u0432\u043b\u0438 120 \u043c2";

type ViewportCase = {
  name: "mobile" | "tablet";
  width: number;
  height: number;
  quantity: number;
  price: number;
};

type EditableRowHandle = {
  id: string;
  quantityInput: Locator;
  priceInput: Locator;
  total: Locator;
  status: Locator;
};

const VIEWPORTS: ViewportCase[] = [
  { name: "mobile", width: 390, height: 844, quantity: 135, price: 941 },
  { name: "tablet", width: 820, height: 1180, quantity: 175, price: 982 },
];

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(name: string, projectName: string, value: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, name);
  const current = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>
    : {};
  fs.writeFileSync(filePath, `${JSON.stringify({
    ...current,
    wave: WAVE,
    source_code_head: currentHead(),
    current_head_at_write_time: currentHead(),
    fake_green_claimed: false,
    [projectName]: value,
  }, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", PROMPT);
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

function numberFromText(value: string | null | undefined): number | null {
  const compact = String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", ".").trim();
  if (!compact) return null;
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyFromText(value: string | null | undefined): number | null {
  const compact = String(value ?? "").replace(/[^\d-]/g, "");
  if (!compact) return null;
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed : null;
}

function internalKeyCount(text: string): number {
  return (text.match(/\b(?:PRICE_MISSING|USER_PRICE_OVERRIDE|USER_ENTERED_PRICE|CATALOG_PRICE_VERIFIED|REFERENCE_PRICE_ESTIMATE|PRICEBOOK_VERIFIED|catalogItemId|sourceId|row_key|snapshot_id)\b/g) ?? []).length;
}

async function findEditableRow(page: Page): Promise<EditableRowHandle> {
  const priceInputs = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  await expect(priceInputs.first()).toBeVisible({ timeout: 45_000 });
  const count = await priceInputs.count();
  for (let index = 0; index < count; index += 1) {
    const priceInput = priceInputs.nth(index);
    const value = numberFromText(await priceInput.inputValue());
    if (value == null || value <= 0) continue;
    const testId = await priceInput.getAttribute("data-testid");
    const id = testId?.replace("consumer-repair-item-unit-price-input-", "") ?? "";
    return {
      id,
      quantityInput: page.getByTestId(`consumer-repair-item-quantity-input-${id}`),
      priceInput,
      total: page.getByTestId(`consumer-repair-item-total-${id}`),
      status: page.getByTestId(`consumer-repair-item-price-status-${id}`),
    };
  }
  throw new Error("EDITABLE_ESTIMATE_RESPONSIVE_ROW_NOT_FOUND");
}

async function runViewportProof(page: Page, viewport: ViewportCase) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("request-estimate-details-panel")).toHaveCount(0);

  const row = await findEditableRow(page);
  await expect(row.quantityInput).toBeVisible();
  await expect(row.priceInput).toBeVisible();
  await expect(page.getByTestId(`consumer-repair-item-unit-${row.id}`)).toBeVisible();
  await expect(row.total).toBeVisible();

  await row.quantityInput.fill(String(viewport.quantity));
  await expect.poll(async () => numberFromText(await row.quantityInput.inputValue()), { timeout: 15_000 }).toBe(viewport.quantity);
  await row.priceInput.fill(String(viewport.price));
  await expect.poll(async () => numberFromText(await row.priceInput.inputValue()), { timeout: 15_000 }).toBe(viewport.price);

  const expectedTotal = Math.round(viewport.quantity * viewport.price);
  await expect.poll(async () => moneyFromText(await row.total.textContent()), { timeout: 15_000 }).toBe(expectedTotal);
  await expect(row.status).toContainText(/\u0432\u0440\u0443\u0447|\u0432\u0432\u0435\u0434/i, { timeout: 15_000 });

  const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
  expect(internalKeyCount(bodyText)).toBe(0);
  expect(/[\uFFFD]|\u00D0|\u00D1/.test(bodyText)).toBe(false);

  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    estimate_rows_visible: true,
    noisy_explanation_hidden: true,
    quantity_input_editable: true,
    unit_price_input_editable: true,
    line_total_recalculates: true,
    manual_price_status_visible: true,
    details_collapsed_by_default: true,
    internal_keys_visible: internalKeyCount(bodyText),
    mojibake_found: 0,
    edited_quantity: viewport.quantity,
    edited_unit_price: viewport.price,
    edited_line_total: expectedTotal,
  };
}

test.describe("editable estimate workspace responsive proof", () => {
  test.setTimeout(240_000);

  test("keeps editable estimate controls usable on mobile and tablet", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await runViewportProof(page, viewport));
    }

    writeJson("responsive_results.json", testInfo.project.name, {
      browser_project: testInfo.project.name,
      responsive_mobile_passed: results.some((item) => item.viewport === "mobile"),
      responsive_tablet_passed: results.some((item) => item.viewport === "tablet"),
      estimate_rows_visible: results.every((item) => item.estimate_rows_visible),
      noisy_explanation_hidden: results.every((item) => item.noisy_explanation_hidden),
      quantity_input_editable: results.every((item) => item.quantity_input_editable),
      unit_price_input_editable: results.every((item) => item.unit_price_input_editable),
      line_total_recalculates: results.every((item) => item.line_total_recalculates),
      manual_price_status_visible: results.every((item) => item.manual_price_status_visible),
      details_collapsed_by_default: results.every((item) => item.details_collapsed_by_default),
      internal_keys_visible: results.reduce((sum, item) => sum + item.internal_keys_visible, 0),
      mojibake_found: results.reduce((sum, item) => sum + item.mojibake_found, 0),
      results,
      fake_green_claimed: false,
    });
  });
});
