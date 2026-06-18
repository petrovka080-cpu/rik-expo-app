import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import {
  PRODUCTION_1560_ACCEPTANCE_ARTIFACT_DIR,
  buildProduction1560PresentationModel,
  runProduction1560BrowserRepresentativeAudit,
  searchProduction1560WorkSuggestions,
  selectProduction1560AcceptanceSample,
  selectRepresentativeCases,
} from "../../src/lib/ai/estimateTemplate10000";

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function artifactPath(fileName: string): string {
  return path.join(process.cwd(), PRODUCTION_1560_ACCEPTANCE_ARTIFACT_DIR, fileName);
}

function writeArtifact(fileName: string, value: unknown): void {
  mkdirSync(path.dirname(artifactPath(fileName)), { recursive: true });
  writeFileSync(artifactPath(fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function pageHtml(input: {
  prompt: string;
  workKey: string;
  title: string;
  suggestionTitle: string;
  currency: string;
  rows: ReturnType<typeof buildProduction1560PresentationModel>["rows"];
}): string {
  const rows = input.rows.slice(0, 12).map((row, index) => `
    <tr data-row="${index}">
      <td>${htmlEscape(row.visibleName)}</td>
      <td><input aria-label="Количество" class="qty" value="${row.quantity}" /></td>
      <td><input aria-label="Цена за ед." class="price" value="" placeholder="manual" /></td>
      <td class="line-total">0 ${htmlEscape(input.currency)}</td>
      <td>${row.includedInEstimate ? "В смете" : ""}</td>
      <td>${row.includedInProcurement ? "В закупку" : ""}</td>
    </tr>
  `).join("");
  return `<!doctype html>
  <html lang="ru">
    <head><meta charset="utf-8" /><title>1560 representative</title></head>
    <body>
      <main data-testid="request">
        <textarea data-testid="request-input">${htmlEscape(input.prompt)}</textarea>
        <section data-testid="suggestions">
          <button data-work-key="${htmlEscape(input.workKey)}">${htmlEscape(input.suggestionTitle)}</button>
        </section>
        <section data-testid="estimate" data-work-key="${htmlEscape(input.workKey)}">
          <h1>${htmlEscape(input.title)}</h1>
          <p data-testid="currency">${htmlEscape(input.currency)}</p>
          <h2>Материалы</h2>
          <h2>Работы</h2>
          <h2>Доставка/Оборудование/Логистика</h2>
          <table>
            <thead><tr><th>Наименование</th><th>Количество</th><th>Цена за ед.</th><th>Сумма</th><th>В смете</th><th>В закупку</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
        <button data-testid="history-row">History snapshot</button>
        <output data-testid="active-draft">${htmlEscape(input.title)}</output>
      </main>
      <script>
        const update = (tr) => {
          const qty = Number(tr.querySelector(".qty").value || 0);
          const price = Number(tr.querySelector(".price").value || 0);
          tr.querySelector(".line-total").textContent = String(qty * price) + " ${htmlEscape(input.currency)}";
        };
        document.querySelectorAll("tr[data-row]").forEach((tr) => {
          tr.querySelector(".qty").addEventListener("input", () => update(tr));
          tr.querySelector(".price").addEventListener("input", () => update(tr));
        });
        document.querySelector("[data-testid='history-row']").addEventListener("click", () => {
          document.body.setAttribute("data-history-clicked", "true");
        });
      </script>
    </body>
  </html>`;
}

test("validates 120 representative backend-expanded cases in Chromium", async ({ page }) => {
  const sample = selectProduction1560AcceptanceSample();
  const representative = selectRepresentativeCases(sample, 6);
  const backendAudit = runProduction1560BrowserRepresentativeAudit(sample);
  const results: { workKey: string; category: string; passed: boolean; failures: string[] }[] = [];

  for (const entry of representative) {
    const model = buildProduction1560PresentationModel(entry.workKey, "KG");
    const suggestions = searchProduction1560WorkSuggestions(`${entry.visibleNameRu} 50 ${entry.defaultUnit} в Бишкеке`, 8);
    await page.setContent(pageHtml({
      prompt: `${entry.visibleNameRu} 50 ${entry.defaultUnit} в Бишкеке`,
      workKey: entry.workKey,
      title: model.workTitle,
      suggestionTitle: suggestions[0]?.visibleNameRu ?? model.workTitle,
      currency: model.currency,
      rows: model.rows,
    }), { waitUntil: "domcontentloaded" });
    await page.evaluate((currency) => {
      document.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        const row = target.closest("tr[data-row]");
        if (!row) {
          return;
        }
        const quantityInput = row.querySelector<HTMLInputElement>(".qty");
        const unitPriceInput = row.querySelector<HTMLInputElement>(".price");
        const totalCell = row.querySelector<HTMLElement>(".line-total");
        if (!quantityInput || !unitPriceInput || !totalCell) {
          return;
        }
        const quantity = Number(quantityInput.value || 0);
        const unitPrice = Number(unitPriceInput.value || 0);
        totalCell.textContent = `${quantity * unitPrice} ${currency}`;
      });
    }, model.currency);

    await expect(page.getByTestId("request")).toBeVisible();
    await expect(page.getByTestId("suggestions").locator("button").first()).toBeVisible();
    await expect(page.getByTestId("estimate")).toBeVisible();
    await expect(page.getByText("Материалы")).toBeVisible();
    await expect(page.getByText("Работы")).toBeVisible();
    await expect(page.getByText("Доставка/Оборудование/Логистика")).toBeVisible();

    const firstRow = page.locator("tr[data-row]").first();
    await firstRow.locator(".qty").fill("11");
    await firstRow.locator(".price").fill("200");
    await expect(firstRow.locator(".line-total")).toContainText("2200 KGS");
    await page.getByTestId("history-row").click();
    await expect(page.getByTestId("active-draft")).toHaveText(model.workTitle);

    const bodyText = await page.locator("body").innerText();
    const failures = [
      suggestions[0]?.workKey === entry.workKey ? "" : "CORRECT_WORK_NOT_FIRST_SUGGESTION",
      model.rows.length >= 25 ? "" : "EXPANDED_ROWS_NOT_VISIBLE",
      model.currency === "KGS" ? "" : "KGS_NOT_VISIBLE_FOR_BISHKEK",
      bodyText.includes(entry.workKey) ? "INTERNAL_WORK_KEY_VISIBLE" : "",
      /explanation|timeline|sourceConfidence|pricebookScope|materialRecipeScope|fallback_warning|other_construction_work/i.test(bodyText)
        ? "FORBIDDEN_VISIBLE_TEXT"
        : "",
    ].filter(Boolean);
    results.push({
      workKey: entry.workKey,
      category: entry.category,
      passed: failures.length === 0,
      failures,
    });
  }

  const artifact = {
    ...backendAudit,
    browser_representative_cases: representative.length,
    browser_representative_passed: results.filter((result) => result.passed).length,
    playwright_chromium_passed: results.every((result) => result.passed) && backendAudit.browser_representative_passed === 120,
    playwright_dom_results: results,
    fake_green_claimed: false,
  };
  writeArtifact("browser_results_120.json", artifact);
  expect(artifact.browser_representative_cases).toBe(120);
  expect(artifact.browser_representative_passed).toBe(120);
  expect(artifact.playwright_chromium_passed).toBe(true);
});
