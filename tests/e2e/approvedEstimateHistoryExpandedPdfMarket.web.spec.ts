import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { validateEstimatePdf } from "../../src/lib/estimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_HISTORY_EXPANDED_PDF_MARKET");
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

async function createApprovedLaminate(page: Page): Promise<void> {
  await page.getByTestId("consumer-repair-problem-input").fill(LAMINATE_PROMPT);
  await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-items-editor")).toContainText(/ламинат/i, { timeout: 60_000 });
  await page.getByTestId("consumer-repair-add-photo").click();
  await page.getByTestId("consumer-repair-approve").click();
  await expect(page.getByTestId("request-estimate-summary-card")).toHaveCount(0, { timeout: 60_000 });
}

async function createActiveFoundationDraft(page: Page): Promise<void> {
  await page.getByTestId("consumer-repair-problem-input").fill(FOUNDATION_PROMPT);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("request-estimate-items-editor")).not.toContainText(/ламинат/i);
}

async function openLaminateHistory(page: Page): Promise<void> {
  const laminateHistoryRow = page.getByTestId("consumer-repair-history-row").filter({ hasText: /ламинат/i }).first();
  await expect(laminateHistoryRow).toBeVisible({ timeout: 60_000 });
  await laminateHistoryRow.getByTestId("consumer-repair-history-main").click();
  await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toContainText(/ламинат/i, { timeout: 60_000 });
}

test.describe("approved estimate history expanded PDF and market actions", () => {
  test("uses the approved history snapshot without polluting the active draft", async ({ page }) => {
    await ensureLiveWebApp();
    await resetRequestStorage(page);

    await createApprovedLaminate(page);
    await createActiveFoundationDraft(page);
    await openLaminateHistory(page);

    await expect(page.getByTestId("consumer-repair-history-readonly-item").first()).toBeVisible({ timeout: 30_000 });
    expect(await page.getByTestId("consumer-repair-history-readonly-item").count()).toBeGreaterThanOrEqual(8);
    await expect(page.getByTestId("consumer-repair-history-edit-revision")).toBeVisible();
    await expect(page.getByTestId("consumer-repair-history-open-pdf-expanded")).toBeVisible();
    await expect(page.getByTestId("consumer-repair-history-send-market")).toBeVisible();
    await expect(page.getByTestId("consumer-repair-history-duplicate")).toBeVisible();

    await page.getByTestId("consumer-repair-history-open-pdf-expanded").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    const uri = new URL(page.url()).searchParams.get("uri") ?? "";
    expect(uri).toBeTruthy();
    const validation = validateEstimatePdf({ pdf: uri, knownWorkKey: "laminate_laying" });
    expect(validation.valid).toBe(true);

    await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page).toHaveURL(/\/request/);
    await openLaminateHistory(page);
    await page.getByTestId("consumer-repair-history-send-market").click();
    await expect(page.getByTestId("consumer-repair-status")).toContainText(/маркет|РјР°СЂРєРµС‚/i, { timeout: 30_000 });
    await expect(page.getByTestId("request-estimate-items-editor")).not.toContainText(/ламинат/i);

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const screenshotPath = path.join(ARTIFACT_DIR, "history-expanded-pdf-market.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "web_result.json"),
      `${JSON.stringify({
        route: "/request",
        expandedSnapshotVisible: true,
        historyPdfOpened: true,
        historyMarketSendUsed: true,
        activeDraftStayedIndependent: true,
        screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
        fakeGreenClaimed: false,
      }, null, 2)}\n`,
      "utf8",
    );
  });
});
