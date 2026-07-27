import { expect, test, type Page, type TestInfo } from "playwright/test";

const BASE_URL = (process.env.ASPHALT_REFERENCE_WEB_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const ROAD_PROMPT =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 5400 метров длина и 15 метров ширина";
const SECOND_ROAD_PROMPT =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 2000 метров длина и 32 метра ширина";
const ASPHALT_WITHOUT_GEOMETRY =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие";

async function openCleanRequest(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/request`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-problem-input")).toHaveValue("");
  await expect(page.getByTestId("request-estimate-summary-card")).toHaveCount(0);
}

async function enterPromptAndBuild(page: Page, prompt: string): Promise<void> {
  await page.getByTestId("consumer-repair-problem-input").fill(prompt);
  await expect(page.getByTestId("inline-work-prompt-matched-work")).toBeVisible();
  await page.getByTestId("inline-work-prompt-build-estimate").click();
  await expect(page.getByTestId("road-scope-selection")).toBeVisible({ timeout: 60_000 });
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const screenshotPath = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: "image/png",
  });
}

test("manual /request flow seals DraftSession isolation and Asphalt Reference V1 scopes", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openCleanRequest(page);
  await page.getByTestId("consumer-repair-problem-input").fill(ROAD_PROMPT);
  await expect(page.getByTestId("inline-work-prompt-matched-work")).toBeVisible();
  await expect(page.getByTestId("inline-work-prompt-param-chip-length_m")).toContainText("5400");
  await expect(page.getByTestId("inline-work-prompt-param-chip-width_m")).toContainText("15");
  await expect(page.getByTestId("inline-work-prompt-param-chip-area_m2")).toContainText("81000");
  await page.getByTestId("inline-work-prompt-build-estimate").click();

  const scopeSelector = page.getByTestId("road-scope-selection");
  await expect(scopeSelector).toBeVisible({ timeout: 60_000 });
  await expect(scopeSelector.getByRole("button")).toHaveCount(4);
  await expect(page.getByTestId("request-estimate-summary-card")).toHaveCount(0);
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toHaveCount(0);
  const fullRoad = page.getByTestId("road-scope-option-full_road_infrastructure");
  await expect(fullRoad).toBeInViewport();
  await attachScreenshot(page, testInfo, "four-canonical-scopes");

  await fullRoad.click();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("702", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("request-estimate-summary-card")).toContainText("81 000");
  const exactDraftUrl = page.url();
  expect(new URL(exactDraftUrl).searchParams.get("draftId")).toBeTruthy();
  await attachScreenshot(page, testInfo, "full-road-702");

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("702", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("request-estimate-summary-card")).toContainText("81 000");
  expect(page.url()).toBe(exactDraftUrl);

  await openCleanRequest(page);
  await expect(page.getByTestId("request-estimate-row-count")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("81 000 м²");

  await enterPromptAndBuild(page, ROAD_PROMPT);
  await page.getByTestId("road-scope-option-road_surfacing_only").click();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("54", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("request-estimate-summary-card")).toContainText("81 000");
  await expect(page.getByTestId("request-estimate-selected-scope")).toContainText(
    "Только асфальт по готовому основанию",
  );
  await attachScreenshot(page, testInfo, "surfacing-only-54");

  await openCleanRequest(page);
  await page.getByTestId("consumer-repair-problem-input").fill(SECOND_ROAD_PROMPT);
  await expect(page.getByTestId("inline-work-prompt-param-chip-length_m")).toContainText("2000");
  await expect(page.getByTestId("inline-work-prompt-param-chip-width_m")).toContainText("32");
  await expect(page.getByTestId("inline-work-prompt-param-chip-area_m2")).toContainText("64000");
  await page.getByTestId("inline-work-prompt-build-estimate").click();
  await page.getByTestId("road-scope-option-full_road_infrastructure").click();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("702", {
    timeout: 120_000,
  });
  await expect(page.getByTestId("request-estimate-summary-card")).toContainText("64 000");
  await attachScreenshot(page, testInfo, "second-geometry-64000");

  await openCleanRequest(page);
  await enterPromptAndBuild(page, ASPHALT_WITHOUT_GEOMETRY);
  await page.getByTestId("road-scope-option-full_road_infrastructure").click();
  await expect(page.getByTestId("request-estimate-row-count")).toHaveCount(0);
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toHaveCount(0);
  await expect(page.getByTestId("consumer-estimate-open-procurement")).toHaveCount(0);
  await expect(page.getByTestId("consumer-repair-status")).toContainText("обязательные параметры");
  await expect(page.getByTestId("estimate-draft-session-blocked")).toContainText("площадь");
  await expect(page.locator("body")).not.toContainText("1 000 м²");
  await attachScreenshot(page, testInfo, "missing-geometry-blocked");

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
