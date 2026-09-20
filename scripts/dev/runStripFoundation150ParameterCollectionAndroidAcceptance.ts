import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, type Locator, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const DEVICE_ID = "emulator-5554";
const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const APP_ORIGIN = "http://127.0.0.1:8081";
const PROMPT = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
const MASTER_SHA256 = "4F7EC5DA9C9262291AF11544433D96EF5466BA1ACF07288A327A3EC8FA2374C8";
const OUTPUT_ROOT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a13-6-i15-foundation-150/03_ANDROID_MOBILE_WEB_CHROME",
);
const CREDENTIALS = path.resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`I15_ANDROID:${code}`);
}

function adb(args: string[], encoding: BufferEncoding | null = "utf8"): string | Buffer {
  return execFileSync("adb", ["-s", DEVICE_ID, ...args], {
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
}

function mark(stage: string, details: Json = {}): void {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_ROOT, "progress.json"), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    stage,
    ...details,
  }, null, 2)}\n`, "utf8");
}

async function waitForVisible(locator: Locator, timeout = 120_000): Promise<void> {
  await locator.waitFor({ state: "visible", timeout });
}

async function waitForText(locator: Locator, expected: RegExp, timeout = 180_000): Promise<string> {
  const deadline = Date.now() + timeout;
  let last = "";
  while (Date.now() < deadline) {
    last = await locator.innerText().catch(() => "");
    if (expected.test(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`I15_ANDROID:TEXT_TIMEOUT:${expected.source}:${last}`);
}

async function enterConsumer(page: Page): Promise<void> {
  await page.goto(`${APP_ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false) && await input.isEditable().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login"))
      .first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click().catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`I15_ANDROID:CONSUMER_ROUTE_NOT_READY:${page.url()}`);
}

async function fillNumber(page: Page, parameterId: string, value: string): Promise<void> {
  const card = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (!await card.isVisible().catch(() => false)) {
    const toggle = page.getByTestId("request-estimate-parameters-toggle");
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
  }
  await waitForVisible(card, 60_000);
  await card.getByTestId("editable-param-popover-input").fill(value);
}

async function choose(page: Page, parameterId: string, value: string): Promise<void> {
  const option = page.getByTestId(`editable-param-option-${parameterId}-${value}`);
  await waitForVisible(option, 60_000);
  await option.click();
}

async function consumerAuthorization(): Promise<string> {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS, "utf8")) as Json;
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json() as Json;
  invariant(response.ok && body.access_token, `CONSUMER_LOGIN_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, route: string): Promise<Json> {
  const response = await fetch(`${BACKEND_ORIGIN}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(body)}`);
  return body;
}

async function waitForRevision(authorization: string, accepted: Json): Promise<Json> {
  const jobId = String(accepted.jobId ?? "");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    invariant(!["failed", "cancelled"].includes(String(job.status)), `JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`I15_ANDROID:JOB_TIMEOUT:${jobId}`);
}

