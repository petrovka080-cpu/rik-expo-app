import { expect, test } from "playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8081";

test("foreman estimate button opens editable professional AI estimate workspace", async ({ page }) => {
  await page.goto(new URL("/office/foreman", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.getByTestId("foreman-main-materials-open")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("foreman-main-materials-open").click();

  const fioInput = page.getByTestId("warehouse-fio-input");
  if (await fioInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fioInput.fill("E2E Foreman");
    await page.getByTestId("warehouse-fio-confirm").click();
  }

  await page.getByTestId("foreman-dropdown-open-foreman-object").click();
  await page.getByTestId("foreman-dropdown-option-foreman-object-bld-admin").click();
  await page.getByTestId("foreman-dropdown-open-foreman-locator").click();
  await page.getByTestId("foreman-dropdown-option-foreman-locator-lvl-01").click();

  await expect(page.getByTestId("foreman-calc-open")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("foreman-calc-open").click();

  await expect(page.getByTestId("professional-estimate-composer")).toBeVisible();
  await expect(page.getByTestId("foreman-ai-estimate-back")).toBeVisible();
  await expect(page.getByTestId("foreman-ai-estimate-open-draft")).toBeVisible();

  await page.getByTestId("foreman-ai-estimate-input").fill("\u043b\u0430\u043c\u0438\u043d\u0430\u0442 \u0443\u043a\u043b\u0430\u0434\u043a\u0430 154 \u043a\u0432 \u043c\u0435\u0442\u0440\u0430");
  await expect(page.getByTestId("foreman-ai-estimate-work-suggestions")).toBeVisible();
  await page.getByTestId("foreman-ai-estimate-work-suggestion-1").click();
  await page.getByTestId("foreman-ai-estimate-generate").click();

  const rows = page.getByTestId("foreman-ai-estimate-row");
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("foreman-ai-estimate-row-qty").first()).toBeVisible();
  await expect(page.getByTestId("foreman-ai-estimate-row-price").first()).toBeVisible();

  await page.getByTestId("foreman-ai-estimate-row-qty").first().fill("10");
  await page.getByTestId("foreman-ai-estimate-row-price").first().fill("500");
  await expect(rows.first()).toContainText(/5\s*000\s*KGS/);

  await expect(page.getByTestId("foreman-ai-estimate-catalog-hint").first()).toBeVisible();
  await page.getByTestId("foreman-ai-estimate-catalog-search").fill("\u043f\u0435\u043d\u0430");
  await expect(page.getByTestId("foreman-ai-estimate-catalog-search")).toBeVisible();
  await expect(page.getByTestId("foreman-ai-estimate-add-draft")).toBeVisible();
});
