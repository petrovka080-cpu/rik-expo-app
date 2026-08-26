import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";

import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "30fc49783985084df9299c6dd1607a0dfb0c9d0137ea6b065ac966692a3b8f10";
const ORIGIN = "http://localhost:8081";
const OUTPUT = resolve(
  ".release-runtime/r551/evidence/04_R551_LOCAL_DEVELOPER_REQUEST_P0_SMOKE.json",
);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main() {
  const fingerprints = computeReleaseFingerprints();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const productionRequests: string[] = [];
  const multipleClientWarnings: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") consoleErrors.push(text);
    if (/Multiple GoTrueClient instances/iu.test(text)) multipleClientWarnings.push(text);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!/sentry|favicon/iu.test(url)) {
      try {
        const parsed = new URL(url);
        requestFailures.push(`${parsed.origin}${parsed.pathname}`);
      } catch {
        requestFailures.push("invalid-request-url");
      }
    }
  });
  page.on("request", (request) => {
    const url = request.url();
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(url)) {
      productionRequests.push(url);
    }
  });

  try {
    await page.goto(`${ORIGIN}/request`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({
      state: "visible",
      timeout: 180_000,
    });
    await page.getByTestId("auth.login.screen").waitFor({
      state: "visible",
      timeout: 60_000,
    });

    await page.getByTestId("local-developer-role-toggle").click();
    await page.getByTestId("local-developer-role-director").click();
    await page.waitForURL((url) => url.pathname === "/request", {
      timeout: 120_000,
    });
    await page.getByTestId("consumer-repair-problem-input").waitFor({
      state: "visible",
      timeout: 180_000,
    });
    await page.getByTestId("consumer-repair-problem-input").fill("бетон");
    await page.getByTestId("consumer-repair-work-search-total").waitFor({
      state: "visible",
      timeout: 120_000,
    });
    await page.getByTestId("consumer-repair-work-suggestion-1").waitFor({
      state: "visible",
      timeout: 120_000,
    });
    await page.waitForTimeout(1_000);

    const state = await page.evaluate(() => {
      const identityRaw = (globalThis as typeof globalThis & {
        __RIK_BUILD_IDENTITY_EVIDENCE__?: string;
      }).__RIK_BUILD_IDENTITY_EVIDENCE__;
      const identity = identityRaw ? JSON.parse(identityRaw) : null;
      return {
        pathname: window.location.pathname,
        storageKeys: Object.keys(window.localStorage).sort(),
        hasRecovery: Boolean(document.querySelector('[data-testid="config-recovery-state"]')),
        hasRedOverlay: Boolean(
          document.querySelector('[data-testid="redbox"]') ||
            document.querySelector('[data-testid="error-overlay"]'),
        ),
        hasBanner: Boolean(
          document.querySelector('[data-testid="local-developer-review-banner"]'),
        ),
        hasRequestInput: Boolean(
          document.querySelector('[data-testid="consumer-repair-problem-input"]'),
        ),
        hasCatalogError: Boolean(
          document.querySelector('[data-testid="consumer-repair-work-search-error"]'),
        ),
        catalogRows: document.querySelectorAll(
          '[data-testid^="consumer-repair-work-suggestion-"]:not([data-testid*="-unavailable-"])',
        ).length,
        catalogTotalText:
          document.querySelector('[data-testid="consumer-repair-work-search-total"]')
            ?.textContent ?? "",
        identity,
        bodyText: document.body.innerText.slice(0, 10_000),
      };
    });

    invariant(state.pathname === "/request", "R551_DEVELOPER_RETURN_TO_RED");
    invariant(state.hasBanner, "R551_DEVELOPER_BANNER_RED");
    invariant(state.hasRequestInput, "R551_DEVELOPER_REQUEST_FORM_RED");
    invariant(!state.hasCatalogError, "R551_DEVELOPER_CATALOG_ERROR_RED");
    invariant(state.catalogRows > 0, "R551_DEVELOPER_CATALOG_ROWS_EMPTY");
    invariant(
      /Найдено буквально:\s*227/iu.test(state.catalogTotalText),
      "R551_DEVELOPER_CATALOG_TOTAL_RED",
    );
    invariant(!state.hasRecovery, "R551_CONFIG_RECOVERY_STILL_VISIBLE");
    invariant(!state.hasRedOverlay, "R551_RED_OVERLAY_PRESENT");
    invariant(!state.bodyText.includes("[object Object]"), "R551_OBJECT_OBJECT_PRESENT");
    invariant(
      state.bodyText.includes("Локальный режим разработчика — не production"),
      "R551_DEVELOPER_BANNER_COPY_RED",
    );
    invariant(
      state.storageKeys.includes("sb-127-auth-token"),
      "R551_PROVIDER_SESSION_STORAGE_MISSING",
    );
    invariant(
      state.storageKeys.every((key: string) => !key.includes("service") && !key.includes("secret")),
      "R551_SECRET_STORAGE_KEY_RED",
    );
    invariant(consoleErrors.length === 0, `R551_CONSOLE_ERRORS_${consoleErrors.length}`);
    invariant(pageErrors.length === 0, `R551_PAGE_ERRORS_${pageErrors.length}`);
    invariant(
      requestFailures.length === 0,
      `R551_REQUEST_FAILURES_${requestFailures.length}:${requestFailures.join(",")}`,
    );
    invariant(productionRequests.length === 0, "R551_PRODUCTION_REQUEST_RED");
    invariant(multipleClientWarnings.length === 0, "R551_MULTIPLE_GOTRUE_CLIENT_RED");
    invariant(
      state.identity?.release?.productSourceHash === fingerprints.productSourceHash,
      "R551_SOURCE_IDENTITY_RED",
    );
    invariant(
      state.identity?.release?.jsBundleFingerprint === fingerprints.jsBundleFingerprint,
      "R551_BUNDLE_IDENTITY_RED",
    );

    const receiptBase = {
      schema_version: "rik-expo-app-r551.local-developer-request-p0-smoke.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status: "GREEN_LOCAL_DEVELOPER_REQUEST_P0_SMOKE",
      origin: ORIGIN,
      route: state.pathname,
      real_provider_session: true,
      selected_role: "director",
      dedicated_test_tenant: true,
      canonical_catalog: {
        query: "бетон",
        expected_literal_total: 227,
        visible_rows_minimum: 1,
        error_visible: false,
      },
      counters: {
        console_errors: consoleErrors.length,
        page_errors: pageErrors.length,
        request_failures: requestFailures.length,
        red_overlays: state.hasRedOverlay ? 1 : 0,
        object_object: state.bodyText.includes("[object Object]") ? 1 : 0,
        multiple_gotrue_client_warnings: multipleClientWarnings.length,
        production_requests: productionRequests.length,
      },
      session_storage: {
        exact_provider_key_present: true,
        key_names: state.storageKeys,
        values_captured: false,
      },
      identity: {
        product_source_hash: fingerprints.productSourceHash,
        js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
        developer_label: "LOCAL_DEVELOPMENT",
      },
      scope: {
        production_accessed: false,
        deployed: false,
        released: false,
        merged: false,
        ota: false,
      },
    };
    atomicJson(OUTPUT, {
      ...receiptBase,
      payload_sha256: sha256(JSON.stringify(receiptBase)),
    });
    process.stdout.write(
      `${JSON.stringify({
        status: receiptBase.status,
        route: state.pathname,
        role: "director",
        console_errors: 0,
        page_errors: 0,
        red_overlays: 0,
        production_requests: 0,
      })}\n`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
