import { expect, test, type Page, type TestInfo } from "playwright/test";

const BASE_URL = (process.env.ASPHALT_REFERENCE_WEB_BASE_URL ?? "http://localhost:8081")
  .replace(/\/$/, "");
const ROAD_PROMPT =
  "\u0414\u043e\u0440\u043e\u0433\u0438, \u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442 \u0438 \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0438: \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d\u043d\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435, \u0434\u043b\u0438\u043d\u0430 5400 \u043c, \u0448\u0438\u0440\u0438\u043d\u0430 15 \u043c";

const SCOPES = [
  "road_surfacing_only",
  "full_pavement_structure",
  "full_road_infrastructure",
  "road_repair_rehabilitation",
] as const;

async function openScopeSelection(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/request`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const input = page.getByTestId("consumer-repair-problem-input");
  await expect(input).toBeVisible({ timeout: 60_000 });
  await input.fill(ROAD_PROMPT);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  const selection = page.getByTestId("road-scope-selection");
  await expect(selection).toBeVisible({ timeout: 60_000 });
  await expect(selection.getByRole("button")).toHaveCount(4);
}

test("all four asphalt scope choices calculate and survive exact-draft reload", async ({
  browser,
}, testInfo: TestInfo) => {
  const evidence: Record<string, unknown>[] = [];

  for (const scope of SCOPES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openScopeSelection(page);
    await page.getByTestId(`road-scope-option-${scope}`).click();
    const rowCount = page.getByTestId("request-estimate-row-count");
    await expect(rowCount).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("consumer-repair-status")).toContainText(
      "\u0421\u043c\u0435\u0442\u0430 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u0430",
    );
    await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible();
    await expect(page.getByTestId("consumer-estimate-open-procurement")).toBeVisible();
    const draftUrl = page.url();
    const rowsBeforeReload = await rowCount.innerText();

    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByTestId("request-estimate-row-count")).toHaveText(
      rowsBeforeReload,
      { timeout: 90_000 },
    );
    expect(page.url()).toBe(draftUrl);
    await expect(page.locator("body")).not.toContainText("\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430");
    await expect(page.locator("body")).not.toContainText("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0440\u0430\u0441\u0447\u0451\u0442");

    evidence.push({
      scope,
      rows: rowsBeforeReload,
      draftUrl,
      consoleErrors,
      pageErrors,
    });
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }

  await testInfo.attach("asphalt-r8-four-scope-selection.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
});

test("exact asphalt demolition moves from D0 to the first calculated revision through Russian parameter UI", async ({
  page,
}, testInfo: TestInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE_URL}/request`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const input = page.getByTestId("consumer-repair-problem-input");
  await expect(input).toBeVisible({ timeout: 60_000 });
  await input.fill("Демонтаж асфальта");
  const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  const suggestionTexts = await suggestions.allTextContents();
  const demolitionIndex = suggestionTexts.findIndex((text) =>
    text.toLocaleLowerCase("ru-RU").includes("демонтаж асфальта")
  );
  expect(demolitionIndex).toBeGreaterThanOrEqual(0);
  await suggestions.nth(demolitionIndex).click();
  await input.fill(`${await input.inputValue()} 2000 м²`);
  await page.getByTestId("consumer-repair-prepare-draft").click();

  await expect(page.getByTestId("request-estimate-selected-work-title")).toHaveText("Демонтаж асфальта", {
    timeout: 60_000,
  });
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("0");
  await expect(page.getByTestId("road-scope-selection")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("NEEDS_REQUIRED_INPUTS");
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toHaveCount(0);
  await expect(page.getByTestId("consumer-estimate-open-procurement")).toHaveCount(0);

  const methodOptions = page.getByTestId("editable-param-options-removal_method");
  await expect(methodOptions).toContainText("Механизированный демонтаж");
  await expect(methodOptions).not.toContainText("MECHANICAL_BREAKOUT");
  await page.getByTestId("editable-param-inline-editor-removal_depth_mm")
    .getByTestId("editable-param-popover-input")
    .fill("50");
  await page.getByTestId("editable-param-option-removal_method-MECHANICAL_BREAKOUT").click();
  await page.getByTestId("editable-param-option-removal_extent-FULL").click();
  await page.getByTestId("editable-param-inline-editor-existing_asphalt_density_t_m3")
    .getByTestId("editable-param-popover-input")
    .fill("2,35");
  await page.getByTestId("editable-param-option-haul_required-false").click();
  await expect(page.getByTestId("editable-param-chip-material_destination")).toBeVisible();
  await expect(page.getByTestId("request-estimate-show-more-parameters")).toHaveCount(0);
  await expect(page.getByTestId("editable-param-batch-dirty-count")).toContainText("5");
  await page.getByTestId("editable-param-batch-apply").click();
  await expect(page.getByTestId("editable-param-validation-error-material_destination")).toBeVisible();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("0");
  expect(pageErrors).toEqual([]);
  await page.getByTestId("editable-param-option-material_destination-RECYCLING").click();
  await expect(page.getByTestId("editable-param-batch-dirty-count")).toContainText("6");
  await page.getByTestId("editable-param-batch-apply").click();

  const rowCount = page.getByTestId("request-estimate-row-count");
  await expect(rowCount).not.toContainText("0 позиций", { timeout: 90_000 });
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible();
  await expect(page.getByTestId("consumer-estimate-open-procurement")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Произошла ошибка");
  await expect(page.locator("body")).not.toContainText("NEEDS_REQUIRED_INPUTS");
  const rowsBeforeReload = await rowCount.innerText();
  const draftUrl = page.url();

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.getByTestId("request-estimate-row-count")).toHaveText(rowsBeforeReload, {
    timeout: 90_000,
  });
  expect(page.url()).toBe(draftUrl);
  await page.getByTestId("consumer-estimate-make-pdf").click();
  await page.waitForURL(/pdf-viewer/, { timeout: 60_000 });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  const approve = page.getByTestId("consumer-repair-approve");
  await expect(approve).toBeVisible({ timeout: 60_000 });
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(page.getByTestId("request-estimate-row-count")).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-status")).toContainText("утверждена");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await testInfo.attach("asphalt-r8-demolition-d0-d1.json", {
    body: JSON.stringify({
      draftUrl,
      rows: rowsBeforeReload,
      russianMethodLabel: true,
      pdfOpenedAndReturned: true,
      estimateApproved: true,
      consoleErrors,
      pageErrors,
    }, null, 2),
    contentType: "application/json",
  });
});

