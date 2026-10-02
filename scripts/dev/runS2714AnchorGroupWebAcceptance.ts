import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://localhost:8101";
const BACKEND = "http://127.0.0.1:8765";
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load";
const DEFINITION_RELEASE_ID = "43ff52c6-4dc2-575f-a429-c879b483f52e";
const SEARCH_RELEASE_ID = "5fb20f94-1a9c-576b-9eed-db14f02df0da";
const DEFINITION_VERSION_ID = "bfd003f6-721d-5e4f-94bc-62668d4cb28a";
const PROFILE = resolve(".release-runtime/r568/s27-14/tmp-chrome-session-probe");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-14/anchor-group-web-acceptance");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const PROMPT = "Бетонирование основания анкерной группы в зоне высокой нагрузки — 20 m3";
const RESUME_REVISION_ID = process.argv.find((argument) => argument.startsWith("--revision="))
  ?.slice("--revision=".length) ?? null;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_14_ANCHOR_WEB:${code}`);
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

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "S27_14_ANCHOR_WEB", stage, ...details })}\n`);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

function accessTokenFromValue(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    if (value.split(".").length === 3 && value.length > 100) return value;
    try {
      return accessTokenFromValue(JSON.parse(value), depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const token = accessTokenFromValue(entry, depth + 1);
      if (token) return token;
    }
    return null;
  }
  if (typeof value === "object") {
    const object = value as Json;
    if (typeof object.access_token === "string" && object.access_token.length > 100) {
      return object.access_token;
    }
    for (const entry of Object.values(object)) {
      const token = accessTokenFromValue(entry, depth + 1);
      if (token) return token;
    }
  }
  return null;
}

async function browserAuthorization(page: Page): Promise<string> {
  const values = await page.evaluate(() => Object.values(window.localStorage));
  const token = accessTokenFromValue(values);
  invariant(token, "AUTHENTICATED_BROWSER_TOKEN_NOT_FOUND");
  return `Bearer ${token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${String(body.error?.code ?? "UNKNOWN")}`);
  return body;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const response = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(response.rows) ? response.rows : []));
    cursor = String(response.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function waitForAuthenticatedRequest(page: Page): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false)) return;
    if (await page.getByTestId("consumer-repair-screen").isVisible().catch(() => false)
      && await page.getByTestId("auth.login.screen").count() === 0) return;
    const login = page.getByTestId("local-developer-director-login")
      .or(page.getByTestId("auth.login.local-consumer"))
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`S27_14_ANCHOR_WEB:REQUEST_ROUTE_NOT_READY:${page.url()}`);
}

async function expandPositions(page: Page): Promise<void> {
  const content = page.getByTestId("request-estimate-items-editor-content");
  if (await content.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle").first();
  await toggle.waitFor({ state: "visible", timeout: 90_000 });
  await toggle.click();
  await content.waitFor({ state: "visible", timeout: 90_000 });
}

async function attachMaterialPhoto(page: Page): Promise<void> {
  await expandPositions(page);
  const button = page.locator('[data-testid^="estimate-material-row-photo-button-"]').first();
  await button.waitFor({ state: "visible", timeout: 60_000 });
  await button.click();
  const picker = page.locator(
    '[data-testid="mobile-photo-gallery"], [data-testid="mobile-photo-pick-library"]',
  ).first();
  await picker.waitFor({ state: "visible", timeout: 30_000 });
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await picker.click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "s27-14-anchor-group-proof.png", mimeType: "image/png", buffer: PNG });
  await page.getByTestId("mobile-photo-review-screen").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("mobile-photo-use").click();
  await page.getByTestId("mobile-photo-capture-flow").waitFor({ state: "detached", timeout: 120_000 });
  await page.locator('[data-testid^="estimate-material-row-photo-attached-"]').first()
    .waitFor({ state: "visible", timeout: 120_000 });
}

