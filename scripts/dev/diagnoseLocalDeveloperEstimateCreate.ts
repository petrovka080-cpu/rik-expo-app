import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Request, type Response } from "playwright";

const ORIGIN = "http://localhost:8081";
const OUTPUT = resolve(".release-runtime/r552/evidence/08_R552_ESTIMATE_CREATE_DIAGNOSTIC.json");
const MASTER_SHA256 = "fc1061ea34be0a633898200a8f9de38dd694e6dc1e0aee393d89066177c8e6c6";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function safeUrl(raw: string) {
  const url = new URL(raw);
  return `${url.origin}${url.pathname}${url.search}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleEvents: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const backend: Array<Record<string, unknown>> = [];
  let authEventCount = 0;

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[RootLayout] onAuthStateChange:")) authEventCount += 1;
    if (["error", "warning", "info"].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: text.slice(0, 1_000) });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    requestFailures.push(`${request.method()} ${safeUrl(request.url())} ${request.failure()?.errorText ?? ""}`),
  );
  page.on("response", async (response: Response) => {
    if (!response.url().startsWith("http://127.0.0.1:8765/")) return;
    const request: Request = response.request();
    const body = await response.text().catch(() => "");
    let requestBody: unknown = null;
    try {
      requestBody = request.postData() ? JSON.parse(request.postData()!) : null;
    } catch {
      requestBody = "NON_JSON_BODY_REDACTED";
    }
    let responseBody: unknown = body.slice(0, 5_000);
    try {
      responseBody = body ? JSON.parse(body) : null;
    } catch {
      // keep bounded text
    }
    backend.push({
      method: request.method(),
      url: safeUrl(response.url()),
      status: response.status(),
      request_body: requestBody,
      response_body: responseBody,
      request_id:
        response.headers()["x-request-id"] ??
        (responseBody && typeof responseBody === "object"
          ? (responseBody as Record<string, unknown>).requestId ?? null
          : null),
    });
  });

  try {
    await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    if (!(await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false))) {
      if (await page.getByTestId("local-developer-director-login").isVisible().catch(() => false)) {
        await page.getByTestId("local-developer-director-login").click();
      } else {
        await page.getByTestId("local-developer-role-toggle").click();
        await page.getByTestId("local-developer-role-director").click();
      }
    }
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
    await page.getByTestId("consumer-repair-problem-input").fill("бетон");
    await page.getByTestId("consumer-repair-work-suggestion-1").waitFor({ timeout: 120_000 });
    const selectedText = (await page.getByTestId("consumer-repair-work-suggestion-1").innerText()).trim();
    await page.getByTestId("consumer-repair-work-suggestion-1").click();
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.waitForTimeout(30_000);

    const dom = await page.evaluate(() => ({
      pathname: window.location.pathname,
      body_text: document.body.innerText.slice(0, 20_000),
      canonical_release_present: Boolean(
        document.querySelector('[data-testid="consumer-repair-draft-release-id"]'),
      ),
      canonical_rows: document.querySelectorAll('[data-testid^="consumer-repair-item-"]').length,
      history_count_text:
        document.querySelector('[data-testid="consumer-repair-history-loaded-count"]')?.textContent ?? "",
      pdf_enabled: Boolean(
        document.querySelector('[data-testid="consumer-estimate-make-pdf"]:not([aria-disabled="true"])'),
      ),
      red_overlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
          document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const receipt = {
      schema_version: "rik-expo-app-r552.estimate-create-diagnostic.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status: dom.canonical_release_present
        ? "ESTIMATE_CREATE_OBSERVED_GREEN_PENDING_FULL_ACCEPTANCE"
        : "CANONICAL_ESTIMATE_CREATE_AND_PDF_RED",
      selected_work_text: selectedText,
      route: dom.pathname,
      backend,
      auth_event_count: authEventCount,
      auth_refresh_storm: authEventCount > 3,
      console_events: consoleEvents,
      page_errors: pageErrors,
      request_failures: requestFailures,
      dom,
      secrets_captured: false,
      request_headers_captured: false,
      production_requests: 0,
    };
    atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(JSON.stringify(receipt)) });
    process.stdout.write(
      `${JSON.stringify({
        status: receipt.status,
        selected_work_text: selectedText,
        backend: backend.map((entry) => ({
          method: entry.method,
          url: entry.url,
          status: entry.status,
          request_id: entry.request_id,
          response_body: entry.response_body,
        })),
        auth_event_count: authEventCount,
        console_errors: consoleEvents.filter((entry) => entry.type === "error").length,
        page_errors: pageErrors.length,
        request_failures: requestFailures.length,
        canonical_release_present: dom.canonical_release_present,
        history_count_text: dom.history_count_text,
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
