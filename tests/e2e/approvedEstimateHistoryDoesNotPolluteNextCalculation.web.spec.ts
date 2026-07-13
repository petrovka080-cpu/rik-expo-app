import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const LAMINATE_PROMPT = "укладку ламината на 100 кв м";
const FOUNDATION_PROMPT = "армирование фундамента на 10 куб метров";

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

async function resetRequestStorage(page: Page): Promise<void> {
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
}

test.describe("approved estimate history does not pollute next calculation", () => {
  test("moves approved laminate to history-only and keeps foundation active after history click", async ({ page }) => {
    await ensureLiveWebApp();
    await resetRequestStorage(page);

    await page.getByTestId("consumer-repair-problem-input").fill(LAMINATE_PROMPT);
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("request-estimate-items-editor")).toContainText(/ламинат/i, { timeout: 60_000 });

    await page.getByTestId("consumer-repair-add-photo").click();
    await page.getByTestId("consumer-repair-approve").click();
    await expect(page.getByTestId("consumer-repair-history-row").filter({ hasText: /ламинат/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toHaveCount(0);
    await expect(page.getByTestId("request-estimate-items-editor")).toHaveCount(0);

    await page.getByTestId("consumer-repair-problem-input").fill(FOUNDATION_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-items-editor")).not.toContainText(/ламинат/i);

    const laminateHistoryRow = page.getByTestId("consumer-repair-history-row").filter({ hasText: /ламинат/i }).first();
    await laminateHistoryRow.getByTestId("consumer-repair-history-main").click();
    await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toContainText(/ламинат/i);
    await expect(page.getByTestId("request-estimate-items-editor")).not.toContainText(/ламинат/i);
    await expect(page.getByTestId("consumer-repair-history-pdf").first()).toBeVisible();
  });
});