async function fillIfVisible(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).first();
  if (await input.isVisible().catch(() => false)) await input.fill(value);
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const browser = await chromium.launchPersistentContext(PROFILE, {
    headless: true,
    viewport: { width: 1440, height: 1100 },
  });
  const page = browser.pages()[0] ?? await browser.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const marketplaceRpc: Json[] = [];
  let pageAuthorization = "";
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));
  page.on("request", (request) => {
    if (!request.url().startsWith(BACKEND)) return;
    const authorization = request.headers().authorization ?? "";
    if (authorization.startsWith("Bearer ")) pageAuthorization = authorization;
  });
  page.on("response", async (response) => {
    if (response.url().includes("consumer_estimate_marketplace_publish_v1")) {
      marketplaceRpc.push({ status: response.status(), body: await json(response) });
    }
  });

  try {
    const url = new URL("/request", ORIGIN);
    if (RESUME_REVISION_ID) {
      invariant(/^[0-9a-f-]{36}$/iu.test(RESUME_REVISION_ID), "RESUME_REVISION_ID_INVALID");
      url.searchParams.set("canonicalRevisionId", RESUME_REVISION_ID);
    } else {
      url.searchParams.set("catalogWorkId", CATALOG_ID);
      url.searchParams.set("prompt", PROMPT);
      url.searchParams.set("autoPrepare", "1");
      url.searchParams.set("context", `s27-14-anchor-web-${Date.now()}`);
    }
    const compilePromise = RESUME_REVISION_ID ? null : page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
    await waitForAuthenticatedRequest(page);
    if (compilePromise) {
      const compileResponse = await compilePromise;
      const compileBody = await json(compileResponse);
      invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}`);
      progress("COMPILE_ACCEPTED", { jobId: compileBody.jobId });
    } else {
      progress("REVISION_RESUMED", { revisionId: RESUME_REVISION_ID });
    }

    const revisionMarker = page.getByTestId("estimate-current-revision-id");
    const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
    if (RESUME_REVISION_ID) {
      await Promise.race([
        page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 180_000 }),
        openFullEstimate.waitFor({ state: "visible", timeout: 180_000 }),
      ]);
      if (await openFullEstimate.isVisible().catch(() => false)) await openFullEstimate.click();
      await page.getByTestId("request-estimate-items-total-count")
        .waitFor({ state: "visible", timeout: 180_000 });
    } else {
      await Promise.race([
        revisionMarker.waitFor({ state: "attached", timeout: 180_000 }),
        openFullEstimate.waitFor({ state: "visible", timeout: 180_000 }),
      ]);
      if (await revisionMarker.count() === 0) await openFullEstimate.click();
      await revisionMarker.waitFor({ state: "attached", timeout: 180_000 });
    }
    const revisionId = RESUME_REVISION_ID ?? (await revisionMarker.innerText()).trim();
    invariant(/^[0-9a-f-]{36}$/iu.test(revisionId), `REVISION_ID_INVALID:${revisionId}`);
    const authorization = pageAuthorization || await browserAuthorization(page);
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.compatibilityTuple?.definitionReleaseId === DEFINITION_RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && Number(manifest.activeCompileJobCount) === 0,
    "RUNTIME_TUPLE_RED");
    const revision = await api(authorization, `revisions/${revisionId}`);
    const rows = await allRows(authorization, revisionId);
    invariant(revision.catalogId === CATALOG_ID
      && revision.definitionVersionId === DEFINITION_VERSION_ID
      && revision.releaseId === DEFINITION_RELEASE_ID,
    "REVISION_IDENTITY_RED");
    invariant(Number(revision.rowCount) === 36 && rows.length === 36, `ROW_COUNT_${rows.length}`);
    invariant((revision.preliminaryNeeds ?? []).length === 0, "PRELIMINARY_NEEDS_NOT_EMPTY");
    invariant(rows.every((row) => Number(row.quantity) > 0 && row.unitId && row.category),
      "ROW_TYPE_UNIT_QUANTITY_RED");
    const quantities = new Map(rows.map((row) => [String(row.rowId), Number(row.quantity)]));
    invariant(quantities.get("anchor-group-pour:material:ready-mix") === 22
      && quantities.get("anchor-group-pour:work:place") === 20
      && quantities.get("anchor-group-pour:equipment:pump") === 0.625
      && quantities.get("anchor-group-pour:equipment:vibrator") === 5.32
      && quantities.get("anchor-group-pour:delivery:mixer-trips") === 3,
    "KEY_QUANTITIES_RED");
    invariant(!rows.some((row) => Number(row.quantity) === 1 && row.unitId === "man_hour"),
      "ONE_HOUR_PLACEHOLDER_PRESENT");
    await expandPositions(page);
    const visibleTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]').allInnerTexts();
    invariant(visibleTitles.length === 36, `VISIBLE_ROW_COUNT_${visibleTitles.length}`);
    invariant(await page.getByTestId("request-estimate-visible-missing-parameters").count() === 0,
      "VISIBLE_MISSING_PARAMETERS_PRESENT");
    const calculatedScreenshot = resolve(OUTPUT_ROOT, "01_calculated_36_rows.png");
    await page.screenshot({ path: calculatedScreenshot, fullPage: true });
    progress("CALCULATION_GREEN", { revisionId, rowCount: rows.length });

    const initialAttachmentState = await api(
      authorization,
      `revisions/${revisionId}/attachments?includeDeleted=true`,
    );
    const initialAttachmentCount = Array.isArray(initialAttachmentState.attachments)
      ? initialAttachmentState.attachments.length
      : Array.isArray(initialAttachmentState) ? initialAttachmentState.length : 0;
    if (initialAttachmentCount === 0) await attachMaterialPhoto(page);
    const attachmentDeadline = Date.now() + 60_000;
    let committedAttachmentCount = initialAttachmentCount;
    while (Date.now() < attachmentDeadline) {
      const attachmentState = await api(authorization, `revisions/${revisionId}/attachments?includeDeleted=true`);
      committedAttachmentCount = Array.isArray(attachmentState.attachments)
        ? attachmentState.attachments.length
        : Array.isArray(attachmentState) ? attachmentState.length : 0;
      if (committedAttachmentCount > 0) break;
      await page.waitForTimeout(300);
    }
    invariant(committedAttachmentCount > 0, "PHOTO_ATTACHMENT_NOT_COMMITTED");
    const contactPhone = String(process.env.S27_TEST_CONTACT_PHONE ?? "").trim();
    const addressText = String(process.env.S27_TEST_ADDRESS ?? "").trim();
    invariant(contactPhone.replace(/\D/gu, "").length >= 7, "TEST_CONTACT_PHONE_NOT_CONFIGURED");
    invariant(addressText.length > 0, "TEST_ADDRESS_NOT_CONFIGURED");
    await fillIfVisible(page, "consumer-repair-city-input", "Bishkek");
    await fillIfVisible(page, "consumer-repair-address-input", addressText);
    await fillIfVisible(page, "consumer-repair-phone-input", contactPhone);

    const pdfButton = page.getByTestId("consumer-estimate-make-pdf").first();
    await pdfButton.waitFor({ state: "visible", timeout: 90_000 });
    const draftUrl = page.url();
    await pdfButton.click();
    await page.waitForURL(/pdf-viewer/u, { timeout: 120_000 });
    const pdfScreenshot = resolve(OUTPUT_ROOT, "02_pdf_viewer.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });
    await page.goto(draftUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await Promise.race([
      page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 120_000 }),
      openFullEstimate.waitFor({ state: "visible", timeout: 120_000 }),
    ]);
    if (await openFullEstimate.isVisible().catch(() => false)) await openFullEstimate.click();
    await page.getByTestId("consumer-estimate-meaningful-preview")
      .waitFor({ state: "detached", timeout: 120_000 }).catch(() => undefined);
    await page.getByTestId("request-estimate-items-total-count")
      .waitFor({ state: "visible", timeout: 120_000 });
    if (await revisionMarker.count() > 0) {
      invariant((await revisionMarker.innerText()).trim() === revisionId, "PDF_RETURN_REVISION_DRIFT");
    }

    const approve = page.getByTestId("consumer-repair-approve").last();
    await approve.waitFor({ state: "visible", timeout: 90_000 });
    const approvalReadyDeadline = Date.now() + 120_000;
    while (Date.now() < approvalReadyDeadline && !await approve.isEnabled()) {
      if (await openFullEstimate.isVisible().catch(() => false)) await openFullEstimate.click();
      await page.waitForTimeout(500);
    }
    if (!await approve.isEnabled()) {
      const session = await api(authorization, `revisions/${revisionId}/parameter-session`);
      throw new Error(
        `S27_14_ANCHOR_WEB:APPROVAL_DISABLED:${String(session.status ?? "NO_STATUS")}`
        + `:BLOCKING_${Array.isArray(session.blockingMissingParameterIds) ? session.blockingMissingParameterIds.length : -1}`
        + `:CONTRACT_${Array.isArray(session.contractMissingParameterIds) ? session.contractMissingParameterIds.length : -1}`
        + `:INVALID_${Array.isArray(session.invalidParameterIds) ? session.invalidParameterIds.length : -1}`,
      );
    }
    await approve.click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "detached", timeout: 120_000 });
    await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 120_000 });
    const approvedScreenshot = resolve(OUTPUT_ROOT, "03_approved.png");
    await page.screenshot({ path: approvedScreenshot, fullPage: true });
    progress("APPROVAL_GREEN", { revisionId });

    await page.getByTestId("consumer-repair-history-button").click();
    await page.getByTestId("consumer-repair-history-modal").waitFor({ state: "visible", timeout: 60_000 });
    const historyRow = page.getByTestId("consumer-repair-history-row").filter({ hasText: "анкерной группы" }).first();
    await historyRow.waitFor({ state: "visible", timeout: 60_000 });
    await historyRow.getByTestId("consumer-repair-history-main").click();
    await page.getByTestId("consumer-repair-history-readonly-snapshot")
      .waitFor({ state: "visible", timeout: 90_000 });
    invariant(await page.getByTestId("consumer-repair-history-readonly-item").count() === 36,
      "HISTORY_ROW_COUNT_RED");
    const historyRevision = (await page.getByTestId("consumer-repair-history-snapshot-revision-id").count()) > 0
      ? (await page.getByTestId("consumer-repair-history-snapshot-revision-id").innerText()).trim()
      : revisionId;
    invariant(historyRevision.includes(revisionId) || historyRevision === revisionId,
      "HISTORY_REVISION_DRIFT");
    await page.getByTestId("consumer-repair-history-send-market").click();
    await page.getByTestId("consumer-repair-history-backend-procurement-artifact")
      .waitFor({ state: "attached", timeout: 120_000 });
    await page.getByTestId("consumer-repair-marketplace-link").waitFor({ state: "visible", timeout: 120_000 });
    const marketScreenshot = resolve(OUTPUT_ROOT, "04_market_full_handoff.png");
    await page.screenshot({ path: marketScreenshot, fullPage: true });
    const procurement = await api(authorization, `revisions/${revisionId}/artifacts/procurement`);
    invariant(procurement.status === "ready"
      && procurement.revisionId === revisionId
      && procurement.releaseId === DEFINITION_RELEASE_ID,
    "PROCUREMENT_ARTIFACT_IDENTITY_RED");
    invariant(marketplaceRpc.length > 0 && marketplaceRpc.every((entry) => entry.status === 200),
      "MARKETPLACE_RPC_RED");

    const rowKinds = Object.fromEntries([...new Set(rows.map((row) => String(row.category)))].sort()
      .map((kind) => [kind, rows.filter((row) => String(row.category) === kind).length]));
    const screenshots = [calculatedScreenshot, pdfScreenshot, approvedScreenshot, marketScreenshot]
      .map((path) => ({ path, sha256: sha256(readFileSync(path)) }));
    atomicJson(OUTPUT, {
      contract: "rik-expo-app.s27-14.anchor-group-web-acceptance.v1",
      generatedUtc: new Date().toISOString(),
      status: "GREEN_S27_14_ANCHOR_GROUP_WEB_CALCULATE_PDF_APPROVE_HISTORY_MARKET",
      runtime: {
        definitionReleaseId: manifest.compatibilityTuple.definitionReleaseId,
        searchReleaseId: manifest.compatibilityTuple.searchReleaseId,
        sourceHead: manifest.compatibilityTuple.sourceHead,
        sourceTree: manifest.compatibilityTuple.sourceTree,
      },
      revision: {
        revisionId,
        releaseId: revision.releaseId,
        definitionVersionId: revision.definitionVersionId,
        catalogId: revision.catalogId,
        rowCount: rows.length,
        preliminaryNeedCount: (revision.preliminaryNeeds ?? []).length,
        allRowsHavePositiveQuantityTypeAndUnit: true,
        rowKinds,
        keyQuantities: Object.fromEntries([
          "anchor-group-pour:material:ready-mix",
          "anchor-group-pour:work:place",
          "anchor-group-pour:equipment:pump",
          "anchor-group-pour:equipment:vibrator",
          "anchor-group-pour:delivery:mixer-trips",
        ].map((rowId) => [rowId, quantities.get(rowId)])),
      },
      lifecycle: {
        calculated: true,
        persisted: true,
        pdfOpened: true,
        approved: true,
        historyReopened: true,
        historyRowCount: 36,
        marketplaceRpcStatus: marketplaceRpc.map((entry) => entry.status),
        procurementArtifactId: procurement.artifactId,
        procurementArtifactRevisionId: procurement.revisionId,
      },
      browser: {
        origin: ORIGIN,
        consoleErrors,
        pageErrors,
        requestFailures: requestFailures.filter((entry) => !entry.includes("favicon")),
      },
      screenshots,
      secretsPersisted: false,
      credentialsPrinted: false,
      productionAccessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    });
    progress("GREEN", { revisionId, rowCount: rows.length, output: OUTPUT });
  } catch (error) {
    const failureScreenshot = resolve(OUTPUT_ROOT, "failure.png");
    await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => undefined);
    atomicJson(resolve(OUTPUT_ROOT, "failure.json"), {
      generatedUtc: new Date().toISOString(),
      status: "RED_S27_14_ANCHOR_GROUP_WEB",
      error: error instanceof Error ? error.message : String(error),
      url: page.url(),
      consoleErrors,
      pageErrors,
      requestFailures,
      failureScreenshot,
      credentialsPrinted: false,
      tokensPersisted: false,
    });
    throw error;
  } finally {
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
