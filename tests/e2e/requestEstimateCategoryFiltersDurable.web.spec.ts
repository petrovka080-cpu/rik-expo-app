import fs from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const PROMPT = "Кровля, мансарды и кровельные окна: обрешётка и контробрешётка 200 кв метров";
const CATALOG_ID = "canonical-work:expanded:battens_counterbattens";
const ARTIFACT_DIR = path.resolve(
  String(process.env.R4_A8_WEB_ARTIFACT_DIR ?? "").trim() || path.join(
    process.cwd(),
    "artifacts",
    "S_REQUEST_ESTIMATE_CATEGORY_FILTERS_DURABLE_WEB",
  ),
);

const CATEGORY_FILTER_IDS = ["materials", "labor", "machinery", "services", "delivery"] as const;
const FILTER_IDS = ["all", ...CATEGORY_FILTER_IDS] as const;
const FILTER_LABELS = ["Все", "Материалы", "Работы", "Механизмы", "Услуги", "Доставка"] as const;
const EXPECTED_CATEGORY_COUNTS = {
  materials: 22,
  labor: 4,
  machinery: 7,
  services: 9,
  delivery: 3,
} as const;

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
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
    const acceptedArtifactRevisions = new Map<string, string>();
    page.on("response", (response) => {
      const match = new URL(response.url()).pathname.match(
        /^\/revisions\/([0-9a-f-]{36})\/artifacts\/(pdf|procurement)$/iu,
      );
      if (match && response.request().method() === "POST" && response.status() === 202) {
        acceptedArtifactRevisions.set(match[2], match[1]);
      }
    });

    await ensureConsumerSession(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    const problemInput = page.getByTestId("consumer-repair-problem-input");
    await expect(problemInput).toBeVisible({ timeout: 60_000 });
    const searchResponsePromise = page.waitForResponse((response) => {
      if (!response.url().startsWith("http://127.0.0.1:8765/search/catalog?")) return false;
      return response.status() === 200;
    }, { timeout: 60_000 });
    await problemInput.fill(PROMPT);
    const searchResponse = await searchResponsePromise;
    const searchBody = await searchResponse.json() as { items?: Array<{ catalogId?: string }> };
    const selectedIndex = (searchBody.items ?? []).findIndex((item) => item.catalogId === CATALOG_ID);
    expect(selectedIndex).toBeGreaterThanOrEqual(0);
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    await page.getByTestId("consumer-repair-prepare-draft").click();

    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toContainText("200 м²");
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
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const filterScreenshotPath = path.join(ARTIFACT_DIR, "vertical-filters.png");
    await filter(page, "all").scrollIntoViewIfNeeded();
    await page.screenshot({ path: filterScreenshotPath });

    await filter(page, "all").click();
    await expect(rows(page)).toHaveCount(0);
    await filter(page, "all").click();
    await expect(rows(page)).toHaveCount(45);

    const categoryResults: Record<string, { categoryCount: number; hiddenCount: number; restoredCount: number }> = {};
    for (const id of CATEGORY_FILTER_IDS) {
      const text = (await filter(page, id).textContent()) ?? "";
      const countMatch = text.match(/(\d+)\s*$/u);
      expect(countMatch).not.toBeNull();
      const categoryCount = Number(countMatch![1]);
      expect(categoryCount).toBe(EXPECTED_CATEGORY_COUNTS[id]);
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
    await expect(page.getByTestId(`consumer-repair-item-quantity-input-${firstItemId}`)).toHaveValue("216");
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

    await page.getByTestId(`estimate-material-row-photo-button-${firstItemId}`).click();
    await expect(page.getByTestId("mobile-photo-capture-flow")).toBeVisible({ timeout: 30_000 });
    const photoPicker = page.locator(
      '[data-testid="mobile-photo-gallery"], [data-testid="mobile-photo-pick-library"]',
    ).first();
    await expect(photoPicker).toBeVisible({ timeout: 30_000 });
    const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
    await photoPicker.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "r4-a5-line-evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.getByTestId("mobile-photo-review-screen")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("mobile-photo-use").click();
    await expect(page.getByTestId("mobile-photo-capture-flow")).toHaveCount(0, { timeout: 90_000 });
    await expect(page.locator('[data-testid^="estimate-material-row-photo-attached-"]').first()).toBeVisible();

    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-address-input").fill("64 Manas Avenue");
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-approve").last().click();
    await expect(page.getByTestId("consumer-repair-status")).toContainText("Заявка утверждена", { timeout: 90_000 });
    await expect(page.getByTestId("consumer-repair-history-approved-count")).toHaveText("1");
    await page.getByTestId("consumer-repair-history-button").click();
    await expect(page.getByTestId("consumer-repair-history-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("consumer-repair-history-row").first()).toBeVisible();
    await page.getByTestId("consumer-repair-history-main").first().click();
    await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toBeVisible();
    await expect(page.getByTestId("consumer-repair-history-readonly-item")).toHaveCount(45);
    await expect(page.getByTestId("consumer-repair-history-snapshot-release-id")).toHaveCount(1);
    await expect(page.getByTestId("consumer-repair-history-backend-pdf-artifact")).toHaveCount(1);
    await expect(page.getByTestId("consumer-repair-history-send-market")).toBeVisible();
    await page.getByTestId("consumer-repair-history-send-market").click();
    await expect(page.getByTestId("consumer-repair-status")).toContainText("отправлена в маркет", { timeout: 90_000 });
    await expect(page.getByTestId("consumer-repair-history-backend-procurement-artifact")).toHaveCount(1);
    const pdfRevisionId = acceptedArtifactRevisions.get("pdf") ?? null;
    const procurementRevisionId = acceptedArtifactRevisions.get("procurement") ?? null;
    expect(pdfRevisionId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(procurementRevisionId).toBe(pdfRevisionId);
    expect(consoleErrors.join("\n")).not.toMatch(/runtime-manifest request timed out|ConsumerRepairApprove.*failed/iu);

    const approvedScreenshotPath = path.join(ARTIFACT_DIR, "approved-history.png");
    await page.screenshot({ path: approvedScreenshotPath, fullPage: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "web_result.json"),
      `${JSON.stringify({
        status: "GREEN",
        prompt: PROMPT,
        initialRowCount: 45,
        primaryMeasureM2: 200,
        firstMaterialQuantityM2: 216,
        finalRowCountBeforeApproval: 45,
        filterLabels: FILTER_LABELS,
        filterLayout: "vertical_top_to_bottom",
        categoryResults,
        positionsToggleRestored: true,
        titleSingleDisplayAndEditMode: true,
        bottomActionsLayout: "vertical_top_to_bottom",
        approvalSucceeded: true,
        approvedHistoryRowCount: 45,
        canonicalPdfArtifactReady: true,
        canonicalProcurementArtifactReady: true,
        acceptedRevisionId: pdfRevisionId,
        runtimeManifestTimeoutObserved: false,
        screenshots: {
          verticalFilters: path.relative(process.cwd(), filterScreenshotPath).replace(/\\/g, "/"),
          approvedHistory: path.relative(process.cwd(), approvedScreenshotPath).replace(/\\/g, "/"),
        },
      }, null, 2)}\n`,
      "utf8",
    );
  });
});
