import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442 20 \u043c2 \u0441 \u043f\u043b\u0438\u043d\u0442\u0443\u0441\u043e\u043c";

type EditableRowHandle = {
  id: string;
  quantityInput: Locator;
  priceInput: Locator;
};

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeArtifact(name: string, payload: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const head = currentHead();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify({
    wave: WAVE,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
    ...payload,
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

function internalKeysVisible(text: string): number {
  return (text.match(/\b(?:revision_id|snapshot_id|parent_revision_id|rows_hash|totals_hash|full_snapshot_hash|sourceId|catalogItemId)\b/g) ?? []).length;
}

async function findPricedRow(page: Page): Promise<EditableRowHandle> {
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
      priceInput,
      quantityInput: page.getByTestId(`consumer-repair-item-quantity-input-${id}`),
    };
  }
  throw new Error("ESTIMATE_REVISION_PRICED_ROW_NOT_FOUND");
}

test.describe("estimate revision history web", () => {
  test.setTimeout(240_000);

  test("increments visible revision labels after quantity and price edits", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-revision-version")).toContainText(/\u0412\u0435\u0440\u0441\u0438\u044f 1/, { timeout: 30_000 });

    const row = await findPricedRow(page);
    await row.quantityInput.fill("12");
    await expect(page.getByTestId("request-estimate-revision-version")).toContainText(/\u0412\u0435\u0440\u0441\u0438\u044f 2/, { timeout: 15_000 });
    await expect(page.getByTestId("request-estimate-revision-audit")).toContainText(/\u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e/i, { timeout: 15_000 });

    await row.priceInput.fill("777");
    await expect(page.getByTestId("request-estimate-revision-version")).toContainText(/\u0412\u0435\u0440\u0441\u0438\u044f 3/, { timeout: 15_000 });
    await expect(page.getByTestId("request-estimate-revision-audit")).toContainText(/\u0446\u0435\u043d\u0430/i, { timeout: 15_000 });

    const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(internalKeysVisible(bodyText)).toBe(0);
    expect(/[\uFFFD]|\u00D0|\u00D1/.test(bodyText)).toBe(false);

    writeArtifact("web_results.json", {
      passed: true,
      browser_project: testInfo.project.name,
      revision_label_incremented_after_quantity: true,
      revision_label_incremented_after_price: true,
      audit_label_visible: true,
      internal_keys_visible: 0,
      mojibake_found: false,
    });
  });
});
