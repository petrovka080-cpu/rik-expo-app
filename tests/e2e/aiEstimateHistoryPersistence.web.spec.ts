import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_AI_ESTIMATE_DRAFT_HISTORY_PERSISTENCE");
const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const PROMPT = "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438 200 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435";

type PersistedBundle = {
  draft: { id: string; status: string };
  pdfs: { revisionId?: string | null }[];
  estimateRevisionState?: {
    current_revision_id: string;
    request_bindings: { request_revision_id: string }[];
  } | null;
};

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function mergeArtifact(name: string, payload: Record<string, unknown>): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, name);
  const previous = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown> : {};
  const head = currentHead();
  fs.writeFileSync(filePath, `${JSON.stringify({
    ...previous,
    wave: WAVE,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
    ...payload,
  }, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function numberFromText(value: string | null | undefined): number | null {
  const compact = String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", ".").trim();
  if (!compact) return null;
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resetRequestStorage(page: Page): Promise<void> {
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
}

async function latestPersistedBundle(page: Page): Promise<PersistedBundle> {
  return await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const bundles = raw ? JSON.parse(raw) as PersistedBundle[] : [];
    if (!bundles[0]) throw new Error("AI_ESTIMATE_PERSISTED_BUNDLE_MISSING");
    return bundles.sort((a, b) => String(b.draft.id).localeCompare(String(a.draft.id)))[0];
  }, STORE_KEY);
}

async function findPricedRow(page: Page): Promise<{ id: string; priceInput: Locator; quantityInput: Locator }> {
  const priceInputs = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  await expect(priceInputs.first()).toBeVisible({ timeout: 60_000 });
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
  throw new Error("AI_ESTIMATE_PRICED_ROW_NOT_FOUND");
}

test.describe("AI estimate history persistence web", () => {
  test.setTimeout(300_000);

  test("persists generated draft, recovers after reload, keeps manual edit, and binds PDF/request revisions", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    await resetRequestStorage(page);

    await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-history-row")).toBeVisible({ timeout: 60_000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-history-row")).toBeVisible({ timeout: 60_000 });

    const row = await findPricedRow(page);
    await row.quantityInput.fill("250");
    await expect(page.getByTestId("request-estimate-revision-version")).toContainText(/2/, { timeout: 30_000 });
    await row.priceInput.fill("1500");
    await expect(page.getByTestId("request-estimate-revision-version")).toContainText(/3/, { timeout: 30_000 });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    const recoveredRow = await findPricedRow(page);
    expect(numberFromText(await recoveredRow.priceInput.inputValue())).toBe(1500);

    await page.getByTestId("consumer-repair-add-photo").click();
    await page.getByTestId("consumer-repair-approve").click();
    await expect(page.getByTestId("consumer-repair-send-market")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("consumer-repair-send-market").click();

    const bundle = await latestPersistedBundle(page);
    const latestPdfRevisionId = bundle.pdfs.find((pdf) => pdf.revisionId)?.revisionId ?? null;
    const requestRevisionId = bundle.estimateRevisionState?.request_bindings[0]?.request_revision_id ?? null;
    expect(bundle.draft.status).toBe("sent_to_marketplace");
    expect(latestPdfRevisionId).toBeTruthy();
    expect(requestRevisionId).toBe(latestPdfRevisionId);

    mergeArtifact("web_results.json", {
      [`web_${testInfo.project.name}_passed`]: true,
      history_contains_ai_draft: true,
      reload_recovers_draft: true,
      manual_edit_persists: true,
      pdf_and_request_same_revision: true,
      failures: [],
    });
  });
});
