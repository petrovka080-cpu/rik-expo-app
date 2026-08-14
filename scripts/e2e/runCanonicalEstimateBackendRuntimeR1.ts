import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import {
  adb,
  connectAndroidChromeOverCdp,
  forceStopAndroidChromeForCdp,
  prepareAndroidChromeCdp,
  waitForAndroidChromeCdpEndpointReady,
} from "./androidChromeCdpHarness";

const SEARCH_TEXT = "водоотвод для асфальтового покрытия в стандартной зоне";
const EXPECTED_CATALOG_ID = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_standard_professional_expanded_v1";
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";

type Target = "web" | "android-emulator";

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function artifactDirectory(target: Target): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(".release-runtime/master11610-backend-canonical-r1/05-runtime", target, stamp);
}

async function waitForVisible(page: Page, testId: string, timeout = 90_000) {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

async function verifyBackendOffloadFromBrowser(page: Page, revisionId: string) {
  await page.evaluate("globalThis.__name = globalThis.__name || ((target) => target)");
  return page.evaluate(async ({ revisionId, catalogId }) => {
    const base = `${location.protocol}//${location.hostname === "127.0.0.1" || location.hostname === "localhost" ? location.hostname : "10.0.2.2"}:8765/canonical-estimate`;
    const headers = { Authorization: "Bearer local-dev-runtime-token", "Content-Type": "application/json" };
    async function json(path: string, init?: RequestInit) {
      const response = await fetch(`${base}/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
      const body = await response.json();
      if (!response.ok) throw new Error(`${path}:${response.status}:${body?.error?.code ?? "FAILED"}`);
      return body;
    }
    async function waitJob(jobId: string | null) {
      if (!jobId) return null;
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const job = await json(`jobs/${jobId}`);
        if (job.status === "succeeded") return job;
        if (job.status === "failed" || job.status === "cancelled") throw new Error(`JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error("JOB_TIMEOUT");
    }
    async function artifact(kind: "pdf" | "procurement") {
      const accepted = await json(`revisions/${revisionId}/artifacts/${kind}`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `runtime-${kind}-${revisionId}` }),
      });
      await waitJob(accepted.jobId);
      const ready = await json(`revisions/${revisionId}/artifacts/${kind}`);
      if (ready.status !== "ready" || !ready.signedUrl || !ready.sha256 || ready.byteSize <= 0) throw new Error(`ARTIFACT_NOT_READY:${kind}`);
      const downloaded = await fetch(ready.signedUrl);
      const bytes = await downloaded.arrayBuffer();
      if (!downloaded.ok || bytes.byteLength !== ready.byteSize) throw new Error(`ARTIFACT_DOWNLOAD_FAILED:${kind}`);
      return { status: ready.status, contentType: ready.contentType, byteSize: ready.byteSize, sha256: ready.sha256 };
    }
    const procurement = await artifact("procurement");
    const pdf = await artifact("pdf");
    const sourceId = `runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const legacyAccepted = await json("migrations/legacy-revisions", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `runtime-legacy-${sourceId}`,
        sourceEstimateId: `legacy-estimate-${sourceId}`,
        sourceRevisionId: `legacy-revision-${sourceId}`,
        parentCanonicalRevisionId: revisionId,
        catalogId,
        currencyCode: "KGS",
        parameters: { source: "runtime" },
        totals: { amount: "250.00", currencyCode: "KGS" },
        rows: [
          { rowId: "legacy-runtime-material", section: "Материалы", category: "material", titleRu: "Сохранённый материал", unitId: "kg", quantity: "2.5", unitPrice: "100", amount: "250", procurementEligible: true, calculationTrace: {}, normativeTrace: [], sourcePayload: { rowId: "legacy-runtime-material", exactQuantity: "2.5", edit: true } },
          { rowId: "legacy-runtime-note", section: "Работы", category: "labor", titleRu: "Строка без количества", unitId: "hour", quantity: null, unitPrice: null, amount: null, procurementEligible: false, calculationTrace: {}, normativeTrace: [], sourcePayload: { rowId: "legacy-runtime-note", exactQuantity: null, note: "preserve" } },
        ],
      }),
    });
    const legacyJob = await waitJob(legacyAccepted.jobId);
    const legacyRevision = await json(`revisions/${legacyJob.resultRevisionId}`);
    const legacyRows = await json(`revisions/${legacyJob.resultRevisionId}/rows?limit=500`);
    if (legacyRevision.parentRevisionId !== revisionId || legacyRows.rows.length !== 2
      || legacyRows.rows[0].quantity !== "2.500000000" || legacyRows.rows[1].quantity !== null) {
      throw new Error(`LEGACY_RUNTIME_PARITY_FAILED:${JSON.stringify({ revisionId, legacyRevision, rows: legacyRows.rows.map((row: { rowId: string; quantity: unknown }) => ({ rowId: row.rowId, quantity: row.quantity })) })}`);
    }
    return { procurement, pdf, legacyRevisionId: legacyJob.resultRevisionId, legacyRows: legacyRows.rows.length };
  }, { revisionId, catalogId: EXPECTED_CATALOG_ID });
}

async function executeScenario(input: {
  page: Page;
  context: BrowserContext;
  target: Target;
  startUrl: string;
  parameterValue: string;
}) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const backendResponses: Array<{ method: string; url: string; status: number }> = [];
  input.page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  input.page.on("pageerror", (error) => pageErrors.push(error.message));
  input.page.on("response", (response) => {
    if (response.url().includes("/canonical-estimate/")) {
      backendResponses.push({ method: response.request().method(), url: response.url(), status: response.status() });
    }
  });

  await input.page.goto(input.startUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await waitForVisible(input.page, "professional-estimate-composer", 120_000);
  const workInput = await waitForVisible(input.page, "foreman-ai-estimate-input");
  await workInput.fill(SEARCH_TEXT);
  const suggestion = await waitForVisible(input.page, "foreman-ai-estimate-work-suggestion-1");
  const suggestionText = await suggestion.innerText();
  if (!suggestionText.includes(EXPECTED_CATALOG_ID)) throw new Error(`UNEXPECTED_CATALOG_SUGGESTION:${suggestionText}`);
  await suggestion.click();
  await waitForVisible(input.page, "canonical-estimate-parameter-form");
  const parameters = input.page.locator('input[data-testid^="canonical-estimate-parameter-"]');
  const parameterCount = await parameters.count();
  if (parameterCount !== 7) throw new Error(`PARAMETER_SCHEMA_COUNT_MISMATCH:${parameterCount}`);
  for (let index = 0; index < parameterCount; index += 1) await parameters.nth(index).fill(input.parameterValue);

  await input.page.getByTestId("foreman-ai-estimate-generate").click({ force: input.target === "android-emulator" });
  const rowCount = await waitForVisible(input.page, "foreman-ai-estimate-row-count", 120_000);
  await rowCount.waitFor({ state: "visible" });
  await input.page.waitForFunction(() => document.body.innerText.includes("Строк: 10"), null, { timeout: 120_000 });
  const initialVisibleRows = await input.page.getByTestId("foreman-ai-estimate-row").count();
  if (initialVisibleRows < 1) throw new Error("BACKEND_REVISION_ROWS_NOT_RENDERED");

  let offlineAdmissionProven = false;
  let reconnectCompileProven = false;
  if (input.target === "web") {
    await input.context.setOffline(true);
    await parameters.nth(0).fill(String(Number(input.parameterValue) + 1));
    await input.page.getByTestId("foreman-ai-estimate-generate").click();
    await input.page.waitForFunction(() => document.body.innerText.includes("PENDING_SERVER_ADMISSION"), null, { timeout: 45_000 });
    offlineAdmissionProven = true;
    await input.context.setOffline(false);
    await input.page.getByTestId("foreman-ai-estimate-generate").click();
    await input.page.waitForFunction(() => document.body.innerText.includes("Строк: 10"), null, { timeout: 120_000 });
    reconnectCompileProven = true;
  }

  const revisionResponse = [...backendResponses].reverse().find((entry) => /\/revisions\/[0-9a-f-]+$/.test(entry.url));
  const revisionId = revisionResponse?.url.match(/\/revisions\/([0-9a-f-]+)$/)?.[1] ?? null;
  if (!revisionId) throw new Error("BACKEND_REVISION_ID_NOT_OBSERVED");
  const backendOffload = await verifyBackendOffloadFromBrowser(input.page, revisionId);

  const bodyText = await input.page.locator("body").innerText();
  const successfulBackendResponses = backendResponses.filter((entry) => entry.status >= 200 && entry.status < 300);
  const requiredApiEvidence = {
    catalogSearch: successfulBackendResponses.some((entry) => /\/catalog\?/.test(entry.url)),
    catalogDetail: successfulBackendResponses.some((entry) => entry.url.includes(`/catalog/${EXPECTED_CATALOG_ID}`)),
    compileAccepted: successfulBackendResponses.some((entry) => entry.method === "POST" && entry.url.endsWith("/jobs/compile") && entry.status === 202),
    jobPolled: successfulBackendResponses.some((entry) => entry.method === "GET" && /\/jobs\/[0-9a-f-]+$/.test(entry.url)),
    revisionLoaded: successfulBackendResponses.some((entry) => entry.method === "GET" && /\/revisions\/[0-9a-f-]+$/.test(entry.url)),
    rowsLoaded: successfulBackendResponses.some((entry) => entry.method === "GET" && /\/revisions\/[0-9a-f-]+\/rows\?/.test(entry.url)),
    procurementArtifact: backendOffload.procurement.status === "ready",
    pdfArtifact: backendOffload.pdf.status === "ready" && backendOffload.pdf.contentType === "application/pdf",
    legacyRevisionMigration: backendOffload.legacyRows === 2,
  };
  const blockers = [
    ...Object.entries(requiredApiEvidence).filter(([, passed]) => !passed).map(([key]) => `API_EVIDENCE_MISSING:${key}`),
    ...(pageErrors.length ? [`PAGE_ERRORS:${pageErrors.join("|")}`] : []),
    ...(bodyText.includes("PARAMETER_VALIDATION_FAILED") ? ["PARAMETER_VALIDATION_FAILED_VISIBLE"] : []),
    ...(bodyText.includes("CLIENT_VIEW_LIMIT_EXCEEDED") ? ["CLIENT_VIEW_LIMIT_EXCEEDED_VISIBLE"] : []),
    ...(input.target === "web" && !offlineAdmissionProven ? ["OFFLINE_ADMISSION_NOT_PROVEN"] : []),
    ...(input.target === "web" && !reconnectCompileProven ? ["RECONNECT_COMPILE_NOT_PROVEN"] : []),
  ];
  return {
    status: blockers.length === 0 ? "GREEN" : "RED",
    target: input.target,
    startUrl: input.startUrl,
    catalogId: EXPECTED_CATALOG_ID,
    parameterCount,
    initialVisibleRows,
    requiredApiEvidence,
    offlineAdmissionProven,
    reconnectCompileProven,
    backendOffload,
    backendResponses,
    consoleErrors,
    pageErrors,
    blockers,
    bodyTextSample: bodyText.slice(0, 4_000),
  };
}

async function main() {
  const target = (argument("target") ?? "web") as Target;
  if (target !== "web" && target !== "android-emulator") throw new Error(`INVALID_TARGET:${target}`);
  const hostBaseUrl = (argument("base-url") ?? "http://127.0.0.1:8170").replace(/\/+$/, "");
  const startUrl = `${hostBaseUrl}/request?canonicalBackendSmoke=1&prompt=${encodeURIComponent(SEARCH_TEXT)}`;
  const output = artifactDirectory(target);
  mkdirSync(output, { recursive: true });

  let browser: Browser | null = null;
  let close: (() => Promise<void>) | null = null;
  try {
    let context: BrowserContext;
    let page: Page;
    if (target === "web") {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
      page = await context.newPage();
      close = () => browser!.close();
    } else {
      adb(["-s", DEVICE_ID, "reverse", "tcp:8765", "tcp:8765"], 10_000);
      await forceStopAndroidChromeForCdp({ deviceId: DEVICE_ID });
      prepareAndroidChromeCdp({ deviceId: DEVICE_ID, baseUrl: hostBaseUrl, startUrl });
      adb([
        "-s", DEVICE_ID, "shell", "am", "start", "-W",
        "-n", "com.android.chrome/com.google.android.apps.chrome.Main",
        "-a", "android.intent.action.VIEW", "-d", startUrl,
      ], 30_000);
      await waitForAndroidChromeCdpEndpointReady({ deviceId: DEVICE_ID, timeoutMs: 60_000 });
      browser = await connectAndroidChromeOverCdp({ timeoutMs: 60_000 });
      context = browser.contexts()[0] ?? await browser.newContext();
      page = context.pages()[0] ?? await context.newPage();
      close = async () => {
        await browser?.close().catch(() => undefined);
        await forceStopAndroidChromeForCdp({ deviceId: DEVICE_ID });
      };
    }
    const result = await executeScenario({ page, context, target, startUrl, parameterValue: target === "web" ? "10" : "12" });
    const screenshotPath = resolve(output, "canonical-estimate-runtime.png");
    await page.bringToFront();
    if (target === "web") {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } else {
      const screenshot = execFileSync("adb", ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
        encoding: "buffer",
        timeout: 30_000,
      });
      writeFileSync(screenshotPath, screenshot);
    }
    const report = { schemaVersion: "canonical-estimate-backend-runtime.r1", generatedAt: new Date().toISOString(), screenshotPath, ...result };
    const reportPath = resolve(output, "summary.json");
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: report.status, target, reportPath, screenshotPath, requiredApiEvidence: report.requiredApiEvidence, offlineAdmissionProven: report.offlineAdmissionProven, reconnectCompileProven: report.reconnectCompileProven, blockers: report.blockers }, null, 2)}\n`);
    if (report.status !== "GREEN") process.exitCode = 1;
  } finally {
    await close?.().catch(() => undefined);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
