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
