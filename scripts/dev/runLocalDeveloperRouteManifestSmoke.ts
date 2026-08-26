import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

import { PLATFORM_DEVELOPER_ACCESS_MATRIX } from "../../src/lib/platformDeveloper/platformDeveloperAccessMatrix";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const ORIGIN = process.env.R555_WEB_ORIGIN ?? "http://localhost:8081";
const OUTPUT = resolve(
  ".release-runtime/r555/evidence/23B_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST.json",
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
function endpoint(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-request-url";
  }
}

async function signInDirector(page: Page) {
  await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("auth.login.screen").waitFor({ timeout: 60_000 });
  await page.getByTestId("local-developer-role-toggle").click();
  await page.getByTestId("local-developer-role-director").click();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("sb-127-auth-token");
    if (!raw) return false;
    try {
      return JSON.parse(raw)?.user?.app_metadata?.role === "director";
    } catch {
      return false;
    }
  }, undefined, { timeout: 120_000 });
  await page.waitForURL((url) => url.pathname === "/request", { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
}

async function verifyRoute(
  context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>,
  entry: (typeof PLATFORM_DEVELOPER_ACCESS_MATRIX)[number],
) {
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const productionRequests: string[] = [];
  const multipleClientWarnings: string[] = [];
  const httpErrors: Array<{ status: number; endpoint: string }> = [];
  page.on("console", (message) => {
    const messageText = message.text();
    if (message.type() === "error") consoleErrors.push(messageText.slice(0, 500));
    if (/Multiple GoTrueClient instances/iu.test(messageText)) {
      multipleClientWarnings.push(messageText.slice(0, 500));
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 500)));
  page.on("requestfailed", (request) => {
    if (!/sentry|favicon/iu.test(request.url())) requestFailures.push(endpoint(request.url()));
  });
  page.on("request", (request) => {
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
      productionRequests.push(endpoint(request.url()));
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    httpErrors.push({ status: response.status(), endpoint: endpoint(response.url()) });
  });

  try {
    await page.goto(`${ORIGIN}${entry.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 120_000 });
    if ("expectedShellTestId" in entry) {
      await Promise.race([
        page.getByTestId(entry.expectedShellTestId).waitFor({ timeout: 60_000 }),
        page.getByTestId("office-role-guard-blocked").waitFor({ timeout: 60_000 }),
        page.getByTestId("office-role-auth-degraded").waitFor({ timeout: 60_000 }),
      ]).catch(() => undefined);
    } else {
      await page.waitForTimeout(1_500);
    }
    const state = await page.evaluate(() => ({
      pathname: window.location.pathname,
      bodyText: document.body.innerText.replace(/\s+/gu, " ").trim().slice(0, 2_000),
      protectedFailure: Boolean(
        document.querySelector('[data-testid^="protected-identity-state-"]'),
      ),
      configRecovery: Boolean(document.querySelector('[data-testid="config-recovery-state"]')),
      redOverlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
          document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const expectedPath = entry.route;
    const notFound = /Страница не найдена|page not found/iu.test(state.bodyText);
    const loginRedirect = state.pathname.startsWith("/auth/");
    const green =
      state.pathname === expectedPath &&
      state.bodyText.length > 0 &&
      !state.protectedFailure &&
      !state.configRecovery &&
      !state.redOverlay &&
      !notFound &&
      !loginRedirect &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      requestFailures.length === 0 &&
      productionRequests.length === 0 &&
      multipleClientWarnings.length === 0;
    return {
      area: entry.area,
      route: entry.route,
      route_module: entry.routeModule,
      expected_role: "effectiveRole" in entry ? entry.effectiveRole : null,
      final_path: state.pathname,
      body_visible: state.bodyText.length > 0,
      protected_failure: state.protectedFailure,
      config_recovery: state.configRecovery,
      red_overlay: state.redOverlay,
      not_found: notFound,
      login_redirect: loginRedirect,
      console_errors: consoleErrors.length,
      console_error_messages: consoleErrors,
      page_errors: pageErrors.length,
      request_failures: requestFailures,
      production_requests: productionRequests,
      multiple_client_warnings: multipleClientWarnings.length,
      http_errors: httpErrors,
      verdict: green ? "GREEN" : "RED",
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const fingerprints = computeReleaseFingerprints();
  const requestedRoute = String(process.argv[2] ?? "").trim();
  const entries = requestedRoute
    ? PLATFORM_DEVELOPER_ACCESS_MATRIX.filter((entry) => entry.route === requestedRoute)
    : PLATFORM_DEVELOPER_ACCESS_MATRIX;
  invariant(entries.length > 0, "R555_ROUTE_MANIFEST_FILTER_RED");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  try {
    const loginPage = await context.newPage();
    await signInDirector(loginPage);
    await loginPage.close();

    const routes: Json[] = [];
    for (const entry of entries) {
      routes.push(await verifyRoute(context, entry));
    }
    const green = routes.filter((route) => route.verdict === "GREEN").length;
    const receiptBase = {
      schema_version: "rik-expo-app-r555.local-developer-route-manifest.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status:
        green === entries.length
          ? "GREEN_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST"
          : "RED_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST",
      source: "src/lib/platformDeveloper/platformDeveloperAccessMatrix.ts",
      source_identity: {
        product_source_hash: fingerprints.productSourceHash,
        js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
      },
      principal: {
        provider_issued: true,
        role: "director",
        tenant_class: "dedicated_local_test_tenant",
        credentials_captured: false,
      },
      denominator: entries.length,
      green,
      red: entries.length - green,
      routes,
      scope: {
        production_accessed: false,
        deployed: false,
        released: false,
        merged: false,
        ota: false,
      },
    };
    const output = requestedRoute
      ? resolve(".release-runtime/r555/runtime/local-developer/route-probe.json")
      : OUTPUT;
    atomicJson(output, {
      ...receiptBase,
      payload_sha256: sha256(JSON.stringify(receiptBase)),
    });
    process.stdout.write(
      `${JSON.stringify({
        status: receiptBase.status,
        denominator: receiptBase.denominator,
        green,
        red: receiptBase.red,
        red_routes: routes.filter((route) => route.verdict === "RED").map((route) => route.route),
      })}\n`,
    );
    invariant(green === entries.length, "R551_ROUTE_MANIFEST_RED");
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
