import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const WEB_ORIGIN = "http://localhost:8081";
const PROVIDER_ORIGIN = "http://127.0.0.1:54321";
const AUTH_CONTAINER = "supabase_auth_rik-r52-a7-provider-20260824";
const DURATION_MS = 10 * 60 * 1_000;
const SAMPLE_INTERVAL_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const SOURCE = resolve("scripts/dev/runR555AuthNormalTtlSoak.ts");
const UPSTREAM = resolve(
  ".release-runtime/r555/evidence/23E_R555_AUTH_RBAC_SECURITY_MATRIX.json",
);
const OUTPUT = resolve(
  ".release-runtime/r555/evidence/23F_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_AUTH_NORMAL_TTL_SOAK:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function endpointOnly(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function normalTtlSeconds(): number | null {
  const raw = execFileSync(
    "docker",
    ["inspect", AUTH_CONTAINER, "--format", "{{json .Config.Env}}"],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  ).trim();
  const env = JSON.parse(raw) as string[];
  const entry = env.find((value) => value.startsWith("GOTRUE_JWT_EXP="));
  const parsed = Number(entry?.split("=")[1] ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

async function main(): Promise<void> {
  const upstream = JSON.parse(readFileSync(UPSTREAM, "utf8")) as Json;
  invariant(upstream.status === "GREEN_R555_AUTH_RBAC_SECURITY_MATRIX", "UPSTREAM_RED");
  const ttlSeconds = normalTtlSeconds();
  invariant(ttlSeconds === 3_600, `NORMAL_TTL_${ttlSeconds ?? "MISSING"}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const authEvents: Array<{ event: string; elapsed_ms: number }> = [];
  const consoleErrors: Array<{ elapsed_ms: number; sample: string }> = [];
  const pageErrors: Array<{ elapsed_ms: number; sample: string }> = [];
  const requestFailures: Array<{ elapsed_ms: number; endpoint: string; error: string }> = [];
  const productionRequests: string[] = [];
  const observedRequests: Array<{
    elapsed_ms: number;
    method: string;
    endpoint: string;
    refresh_token_grant: boolean;
  }> = [];
  const samples: Json[] = [];
  let soakStartedAt = 0;
  let lastHeartbeatAt = 0;
  const anchorId = randomUUID();

  const elapsed = () => (soakStartedAt > 0 ? Date.now() - soakStartedAt : 0);
  page.on("console", (message) => {
    const text = message.text();
    const event = text.match(/onAuthStateChange:\s*([A-Z_]+)/u)?.[1];
    if (event) authEvents.push({ event, elapsed_ms: elapsed() });
    if (message.type() === "error") {
      consoleErrors.push({ elapsed_ms: elapsed(), sample: text.slice(0, 500) });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ elapsed_ms: elapsed(), sample: error.message.slice(0, 500) });
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      elapsed_ms: elapsed(),
      endpoint: endpointOnly(request.url()),
      error: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("request", (request) => {
    const url = request.url();
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(url)) {
      productionRequests.push(endpointOnly(url));
    }
    const postData = request.postData() ?? "";
    observedRequests.push({
      elapsed_ms: elapsed(),
      method: request.method(),
      endpoint: endpointOnly(url),
      refresh_token_grant:
        endpointOnly(url) === `${PROVIDER_ORIGIN}/auth/v1/token` &&
        (/grant_type=refresh_token/iu.test(url) || /refresh_token/iu.test(postData)),
    });
  });

  try {
    await page.goto(`${WEB_ORIGIN}/request`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("auth.login.screen").waitFor({ timeout: 120_000 });
    await page.getByTestId("auth.login.local-consumer").click();
    const input = page.getByTestId("consumer-repair-problem-input");
    await input.waitFor({ timeout: 120_000 });
    await page.waitForTimeout(2_000);
    const role = await page.evaluate(() => {
      const raw = window.localStorage.getItem("sb-127-auth-token");
      try {
        return raw ? JSON.parse(raw)?.user?.app_metadata?.role ?? null : null;
      } catch {
        return null;
      }
    });
    invariant(role === "consumer", `ROLE_${role ?? "MISSING"}`);
    await input.evaluate((node, value) => {
      (node as HTMLElement).dataset.r555SoakAnchor = value;
    }, anchorId);

    soakStartedAt = Date.now();
    const baselineRequestIndex = observedRequests.length;
    const baselineConsoleIndex = consoleErrors.length;
    const baselinePageErrorIndex = pageErrors.length;
    const baselineRequestFailureIndex = requestFailures.length;
    const baselineAuthEventIndex = authEvents.length;
    process.stdout.write(
      `[r555-auth-soak] started ttl=${ttlSeconds}s duration=${DURATION_MS}ms\n`,
    );

    while (Date.now() - soakStartedAt < DURATION_MS) {
      const nowElapsed = Date.now() - soakStartedAt;
      const snapshot = await page.evaluate(({ expectedAnchor }) => {
        const node = document.querySelector(
          '[data-testid="consumer-repair-problem-input"]',
        ) as HTMLElement | null;
        const raw = window.localStorage.getItem("sb-127-auth-token");
        let role: string | null = null;
        try {
          role = raw ? JSON.parse(raw)?.user?.app_metadata?.role ?? null : null;
        } catch {
          role = null;
        }
        return {
          path: window.location.pathname,
          visibility: document.visibilityState,
          input_visible: Boolean(node && node.getBoundingClientRect().height > 0),
          anchor_preserved: node?.dataset.r555SoakAnchor === expectedAnchor,
          role,
        };
      }, { expectedAnchor: anchorId });
      samples.push({ elapsed_ms: nowElapsed, ...snapshot });
      if (nowElapsed - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatAt = nowElapsed;
        process.stdout.write(
          `[r555-auth-soak] heartbeat elapsed=${Math.floor(nowElapsed / 1_000)}s samples=${samples.length}\n`,
        );
      }
      await page.waitForTimeout(
        Math.min(SAMPLE_INTERVAL_MS, DURATION_MS - (Date.now() - soakStartedAt)),
      );
    }

    const durationMs = Date.now() - soakStartedAt;
    const soakRequests = observedRequests.slice(baselineRequestIndex);
    const soakConsoleErrors = consoleErrors.slice(baselineConsoleIndex);
    const soakPageErrors = pageErrors.slice(baselinePageErrorIndex);
    const soakRequestFailures = requestFailures.slice(baselineRequestFailureIndex);
    const soakAuthEvents = authEvents.slice(baselineAuthEventIndex);
    const refreshRequests = soakRequests.filter((entry) => entry.refresh_token_grant);
    const compileRequests = soakRequests.filter(
      (entry) => entry.method === "POST" && entry.endpoint === "http://127.0.0.1:8765/jobs/compile",
    );
    const searchRequests = soakRequests.filter((entry) => /\/search$/u.test(entry.endpoint));
    const tokenRefreshedEvents = soakAuthEvents.filter(
      (entry) => entry.event === "TOKEN_REFRESHED",
    );
    const routeStable = samples.every(
      (sample) =>
        sample.path === "/request" &&
        sample.visibility === "visible" &&
        sample.input_visible === true &&
        sample.anchor_preserved === true &&
        sample.role === "consumer",
    );
    const checks = {
      exact_duration_at_least_10_minutes: durationMs >= DURATION_MS,
      normal_ttl_3600: ttlSeconds === 3_600,
      consumer_provider_session: role === "consumer",
      route_and_input_stable: routeStable && samples.length >= 60,
      token_refreshed_events_0: tokenRefreshedEvents.length === 0,
      refresh_requests_0: refreshRequests.length === 0,
      refresh_driven_search_0: searchRequests.length === 0,
      refresh_driven_compile_0: compileRequests.length === 0,
      console_errors_0: soakConsoleErrors.length === 0,
      page_errors_0: soakPageErrors.length === 0,
      requestfailed_0: soakRequestFailures.length === 0,
      production_requests_0: productionRequests.length === 0,
      route_mount_replacements_0: samples.every((sample) => sample.anchor_preserved === true),
    };
    const green = Object.values(checks).every(Boolean);
    const receiptBase = {
      schema: "r555.auth-normal-ttl-soak.v1",
      status: green
        ? "GREEN_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES"
        : "RED_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES",
      generated_at_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      source_sha256: sha256(readFileSync(SOURCE)),
      product_source_sha256: {
        supabase_client: sha256(readFileSync(resolve("src/lib/supabaseClient.ts"))),
        root_auth_lifecycle: sha256(
          readFileSync(resolve("src/lib/auth/useAuthLifecycle.ts")),
        ),
        local_review_banner: sha256(
          readFileSync(resolve("src/components/auth/LocalDeveloperReviewBanner.tsx")),
        ),
        root_layout: sha256(readFileSync(resolve("app/_layout.tsx"))),
        canonical_estimate_client: sha256(
          readFileSync(
            resolve(
              "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
            ),
          ),
        ),
      },
      upstream_security_receipt_sha256: sha256(readFileSync(UPSTREAM)),
      duration_ms: durationMs,
      required_duration_ms: DURATION_MS,
      normal_ttl_seconds: ttlSeconds,
      samples: {
        denominator: samples.length,
        green: samples.filter(
          (sample) =>
            sample.path === "/request" &&
            sample.input_visible === true &&
            sample.anchor_preserved === true &&
            sample.role === "consumer",
        ).length,
        first: samples[0] ?? null,
        last: samples.at(-1) ?? null,
      },
      auth: {
        events_during_soak: soakAuthEvents,
        token_refreshed_events: tokenRefreshedEvents.length,
        refresh_requests: refreshRequests.length,
      },
      side_effects: {
        search_requests: searchRequests.length,
        compile_requests: compileRequests.length,
        console_errors: soakConsoleErrors,
        page_errors: soakPageErrors,
        request_failures: soakRequestFailures,
        production_requests: productionRequests.length,
      },
      checks,
      secrets: {
        raw_access_token_persisted: false,
        raw_refresh_token_persisted: false,
        password_persisted: false,
      },
      scope: {
        local_only: true,
        production_accessed: false,
        deployed: false,
        merged: false,
        released: false,
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
        duration_ms: durationMs,
        samples: samples.length,
        token_refreshed: tokenRefreshedEvents.length,
        refresh_requests: refreshRequests.length,
        search_requests: searchRequests.length,
        compile_requests: compileRequests.length,
        console_errors: soakConsoleErrors.length,
        page_errors: soakPageErrors.length,
        requestfailed: soakRequestFailures.length,
      })}\n`,
    );
    invariant(green, "TERMINAL_RED");
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