async function rows(authorization: string, revisionId: string): Promise<Json[]> {
  const result = await api(authorization, `revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(result.rows) ? result.rows : [];
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

function prepareAndroidChromeTransport(): void {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS, "utf8")) as Json;
  const providerPort = new URL(String(credentials.provider_url)).port || "80";
  for (const port of ["8081", "8765", providerPort, "54329"]) {
    adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
  }
  adb(["shell", "am", "force-stop", "com.android.chrome"]);
  adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", `${APP_ORIGIN}/request`, "com.android.chrome"]);
  execFileSync("adb", ["-s", DEVICE_ID, "forward", "--remove", "tcp:9222"], {
    stdio: "ignore",
    timeout: 10_000,
  });
  execFileSync("adb", ["-s", DEVICE_ID, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"], {
    stdio: "ignore",
    timeout: 10_000,
  });
}

async function resolveAndroidChromeCdpWebSocket(): Promise<string> {
  const deadline = Date.now() + 45_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      execFileSync("adb", ["-s", DEVICE_ID, "forward", "--remove", "tcp:9222"], {
        stdio: "ignore",
        timeout: 10_000,
      });
      execFileSync("adb", ["-s", DEVICE_ID, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"], {
        stdio: "ignore",
        timeout: 10_000,
      });
      const cdpVersion = await fetch("http://127.0.0.1:9222/json/version", {
        signal: AbortSignal.timeout(3_000),
      }).then((response) => response.json()) as Json;
      if (cdpVersion.webSocketDebuggerUrl) return String(cdpVersion.webSocketDebuggerUrl);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`I15_ANDROID:ANDROID_CHROME_CDP_NOT_READY:${lastError}`);
}

function captureDeviceEvidence(): void {
  const screenshot = adb(["exec-out", "screencap", "-p"], null) as Buffer;
  fs.writeFileSync(path.join(OUTPUT_ROOT, "foundation-150-android-device.png"), screenshot);
  adb(["shell", "uiautomator", "dump", "/sdcard/i15-foundation-150.xml"]);
  execFileSync("adb", ["-s", DEVICE_ID, "pull", "/sdcard/i15-foundation-150.xml", path.join(OUTPUT_ROOT, "foundation-150-android-ui.xml")], {
    stdio: "ignore",
    timeout: 30_000,
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  mark("STARTING_ANDROID_CHROME");
  invariant(String(adb(["shell", "getprop", "ro.build.version.sdk"])).trim() === "34", "API34_REQUIRED");
  invariant(String(adb(["shell", "getprop", "sys.boot_completed"])).trim() === "1", "DEVICE_NOT_BOOTED");
  prepareAndroidChromeTransport();
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const cdpWebSocketUrl = await resolveAndroidChromeCdpWebSocket();

  const authorization = await consumerAuthorization();
  const browser = await chromium.connectOverCDP(cdpWebSocketUrl);
  const context = browser.contexts()[0];
  invariant(context, "ANDROID_CHROME_CONTEXT_MISSING");
  const page = context.pages().at(-1);
  invariant(page, "ANDROID_CHROME_PAGE_MISSING");
  const backendResponses: Json[] = [];
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND_ORIGIN}/`)) return;
    backendResponses.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
    });
  });

  try {
    await enterConsumer(page);
    const userAgent = await page.evaluate(() => navigator.userAgent);
    invariant(/Android/iu.test(userAgent), `ANDROID_USER_AGENT_REQUIRED:${userAgent}`);
    mark("ANDROID_CONSUMER_OPENED", { userAgent });

    await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await waitForVisible(page.getByTestId("consumer-estimate-parameter-collection"));
    await waitForVisible(page.getByTestId("request-estimate-missing-param-strip_width_m"));
    const draftUrl = page.url();
    const draftId = new URL(draftUrl).searchParams.get("draftId");
    invariant(draftId, "DRAFT_ID_MISSING");
    const filledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filledToggle.isVisible().catch(() => false)) await filledToggle.click();
    invariant(await page.getByTestId("editable-param-chip-total_axis_length_m")
      .getByTestId("editable-param-popover-input").inputValue() === "150", "RECOGNIZED_LENGTH_RED");

    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    invariant(page.url() === draftUrl, "PARAMETER_COLLECTION_DRAFT_URL_DRIFT");
    await waitForVisible(page.getByTestId("consumer-estimate-parameter-collection"));
    mark("ANDROID_PARAMETER_COLLECTION_COLD_RELOAD_GREEN", { draftId, draftUrl });

    await fillNumber(page, "strip_width_m", "0.6");
    await fillNumber(page, "strip_height_m", "1.2");
    await page.getByTestId("editable-param-batch-apply").click();
    await waitForVisible(page.getByTestId("request-estimate-missing-param-preparation_thickness_m"));
    await fillNumber(page, "preparation_thickness_m", "0.1");
    await fillNumber(page, "reinforcement_mass_t", "9");
    await fillNumber(page, "binding_wire_mass_kg", "108");
    await fillNumber(page, "formwork_transport_mass_t", "20");
    await choose(page, "groundworks_included", "false");
    await choose(page, "foundation_bedding_included", "false");
    await choose(page, "waterproofing_included", "false");
    await choose(page, "backfill_included", "false");

    const compilePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST", { timeout: 120_000 });
    const [compileResponse] = await Promise.all([
      compilePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}`);
    const initialRevision = await waitForRevision(authorization, await responseJson(compileResponse));
    invariant(Number(initialRevision.parameters.total_axis_length_m) === 150, "COMPILED_LENGTH_RED");
    await waitForText(page.getByTestId("request-estimate-row-count"), /15/u);
    await waitForText(page.getByTestId("request-estimate-parameter-status"), /Обязательные параметры заполнены/u);
    mark("ANDROID_CREATE_GREEN", { initialRevisionId: initialRevision.revisionId });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    invariant(page.url() === draftUrl, "COMPILED_DRAFT_URL_DRIFT");
    await waitForText(page.getByTestId("request-estimate-row-count"), /15/u);

    await fillNumber(page, "strip_width_m", "0.7");
    const recalculatePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", { timeout: 120_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    invariant(recalculateResponse.status() === 202, `RECALCULATE_HTTP_${recalculateResponse.status()}`);
    const editedRevision = await waitForRevision(authorization, await responseJson(recalculateResponse));
    invariant(editedRevision.parentRevisionId === initialRevision.revisionId, "EDIT_PARENT_RED");
    invariant(Number(editedRevision.parameters.strip_width_m) === 0.7, "EDITED_WIDTH_RED");
    const editedRows = await rows(authorization, editedRevision.revisionId);
    invariant(editedRows.length === 15, `EDITED_ROW_COUNT_${editedRows.length}`);
    invariant(Number(editedRows.find((row) => row.rowId === "main_concrete")?.quantity) === 126, "EDITED_CONCRETE_RED");
    mark("ANDROID_EDIT_GREEN", { editedRevisionId: editedRevision.revisionId });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    invariant(page.url() === draftUrl, "EDITED_DRAFT_URL_DRIFT");
    await waitForText(page.getByTestId("request-estimate-row-count"), /15/u);
    const parameterToggle = page.getByTestId("request-estimate-parameters-toggle");
    if (await parameterToggle.isVisible().catch(() => false)) await parameterToggle.click();
    invariant(await page.getByTestId("editable-param-chip-strip_width_m")
      .getByTestId("editable-param-popover-input").inputValue() === "0.7", "EDITED_WIDTH_RELOAD_RED");

    await page.getByTestId("consumer-estimate-open-procurement").click();
    await waitForVisible(page.getByTestId("consumer-estimate-procurement-list"));
    const pdfFilePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND_ORIGIN}/canonical-estimate/artifact-files/`)
        && response.status() === 200, { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfFileResponse = await pdfFilePromise;
    invariant(String(pdfFileResponse.headers()["content-type"]).includes("application/pdf"), "PDF_CONTENT_TYPE_RED");
    await waitForVisible(page.getByTestId("pdf-viewer-web-iframe"));
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
    invariant(page.url() === draftUrl, "PDF_RETURN_URL_RED");
    await waitForText(page.getByTestId("request-estimate-row-count"), /15/u);
    invariant((await page.getByTestId("estimate-revision-timeline").getAttribute("aria-label"))
      ?.includes("2-revisions--1-diffs"), "REVISION_HISTORY_RED");
    await waitForText(page.getByTestId("estimate-revision-diff-param-strip_width_m"), /0\.6.*0\.7/u);
    await waitForText(page.getByTestId("estimate-current-revision-artifacts"), /PDF.*закупк.*актуальн/iu);
    const approve = page.getByTestId("consumer-repair-approve").last();
    invariant(await approve.isDisabled(), "UNVERIFIED_PRICES_MUST_BLOCK_APPROVAL");
    await waitForText(approve, /без цены 15/iu);

    captureDeviceEvidence();
    await page.screenshot({ path: path.join(OUTPUT_ROOT, "foundation-150-android-page.png"), fullPage: true });
    const receipt = {
      capturedAt: new Date().toISOString(),
      status: "GREEN_I15_ANDROID_MOBILE_WEB_CHROME_CREATE_EDIT_COLD_PDF_PROCUREMENT_REVISION_HISTORY",
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      masterSha256: MASTER_SHA256,
      platform: "android-chrome",
      evidenceClass: "MOBILE_WEB_ON_ANDROID_NOT_NATIVE_APP",
      browserPackage: "com.android.chrome",
      chromeCdpUsed: true,
      actualNativeAppPackageCovered: false,
      nativeCreateEditClaimAllowed: false,
      deviceId: DEVICE_ID,
      androidApi: 34,
      userAgent,
      prompt: PROMPT,
      draftId,
      draftUrl,
      initialRevisionId: initialRevision.revisionId,
      editedRevisionId: editedRevision.revisionId,
      parentRevisionId: editedRevision.parentRevisionId,
      recognizedLengthM: initialRevision.parameters.total_axis_length_m,
      editedWidthM: editedRevision.parameters.strip_width_m,
      editedConcreteQuantityM3: editedRows.find((row) => row.rowId === "main_concrete")?.quantity,
      rowCount: editedRows.length,
      creation: "GREEN_MOBILE_WEB_ONLY",
      edit: "GREEN_MOBILE_WEB_ONLY",
      coldReload: "GREEN",
      procurement: "GREEN",
      pdfAndReturn: "GREEN",
      revisionHistory: "GREEN_2_REVISIONS_1_DIFF",
      approval: "CORRECTLY_BLOCKED_15_UNVERIFIED_PRICES",
      backendResponses,
      productionRequests: 0,
      deployPerformed: false,
      activationPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, "acceptance.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    mark("ANDROID_ACCEPTANCE_GREEN", { editedRevisionId: editedRevision.revisionId });
    process.stdout.write(`${JSON.stringify({ status: receipt.status, editedRevisionId: editedRevision.revisionId })}\n`);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  mark("ANDROID_ACCEPTANCE_RED", {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
