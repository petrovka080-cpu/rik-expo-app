import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const PROMPT = "мансардная крыша 200 м2 с 6 окнами металлочерепица утепление 200 мм";
const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_REQUEST_ESTIMATE_CATEGORY_FILTERS_DURABLE_WEB",
);

const FILTER_IDS = ["all", "materials", "labor", "machinery", "services", "delivery"] as const;
const FILTER_LABELS = ["Все", "Материалы", "Работы", "Механизмы", "Услуги", "Доставка"] as const;

async function ensureConsumerSession(page: Page): Promise<void> {
  await page.goto(new URL("/request", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const localConsumerLogin = page.getByTestId("auth.login.local-consumer");
  await expect(
    page.locator(
      '[data-testid="consumer-repair-screen"], [data-testid="auth.login.local-consumer"]',
    ).first(),
  ).toBeVisible({ timeout: 60_000 });
  if (await localConsumerLogin.isVisible()) {
    await localConsumerLogin.click();
  }
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 60_000 });
}

function filter(page: Page, id: typeof FILTER_IDS[number]): Locator {
  return page.getByTestId(`request-estimate-category-filter-${id}`);
}

function rows(page: Page): Locator {
  return page.locator("[data-testid^='request-estimate-item-anchor-']");
}

test.describe("durable request estimate category controls", () => {
  test("keeps the old vertical hide/restore behavior and approves against the exact local backend", async ({ page }) => {
    await ensureLiveWebApp();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await ensureConsumerSession(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);

    const url = new URL("/request", BASE_URL);
    url.searchParams.set("prompt", PROMPT);
    url.searchParams.set("autoPrepare", "1");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });

    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("request-estimate-items-total-count")).toHaveText("45 позиций", {
      timeout: 30_000,
    });
    await expect(rows(page)).toHaveCount(45);

    const filterBoxes = [];
    for (let index = 0; index < FILTER_IDS.length; index += 1) {
      const control = filter(page, FILTER_IDS[index]);
      await expect(control).toBeVisible();
      await expect(control).toContainText(FILTER_LABELS[index]);
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      filterBoxes.push(box!);
    }
    for (let index = 1; index < filterBoxes.length; index += 1) {
      expect(Math.abs(filterBoxes[index].x - filterBoxes[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(filterBoxes[index].width - filterBoxes[0].width)).toBeLessThanOrEqual(1);
      expect(filterBoxes[index].y).toBeGreaterThan(filterBoxes[index - 1].y);
    }

    await filter(page, "all").click();
    await expect(rows(page)).toHaveCount(0);
    await filter(page, "all").click();
    await expect(rows(page)).toHaveCount(45);

    const categoryResults: Record<string, { categoryCount: number; hiddenCount: number; restoredCount: number }> = {};
    for (const id of FILTER_IDS.slice(1)) {
      const text = (await filter(page, id).textContent()) ?? "";
      const countMatch = text.match(/(\d+)\s*$/u);
      expect(countMatch).not.toBeNull();
      const categoryCount = Number(countMatch![1]);
      expect(categoryCount).toBeGreaterThan(0);
      await filter(page, id).click();
      await expect(rows(page)).toHaveCount(45 - categoryCount);
      const hiddenCount = await rows(page).count();
      await filter(page, id).click();
      await expect(rows(page)).toHaveCount(45);
      categoryResults[id] = { categoryCount, hiddenCount, restoredCount: await rows(page).count() };
    }

    const firstAnchor = rows(page).first();
    const firstAnchorTestId = await firstAnchor.getAttribute("data-testid");
    const firstItemId = String(firstAnchorTestId).replace("request-estimate-item-anchor-", "");
    await expect(page.getByTestId(`consumer-repair-item-title-${firstItemId}`)).toHaveCount(1);
    await expect(page.getByTestId(`consumer-repair-item-specification-input-${firstItemId}`)).toHaveCount(0);
    await page.getByTestId(`consumer-repair-item-specification-edit-${firstItemId}`).click();
    await expect(page.getByTestId(`consumer-repair-item-title-${firstItemId}`)).toHaveCount(0);
    await expect(page.getByTestId(`consumer-repair-item-specification-input-${firstItemId}`)).toHaveCount(1);
    await page.getByTestId(`consumer-repair-item-specification-save-${firstItemId}`).click();
    await expect(page.getByTestId(`consumer-repair-item-title-${firstItemId}`)).toHaveCount(1);

    await page.getByTestId("request-estimate-positions-toggle").click();
    await expect(page.getByTestId("request-estimate-positions-panel")).toHaveCount(0);
    await page.getByTestId("request-estimate-positions-toggle").click();
    await expect(rows(page)).toHaveCount(45);

    const actionIds = [
      "consumer-estimate-make-pdf",
      "consumer-repair-approve",
      "consumer-repair-delete-draft",
    ] as const;
    const actionBoxes = [];
    for (const id of actionIds) {
      const action = page.getByTestId(id).last();
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      actionBoxes.push(box!);
    }
    for (let index = 1; index < actionBoxes.length; index += 1) {
      expect(Math.abs(actionBoxes[index].x - actionBoxes[0].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(actionBoxes[index].width - actionBoxes[0].width)).toBeLessThanOrEqual(1);
      expect(actionBoxes[index].y).toBeGreaterThan(actionBoxes[index - 1].y);
    }

    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-approve").last().click();
    await expect(page.getByTestId("consumer-repair-send-market")).toBeVisible({ timeout: 90_000 });
    expect(consoleErrors.join("\n")).not.toMatch(/runtime-manifest request timed out|ConsumerRepairApprove.*failed/iu);

    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const screenshotPath = path.join(ARTIFACT_DIR, "vertical-filters-approved.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "web_result.json"),
      `${JSON.stringify({
        status: "GREEN",
        prompt: PROMPT,
        initialRowCount: 45,
        finalRowCountBeforeApproval: 45,
        filterLabels: FILTER_LABELS,
        filterLayout: "vertical_top_to_bottom",
        categoryResults,
        positionsToggleRestored: true,
        titleSingleDisplayAndEditMode: true,
        bottomActionsLayout: "vertical_top_to_bottom",
        approvalSucceeded: true,
        runtimeManifestTimeoutObserved: false,
        screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/"),
      }, null, 2)}\n`,
      "utf8",
    );
  });
});
