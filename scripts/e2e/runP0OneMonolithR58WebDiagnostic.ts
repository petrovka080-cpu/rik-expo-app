import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function proofSession(): Record<string, unknown> {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  const email = "p0-one-monolith-r58-web-diagnostic@example.invalid";
  const accessToken = `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
    aud: "authenticated",
    exp: expiresAt,
    iat: issuedAt,
    sub: OWNER_ID,
    role: "authenticated",
    email,
  })}.proof`;
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: OWNER_ID,
      aud: "authenticated",
      role: "authenticated",
      email,
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(),
      phone: "",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(),
      updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
  };
}

async function main(): Promise<void> {
  const baseUrl = argument("base-url", "http://127.0.0.1:8188").replace(/\/+$/, "");
  const output = path.resolve(argument(
    "output",
    ".release-runtime/p0-one-monolith-r58/evidence/11-web-android/web-diagnostic",
  ));
  mkdirSync(output, { recursive: true });

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: Array<{ method: string; url: string; status: number }> = [];
  const canonicalResponses: Array<{ method: string; url: string; status: number }> = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: `sb-${PROJECT_REF}-auth-token`, session: proofSession() });
  await context.route("**/auth/v1/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify((proofSession().user as Record<string, unknown>) ?? {}),
    });
  });
  await context.route("**/rest/v1/rpc/get_my_role", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify("consumer") });
  });
  await context.route("**/rest/v1/rpc/ensure_my_profile", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: "null" });
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    }
    if (response.url().includes("/canonical-estimate/")) {
      canonicalResponses.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    }
  });

  let report: Record<string, unknown>;
  try {
    const response = await page.goto(`${baseUrl}/request?r58Diagnostic=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    const input = page.getByTestId("consumer-repair-problem-input");
    await input.fill("ламинат");
    await page.getByTestId("consumer-repair-work-suggestions").waitFor({ state: "visible", timeout: 45_000 });
    const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
    await suggestions.first().waitFor({ state: "visible", timeout: 45_000 });
    const suggestionCount = await suggestions.count();
    const suggestionTexts = await suggestions.allInnerTexts();
    const totalText = await page.getByTestId("consumer-repair-work-search-total").innerText();

    const exactIndex = suggestionTexts.findIndex((text) => /ламинат/i.test(text));
    if (exactIndex < 0) throw new Error(`R58_LAMINATE_SUGGESTION_MISSING:${suggestionTexts.slice(0, 5).join("|")}`);
    await suggestions.nth(exactIndex).click();
    const buildButton = page.getByTestId("consumer-repair-prepare-draft");
    await buildButton.waitFor({ state: "visible", timeout: 30_000 });
    await buildButton.click();
    await page.getByTestId("consumer-repair-draft").waitFor({ state: "visible", timeout: 120_000 });
    const baselineReleaseText = await page.getByTestId("consumer-repair-draft-release-id").innerText();
    const baselineRowCountText = await page.getByTestId("request-estimate-row-count").innerText();
    const legacyParameterCardCount = await page.locator('[data-testid^="editable-param-chip-"]').count();
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("canonical-estimate-parameter-form").waitFor({ state: "visible", timeout: 60_000 });
    const canonicalHistory = page.locator('[data-testid^="canonical-estimate-history-revision-"]');
    await canonicalHistory.first().waitFor({ state: "visible", timeout: 30_000 });
    const canonicalHistoryCount = await canonicalHistory.count();
    const parameterProgressText = await page.getByTestId("canonical-estimate-required-parameter-progress").innerText();
    await page.getByTestId("canonical-estimate-refine-parameters").click();
    const parameterTruthToggles = page.locator('[data-testid^="canonical-estimate-parameter-truth-toggle-"]');
    await parameterTruthToggles.first().waitFor({ state: "visible", timeout: 30_000 });
    const parameterCount = await parameterTruthToggles.count();
    const inlineGuideCount = await page.locator('[data-testid^="canonical-estimate-parameter-guide-"]').count();
    const bodyText = await page.locator("body").innerText();
    await page.screenshot({ path: path.join(output, "laminate-selected.png"), fullPage: true });

    const forbiddenRuntimeErrors = [
      "CONSUMER_REPAIR_EDITABLE_ESTIMATE_INVALID:SNAPSHOT_HASH_STATE",
      "CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING",
      "CONSUMER_REPAIR_EDITABLE_ESTIMATE_INVALID_SNAPSHOT_HASH_STATE",
    ];
    const blockers = [
      response?.ok() === true ? "" : `REQUEST_HTTP_${response?.status() ?? 0}`,
      suggestionCount > 0 ? "" : "SEARCH_SUGGESTIONS_EMPTY",
      exactIndex >= 0 ? "" : "LAMINATE_EXACT_RESULT_MISSING",
      canonicalHistoryCount > 0 ? "" : "PRELIMINARY_BASELINE_REVISION_NOT_VISIBLE",
      parameterCount === 5 ? "" : `LAMINATE_PARAMETER_CARDS_${parameterCount}_OF_5`,
      inlineGuideCount === parameterCount ? "" : `INLINE_PARAMETER_GUIDES_${inlineGuideCount}_OF_${parameterCount}`,
      ...forbiddenRuntimeErrors.filter((marker) => bodyText.includes(marker)).map((marker) => `VISIBLE_${marker}`),
      ...pageErrors.map((error) => `PAGE_ERROR:${error}`),
      ...consoleErrors.map((error) => `CONSOLE_ERROR:${error}`),
      ...canonicalResponses.filter((item) => item.status >= 400).map((item) => `API_${item.status}:${item.url}`),
    ].filter(Boolean);
    report = {
      schemaVersion: "p0-one-monolith-r5.8-web-diagnostic.v1",
      generatedAt: new Date().toISOString(),
      baseUrl,
      requestHttpStatus: response?.status() ?? null,
      search: { query: "ламинат", suggestionCount, suggestionTexts, totalText, exactIndex },
      selected: {
        legacyParameterCardCount,
        parameterCount,
        inlineGuideCount,
        canonicalHistoryCount,
        parameterProgressText,
        baselineReleaseText,
        baselineRowCountText,
      },
      canonicalResponses,
      failedResponses,
      consoleErrors,
      pageErrors,
      blockers,
      status: blockers.length === 0 ? "GREEN" : "RED",
    };
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => undefined);
    report = {
      schemaVersion: "p0-one-monolith-r5.8-web-diagnostic.v1",
      generatedAt: new Date().toISOString(),
      baseUrl,
      canonicalResponses,
      failedResponses,
      consoleErrors,
      pageErrors,
      blockers: [error instanceof Error ? error.message : String(error)],
      status: "RED",
    };
  } finally {
    await browser.close();
  }

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(path.join(output, "summary.json"), serialized, "utf8");
  const sha256 = createHash("sha256").update(serialized).digest("hex");
  process.stdout.write(`${JSON.stringify({ ...report, sha256 }, null, 2)}\n`);
  if (report.status !== "GREEN") process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
