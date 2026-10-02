import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://localhost:8101";
const BACKEND = "http://127.0.0.1:8765";
const PROFILE = resolve(".release-runtime/r568/s27-14/tmp-chrome-session-probe");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-14/anchor-group-web-acceptance");
const OUTPUT = resolve(OUTPUT_ROOT, "history-market-acceptance.json");
const REVISION_ID = "2f635df2-5b2d-4965-9984-62c3fda1759b";
const RELEASE_ID = "43ff52c6-4dc2-575f-a429-c879b483f52e";
const DEFINITION_VERSION_ID = "bfd003f6-721d-5e4f-94bc-62668d4cb28a";
const REPAIR_CONTACT = process.argv.includes("--repair-contact");
const REPAIR_MEDIA = process.argv.includes("--repair-media");
const DIAGNOSTIC_ONLY = process.argv.includes("--diagnostic-only");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_14_ANCHOR_HISTORY_MARKET:${code}`);
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

function collectJwtCandidates(value: unknown, output: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    if (value.split(".").length === 3 && value.length > 100) output.add(value);
    try {
      collectJwtCandidates(JSON.parse(value), output, depth + 1);
    } catch {
      // The majority of storage values are plain strings.
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectJwtCandidates(entry, output, depth + 1));
    return;
  }
  if (typeof value === "object") {
    Object.values(value as Json).forEach((entry) => collectJwtCandidates(entry, output, depth + 1));
  }
}

async function browserAuthorization(page: Page): Promise<string> {
  const values = await page.evaluate(() => Object.values(window.localStorage));
  const candidates = new Set<string>();
  collectJwtCandidates(values, candidates);
  for (const token of candidates) {
    const authorization = `Bearer ${token}`;
    const response = await fetch(`${BACKEND}/runtime-manifest`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (response?.ok) return authorization;
  }
  throw new Error("S27_14_ANCHOR_HISTORY_MARKET:VALID_BROWSER_AUTHORIZATION_NOT_FOUND");
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

async function allRows(authorization: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${REVISION_ID}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function openApprovedSnapshot(page: Page): Promise<void> {
  const historyModal = page.getByTestId("consumer-repair-history-modal");
  if (!await historyModal.isVisible().catch(() => false)) {
    await page.getByTestId("consumer-repair-history-button").click();
    await historyModal.waitFor({ state: "visible", timeout: 60_000 });
  }
  const approvedRow = page.getByTestId("consumer-repair-history-row")
    .filter({ has: page.getByTestId(`consumer-repair-history-revision-${REVISION_ID}`) })
    .filter({ hasNotText: "\u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a" })
    .first();
  await approvedRow.waitFor({ state: "visible", timeout: 60_000 });
  await approvedRow.getByTestId("consumer-repair-history-main").click();
  await page.getByTestId("consumer-repair-history-readonly-snapshot")
    .waitFor({ state: "visible", timeout: 90_000 });
  await page.getByTestId("consumer-repair-history-readonly-item").first()
    .waitFor({ state: "visible", timeout: 60_000 });
}

async function repairApprovedContactOnExactRevision(page: Page): Promise<void> {
  const contactPhone = String(process.env.S27_TEST_CONTACT_PHONE ?? "").trim();
  const addressText = String(process.env.S27_TEST_ADDRESS ?? "").trim();
  invariant(contactPhone.replace(/\D/gu, "").length >= 7, "TEST_CONTACT_PHONE_NOT_CONFIGURED");
  invariant(addressText.length > 0, "TEST_ADDRESS_NOT_CONFIGURED");
  await page.getByTestId("consumer-repair-history-edit-revision").click();
  await page.getByTestId("consumer-repair-history-modal").waitFor({ state: "detached", timeout: 120_000 });
  const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
  await Promise.race([
    page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 180_000 }),
    openFullEstimate.waitFor({ state: "visible", timeout: 180_000 }),
  ]);
  if (await openFullEstimate.isVisible().catch(() => false)) await openFullEstimate.click();
  await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
  await page.getByTestId("consumer-repair-address-input").fill(addressText);
  await page.getByTestId("consumer-repair-phone-input").fill(contactPhone);
  const approve = page.getByTestId("consumer-repair-approve").last();
  await approve.waitFor({ state: "visible", timeout: 120_000 });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !await approve.isEnabled()) await page.waitForTimeout(500);
  invariant(await approve.isEnabled(), "CONTACT_REPAIR_APPROVAL_DISABLED");
  await approve.click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ state: "detached", timeout: 120_000 });
  await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 120_000 });
}

async function repairApprovedMediaOnExactRevision(page: Page): Promise<void> {
  await page.getByTestId("consumer-repair-history-edit-revision").click();
  await page.getByTestId("consumer-repair-history-modal").waitFor({ state: "detached", timeout: 120_000 });
  const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
  await Promise.race([
    page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 180_000 }),
    openFullEstimate.waitFor({ state: "visible", timeout: 180_000 }),
  ]);
  if (await openFullEstimate.isVisible().catch(() => false)) await openFullEstimate.click();
  const attachedPhoto = page.locator('[data-testid^="estimate-material-row-photo-attached-"]').first();
  let attachmentVisible = await attachedPhoto.waitFor({ state: "attached", timeout: 10_000 })
    .then(() => true, () => false);
  if (!attachmentVisible) {
    const photoButton = page.locator('[data-testid^="estimate-material-row-photo-button-"]').first();
    await photoButton.waitFor({ state: "visible", timeout: 120_000 });
    await photoButton.click();
    await page.getByTestId("mobile-photo-capture-flow").waitFor({ state: "visible", timeout: 120_000 });
    const permissionGallery = page.getByTestId("mobile-photo-pick-library");
    const cameraGallery = page.getByTestId("mobile-photo-gallery");
    await Promise.race([
      permissionGallery.waitFor({ state: "visible", timeout: 120_000 }),
      cameraGallery.waitFor({ state: "visible", timeout: 120_000 }),
    ]);
    const gallery = await permissionGallery.isVisible().catch(() => false)
      ? permissionGallery
      : cameraGallery;
    const chooserPromise = page.waitForEvent("filechooser", { timeout: 60_000 });
    await gallery.click();
    const chooser = await chooserPromise;
    await chooser.setFiles(resolve(OUTPUT_ROOT, "01_calculated_36_rows.png"));
    await page.getByTestId("mobile-photo-review-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId("mobile-photo-use").click();
    await page.getByTestId("mobile-photo-capture-flow").waitFor({ state: "detached", timeout: 180_000 });
    attachmentVisible = await attachedPhoto.waitFor({ state: "attached", timeout: 10_000 })
      .then(() => true, () => false);
  }
  if (!attachmentVisible) {
    const status = await page.getByTestId("consumer-repair-status").innerText().catch(() => "");
    const diagnostic = await sanitizedApprovedBundleDiagnostic(page);
    throw new Error(
      `S27_14_ANCHOR_HISTORY_MARKET:PHOTO_LOCAL_PROJECTION_MISSING:${JSON.stringify(diagnostic)}`
      + `:STATUS_${status.replace(/\s+/gu, " ").trim().slice(0, 500)}`,
    );
  }
  const approve = page.getByTestId("consumer-repair-approve").last();
  await approve.waitFor({ state: "visible", timeout: 120_000 });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !await approve.isEnabled()) await page.waitForTimeout(500);
  invariant(await approve.isEnabled(), "MEDIA_REPAIR_APPROVAL_DISABLED");
  await approve.click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ state: "detached", timeout: 120_000 });
  await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 120_000 });
}

function marketplaceKind(category: string): string {
  if (category === "material") return "material";
  if (["work", "construction_work", "labor"].includes(category)) return "work";
  if (["transport", "delivery"].includes(category)) return "delivery";
  if (["equipment", "rent"].includes(category)) return "rent";
  return "service";
}

async function sanitizedApprovedBundleDiagnostic(page: Page): Promise<Json> {
  const script = `(() => {
    const revisionId = ${JSON.stringify(REVISION_ID)};
    const candidates = [];
    const durableKeys = Object.keys(window.localStorage)
      .filter((key) => key.startsWith("rik.consumer_repair.request_"));
    for (const key of durableKeys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      const stack = [{ value: parsed, depth: 0 }];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || current.depth > 8 || current.value == null || typeof current.value !== "object") continue;
        if (!Array.isArray(current.value) && current.value.draft
          && (Array.isArray(current.value.items) || current.value.itemsCompactV1)) {
          candidates.push(current.value);
        }
        for (const entry of Object.values(current.value)) {
          stack.push({ value: entry, depth: current.depth + 1 });
        }
      }
    }
    const matching = [];
    for (const candidate of candidates) {
      let serialized = "";
      try { serialized = JSON.stringify(candidate); } catch { serialized = ""; }
      if (serialized.includes(revisionId)) matching.push(candidate);
    }
    if (matching.length < 1) return { durableKeyCount: durableKeys.length, matchingBundle: false };
    const summaries = matching.map((candidate) => ({
      draftId: String(candidate.draft && candidate.draft.id || ""),
      draftStatus: String(candidate.draft && candidate.draft.status || ""),
      approvedAt: String(candidate.draft && candidate.draft.approvedAt || ""),
      contactReady: String(candidate.draft && candidate.draft.contactPhone || "").replace(/\D/g, "").length >= 7,
      addressReady: String(candidate.draft && candidate.draft.addressText || "").trim().length > 0,
      mediaCount: Array.isArray(candidate.media) ? candidate.media.length : -1,
      estimateAttachmentCount: Array.isArray(candidate.estimateAttachments)
        ? candidate.estimateAttachments.length
        : -1,
    }));
    const bundle = matching[0];
    const validationCodes = [];
    if (Array.isArray(bundle.draft && bundle.draft.marketplaceValidationErrors)) {
      for (const error of bundle.draft.marketplaceValidationErrors) {
        validationCodes.push(String(error && error.code || "UNKNOWN"));
      }
    }
    let generatedPdfCount = -1;
    if (Array.isArray(bundle.pdfs)) {
      generatedPdfCount = 0;
      for (const pdf of bundle.pdfs) if (pdf && pdf.pdfStatus === "generated") generatedPdfCount += 1;
    }
    return {
      durableKeyCount: durableKeys.length,
      matchingBundle: true,
      matchingBundleCount: matching.length,
      summaries,
      draftStatus: String(bundle.draft && bundle.draft.status || ""),
      problemLength: String(bundle.draft && bundle.draft.problemText || "").trim().length,
      cityLength: String(bundle.draft && bundle.draft.city || "").trim().length,
      addressLength: String(bundle.draft && bundle.draft.addressText || "").trim().length,
      contactDigitCount: String(bundle.draft && bundle.draft.contactPhone || "").replace(/\\D/g, "").length,
      mediaCount: Array.isArray(bundle.media) ? bundle.media.length : -1,
      generatedPdfCount,
      itemCount: Array.isArray(bundle.items)
        ? bundle.items.length
        : Array.isArray(bundle.itemsCompactV1 && bundle.itemsCompactV1.rows)
          ? bundle.itemsCompactV1.rows.length
          : -1,
      validationCodes,
    };
  })()`;
  return page.evaluate(script) as Promise<Json>;
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
  let marketplaceRequestHeaders: Record<string, string> = {};
  let marketplaceRpcUrl = "";
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
  page.on("request", (request) => {
    if (!request.url().includes("consumer_estimate_marketplace_publish_v1")) return;
    marketplaceRpcUrl = request.url();
    marketplaceRequestHeaders = request.headers();
  });

  try {
    await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 120_000 });
    const authorization = await browserAuthorization(page);
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID,
      "RUNTIME_RELEASE_DRIFT");
    const revision = await api(authorization, `revisions/${REVISION_ID}`);
    const rows = await allRows(authorization);
    invariant(revision.revisionId === REVISION_ID
      && revision.releaseId === RELEASE_ID
      && revision.definitionVersionId === DEFINITION_VERSION_ID
      && Number(revision.rowCount) === 36
      && rows.length === 36,
    "REVISION_IDENTITY_OR_COUNT_RED");
    invariant(rows.every((row) => Number(row.quantity) > 0 && row.unitId && row.category),
      "BACKEND_ROW_SHAPE_RED");
    if (DIAGNOSTIC_ONLY) {
      process.stdout.write(`${JSON.stringify(await sanitizedApprovedBundleDiagnostic(page))}\n`);
      return;
    }

    await openApprovedSnapshot(page);
    invariant(await page.getByTestId("consumer-repair-history-readonly-item").count() === 36,
      "HISTORY_ROW_COUNT_RED");
    const identity = page.getByTestId("consumer-repair-history-snapshot-release-id");
    const nativeIdentity = await identity.getAttribute("id");
    invariant(nativeIdentity === `consumer-repair-history-snapshot-release-id|${REVISION_ID}|${RELEASE_ID}`,
      `HISTORY_IDENTITY_RED:${nativeIdentity ?? "MISSING"}`);
    const approvedScreenshot = resolve(OUTPUT_ROOT, "03_approved_history_36_rows.png");
    await page.screenshot({ path: approvedScreenshot, fullPage: true });

    if (REPAIR_CONTACT) {
      await repairApprovedContactOnExactRevision(page);
      await openApprovedSnapshot(page);
      invariant(await page.getByTestId("consumer-repair-history-readonly-item").count() === 36,
        "REPAIRED_HISTORY_ROW_COUNT_RED");
      const repairedIdentity = await page.getByTestId("consumer-repair-history-snapshot-release-id")
        .getAttribute("id");
      invariant(repairedIdentity === `consumer-repair-history-snapshot-release-id|${REVISION_ID}|${RELEASE_ID}`,
        "REPAIRED_HISTORY_IDENTITY_RED");
    }
    if (REPAIR_MEDIA) {
      await repairApprovedMediaOnExactRevision(page);
      await openApprovedSnapshot(page);
      invariant(await page.getByTestId("consumer-repair-history-readonly-item").count() === 36,
        "MEDIA_REPAIRED_HISTORY_ROW_COUNT_RED");
      const repairedIdentity = await page.getByTestId("consumer-repair-history-snapshot-release-id")
        .getAttribute("id");
      invariant(repairedIdentity === `consumer-repair-history-snapshot-release-id|${REVISION_ID}|${RELEASE_ID}`,
        "MEDIA_REPAIRED_HISTORY_IDENTITY_RED");
    }

    await page.getByTestId("consumer-repair-history-open-pdf-expanded").click();
    await page.waitForURL(/pdf-viewer/u, { timeout: 120_000 });
    const approvedPdfScreenshot = resolve(OUTPUT_ROOT, "04_approved_pdf_viewer.png");
    await page.screenshot({ path: approvedPdfScreenshot, fullPage: true });
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 120_000 });
    await openApprovedSnapshot(page);

    const rpcPromise = page.waitForResponse((response) =>
      response.url().includes("consumer_estimate_marketplace_publish_v1"),
    { timeout: 30_000 }).catch(() => null);
    await page.getByTestId("consumer-repair-history-send-market").click();
    const rpcResponse = await rpcPromise;
    if (!rpcResponse) {
      const diagnostic = await sanitizedApprovedBundleDiagnostic(page);
      const status = await page.getByTestId("consumer-repair-status").innerText().catch(() => "");
      throw new Error(
        `S27_14_ANCHOR_HISTORY_MARKET:MARKETPLACE_RPC_NOT_CALLED:${JSON.stringify(diagnostic)}`
        + `:STATUS_${status.replace(/\s+/gu, " ").trim().slice(0, 500)}`,
      );
    }
    const rpcBody = await rpcResponse.json().catch(() => null) as Json | Json[] | null;
    if (!rpcResponse.ok()) {
      const errorBody = rpcBody && !Array.isArray(rpcBody)
        ? {
            code: String(rpcBody.code ?? "").slice(0, 120),
            message: String(rpcBody.message ?? "").slice(0, 500),
            hint: String(rpcBody.hint ?? "").slice(0, 500),
          }
        : null;
      throw new Error(
        `S27_14_ANCHOR_HISTORY_MARKET:MARKETPLACE_RPC_HTTP_${rpcResponse.status()}`
        + `:${JSON.stringify(errorBody)}`,
      );
    }
    const rpcRecord = Array.isArray(rpcBody) ? rpcBody[0] : rpcBody;
    const listingId = String(rpcRecord?.listing_id ?? rpcRecord?.listingId ?? "");
    invariant(listingId.length > 0 && marketplaceRpcUrl, "MARKETPLACE_LISTING_ID_MISSING");
    await page.getByTestId("consumer-repair-history-backend-procurement-artifact")
      .waitFor({ state: "attached", timeout: 120_000 });

    const rpcOrigin = new URL(marketplaceRpcUrl).origin;
    const select = encodeURIComponent("id,rik_code,status,items_json,client_mutation_id");
    const listingResponse = await fetch(
      `${rpcOrigin}/rest/v1/market_listings?id=eq.${encodeURIComponent(listingId)}&select=${select}`,
      {
        headers: {
          apikey: marketplaceRequestHeaders.apikey,
          authorization: marketplaceRequestHeaders.authorization,
        },
        signal: AbortSignal.timeout(60_000),
      },
    );
    const listingBody = await listingResponse.json().catch(() => null) as Json[] | null;
    invariant(listingResponse.ok && Array.isArray(listingBody) && listingBody.length === 1,
      `MARKETPLACE_LISTING_READ_HTTP_${listingResponse.status}`);
    const listing = listingBody[0];
    const items = Array.isArray(listing.items_json) ? listing.items_json as Json[] : [];
    invariant(items.length === 36, `MARKETPLACE_ITEM_COUNT_${items.length}`);
    const itemsById = new Map(items.map((item) => [String(item.rik_code), item]));
    for (const row of rows) {
      const item = itemsById.get(String(row.rowId));
      const expected = {
        name: row.titleRu,
        uom: row.unitId,
        qty: Number(row.quantity),
        kind: marketplaceKind(String(row.category)),
        revisionId: REVISION_ID,
        releaseId: RELEASE_ID,
      };
      const actual = item ? {
        name: item.name,
        uom: item.uom,
        qty: Number(item.qty),
        kind: item.kind,
        revisionId: item.canonical_revision_id,
        releaseId: item.canonical_release_id,
      } : null;
      invariant(actual
        && actual.name === expected.name
        && actual.uom === expected.uom
        && actual.qty === expected.qty
        && actual.kind === expected.kind
        && actual.revisionId === expected.revisionId
        && actual.releaseId === expected.releaseId,
      `MARKETPLACE_ROW_PARITY:${String(row.rowId)}:${JSON.stringify({ expected, actual })}`);
    }
    const procurement = await api(authorization, `revisions/${REVISION_ID}/artifacts/procurement`);
    invariant(procurement.status === "ready"
      && procurement.revisionId === REVISION_ID
      && procurement.releaseId === RELEASE_ID,
    "PROCUREMENT_ARTIFACT_IDENTITY_RED");
    const marketScreenshot = resolve(OUTPUT_ROOT, "05_market_full_36_row_handoff.png");
    await page.screenshot({ path: marketScreenshot, fullPage: true });

    const screenshots = [approvedScreenshot, approvedPdfScreenshot, marketScreenshot]
      .map((path) => ({ path, sha256: sha256(readFileSync(path)) }));
    atomicJson(OUTPUT, {
      contract: "rik-expo-app.s27-14.anchor-group-history-market-acceptance.v1",
      generatedUtc: new Date().toISOString(),
      status: "GREEN_S27_14_ANCHOR_GROUP_APPROVED_HISTORY_PDF_MARKET_36_OF_36",
      revisionId: REVISION_ID,
      releaseId: RELEASE_ID,
      definitionVersionId: DEFINITION_VERSION_ID,
      backendRowCount: rows.length,
      approvedHistoryRowCount: 36,
      marketplaceListingId: listingId,
      marketplaceItemCount: items.length,
      marketplaceExactRowParityCount: rows.length,
      marketplaceTypesUnitsQuantitiesRevisionParity: true,
      procurementArtifactId: procurement.artifactId,
      procurementArtifactRevisionId: procurement.revisionId,
      runtime: manifest.compatibilityTuple,
      screenshots,
      consoleErrors,
      pageErrors,
      credentialsPrinted: false,
      tokensPersisted: false,
      productionAccessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    });
    process.stdout.write(`${JSON.stringify({
      status: "GREEN_S27_14_ANCHOR_GROUP_APPROVED_HISTORY_PDF_MARKET_36_OF_36",
      revisionId: REVISION_ID,
      marketplaceItemCount: items.length,
      output: OUTPUT,
    })}\n`);
  } catch (error) {
    const failureScreenshot = resolve(OUTPUT_ROOT, "history-market-failure.png");
    await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => undefined);
    atomicJson(resolve(OUTPUT_ROOT, "history-market-failure.json"), {
      generatedUtc: new Date().toISOString(),
      status: "RED_S27_14_ANCHOR_GROUP_HISTORY_MARKET",
      error: error instanceof Error ? error.message : String(error),
      url: page.url(),
      consoleErrors,
      pageErrors,
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
