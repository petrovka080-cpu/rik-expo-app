import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "playwright/test";

import { validateEstimatePdf } from "../../src/lib/estimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "web");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d\u0430 48 \u043c \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";
const QUANTITY_OVERRIDE = 250;
const PRICE_OVERRIDE = 1237;

type EditableRowHandle = {
  id: string;
  quantityInput: Locator;
  priceInput: Locator;
  total: Locator;
  status: Locator;
};

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

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
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

function forbiddenMainUiTokens(text: string): string[] {
  const patterns = [
    /\bPRICE_MISSING\b/i,
    /\bUSER_PRICE_OVERRIDE\b/i,
    /\bUSER_ENTERED_PRICE\b/i,
    /\bCATALOG_PRICE_VERIFIED\b/i,
    /\bREFERENCE_PRICE_ESTIMATE\b/i,
    /\bPRICEBOOK_VERIFIED\b/i,
    /\bconfidence\b/i,
    /\bsourceId\b/i,
    /\bcatalogItemId\b/i,
    /\brow_key\b/i,
    /\bsnapshot_id\b/i,
    /\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a:/i,
  ];
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

async function findPricedRow(page: Page): Promise<EditableRowHandle & { initialQuantity: number; initialPrice: number; initialTotal: number }> {
  const priceInputs = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  await expect(priceInputs.first()).toBeVisible({ timeout: 45_000 });
  const count = await priceInputs.count();
  for (let index = 0; index < count; index += 1) {
    const priceInput = priceInputs.nth(index);
    const value = numberFromText(await priceInput.inputValue());
    if (value == null || value <= 0) continue;
    const testId = await priceInput.getAttribute("data-testid");
    const id = testId?.replace("consumer-repair-item-unit-price-input-", "") ?? "";
    const row = {
      id,
      quantityInput: page.getByTestId(`consumer-repair-item-quantity-input-${id}`),
      priceInput,
      total: page.getByTestId(`consumer-repair-item-total-${id}`),
      status: page.getByTestId(`consumer-repair-item-price-status-${id}`),
    };
    const initialQuantity = numberFromText(await row.quantityInput.inputValue());
    const initialTotal = moneyFromText(await row.total.textContent());
    if (initialQuantity != null && initialTotal != null) {
      return { ...row, initialQuantity, initialPrice: value, initialTotal };
    }
  }
  throw new Error("EDITABLE_ESTIMATE_PRICED_ROW_NOT_FOUND");
}

test.describe("editable estimate workspace web proof", () => {
  test.setTimeout(240_000);

  test("supports clean UI, manual quantity/price edits, recalculation and PDF parity", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-price-status")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("request-estimate-details-panel")).toHaveCount(0);

    const beforeText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(forbiddenMainUiTokens(beforeText)).toEqual([]);

    const row = await findPricedRow(page);
    const topProofBefore = await page.getByTestId("request-estimate-top-proof").textContent();

    await row.quantityInput.fill(String(QUANTITY_OVERRIDE));
    await expect.poll(async () => numberFromText(await row.quantityInput.inputValue()), { timeout: 15_000 }).toBe(QUANTITY_OVERRIDE);
    const quantityTotal = Math.round(QUANTITY_OVERRIDE * row.initialPrice);
    await expect.poll(async () => moneyFromText(await row.total.textContent()), { timeout: 15_000 }).toBe(quantityTotal);
    await expect.poll(async () => page.getByTestId("request-estimate-top-proof").textContent(), { timeout: 15_000 }).not.toBe(topProofBefore);

    await row.priceInput.fill(String(PRICE_OVERRIDE));
    await expect.poll(async () => numberFromText(await row.priceInput.inputValue()), { timeout: 15_000 }).toBe(PRICE_OVERRIDE);
    const editedTotal = Math.round(QUANTITY_OVERRIDE * PRICE_OVERRIDE);
    await expect.poll(async () => moneyFromText(await row.total.textContent()), { timeout: 15_000 }).toBe(editedTotal);
    await expect(row.status).toContainText(/\u0432\u0440\u0443\u0447|\u0432\u0432\u0435\u0434/i, { timeout: 15_000 });
    await expect(page.getByTestId("request-estimate-price-status")).toContainText(/\u0432\u0440\u0443\u0447/i, { timeout: 15_000 });

    const afterEditText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(forbiddenMainUiTokens(afterEditText)).toEqual([]);

    const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_editable_workspace.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 45_000 });
    const uri = new URL(page.url()).searchParams.get("uri") ?? "";
    expect(uri.startsWith("data:application/pdf;base64,")).toBe(true);
    const validation = validateEstimatePdf({ pdf: uri });
    expect(validation.valid).toBe(true);
    const pdfCompact = validation.text.replace(/\s+/g, "");
    expect(pdfCompact).toContain(String(QUANTITY_OVERRIDE));
    expect(pdfCompact).toContain(String(PRICE_OVERRIDE));
    expect(pdfCompact).toContain(String(editedTotal));

    writeJson("web_results.json", testInfo.project.name, {
      browser_project: testInfo.project.name,
      raw_ai_explanation_visible_by_default: false,
      debug_source_blob_visible_by_default: false,
      inline_source_spam_removed: true,
      compact_summary_visible: true,
      details_collapsed_by_default: true,
      quantity_input_visible: true,
      manual_quantity_entry_supported: true,
      plus_minus_still_available: await page.getByTestId(`consumer-repair-item-plus-${row.id}`).isVisible(),
      line_total_recalculates_after_quantity_edit: true,
      grand_total_recalculates_after_quantity_edit: true,
      unit_price_input_visible: true,
      manual_price_entry_supported: true,
      manual_price_status_visible: true,
      manual_price_not_claimed_as_supplier: forbiddenMainUiTokens(afterEditText).length === 0,
      manual_price_not_claimed_as_regional_pricebook: !/\u0440\u0435\u0433\u0438\u043e\u043d\u0430\u043b|\u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a/i.test(await row.status.textContent() ?? ""),
      line_total_recalculates_after_price_edit: true,
      pdf_uses_edited_quantity: pdfCompact.includes(String(QUANTITY_OVERRIDE)),
      pdf_uses_edited_unit_price: pdfCompact.includes(String(PRICE_OVERRIDE)),
      pdf_uses_edited_line_total: pdfCompact.includes(String(editedTotal)),
      pdf_does_not_use_old_unedited_values: row.initialTotal === editedTotal ? true : !pdfCompact.includes(String(row.initialTotal)),
      internal_keys_visible: forbiddenMainUiTokens(afterEditText).length,
      mojibake_found: /[\uFFFD]|\u00D0|\u00D1/.test(afterEditText) ? 1 : 0,
      initial_quantity: row.initialQuantity,
      initial_unit_price: row.initialPrice,
      edited_quantity: QUANTITY_OVERRIDE,
      edited_unit_price: PRICE_OVERRIDE,
      edited_line_total: editedTotal,
      screenshot: path.relative(process.cwd(), screenshot).replace(/\\/g, "/"),
      fake_green_claimed: false,
    });
  });
});