test("demolition with haul reveals two clear dependent inputs and applies on the second click", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE_URL}/request`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const input = page.getByTestId("consumer-repair-problem-input");
  await input.fill("Демонтаж асфальта");
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
  const suggestionTexts = await suggestions.allTextContents();
  const demolitionIndex = suggestionTexts.findIndex((text) =>
    text.toLocaleLowerCase("ru-RU").includes("демонтаж асфальта")
  );
  expect(demolitionIndex).toBeGreaterThanOrEqual(0);
  await suggestions.nth(demolitionIndex).click();
  await input.fill(`${await input.inputValue()} 2000 м²`);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText("0", { timeout: 60_000 });

  await page.getByTestId("editable-param-inline-editor-removal_depth_mm")
    .getByTestId("editable-param-popover-input")
    .fill("50");
  await page.getByTestId("editable-param-option-removal_method-MECHANICAL_BREAKOUT").click();
  await page.getByTestId("editable-param-option-removal_extent-FULL").click();
  await page.getByTestId("editable-param-inline-editor-existing_asphalt_density_t_m3")
    .getByTestId("editable-param-popover-input")
    .fill("2,35");
  await page.getByTestId("editable-param-option-haul_required-true").click();
  await page.getByTestId("editable-param-option-material_destination-RECYCLING").click();
  await expect(page.getByTestId("editable-param-batch-dirty-count")).toContainText("6");
  await page.getByTestId("editable-param-batch-apply").click();

  await expect(page.getByTestId("request-estimate-row-count")).toContainText("0");
  await expect(page.getByTestId("editable-param-chip-haul_distance_km")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("editable-param-chip-truck_payload_t")).toBeVisible();
  await expect(page.getByTestId("editable-param-chip-cut_map_geometry")).toHaveCount(0);
  await page.getByTestId("editable-param-inline-editor-haul_distance_km")
    .getByTestId("editable-param-popover-input")
    .fill("20");
  await page.getByTestId("editable-param-inline-editor-truck_payload_t")
    .getByTestId("editable-param-popover-input")
    .fill("20");
  await expect(page.getByTestId("editable-param-batch-dirty-count")).toContainText("2");
  await page.getByTestId("editable-param-batch-apply").click();

  await expect(page.getByTestId("request-estimate-row-count")).not.toContainText("0 позиций", {
    timeout: 90_000,
  });
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible();
  await expect(page.getByTestId("consumer-estimate-open-procurement")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Произошла ошибка");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
