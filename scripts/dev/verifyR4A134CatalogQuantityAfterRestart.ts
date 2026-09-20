import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-4/platform-core-global/catalog-quantity-web");
const MAIN_RECEIPT = resolve(OUTPUT_ROOT, "01_catalog_quantity_lifecycle.json");
const BEFORE = resolve(OUTPUT_ROOT, "restart_process_before.json");
const OUTPUT = resolve(OUTPUT_ROOT, "02_catalog_quantity_restart_reload.json");
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const PROTECTED_FILES = [
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R4A134_RESTART:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function fileIdentity(path: string): Json {
  const bytes = readFileSync(resolve(path));
  return { path, byteSize: bytes.byteLength, sha256: sha256(bytes) };
}

async function loginConsumer(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token, `CONSUMER_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === 200, `API_${response.status}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)
      || (await page.getByTestId("consumer-repair-screen").isVisible().catch(() => false)
        && await page.getByTestId("estimate-current-revision-id").isVisible().catch(() => false))) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false) && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const consumerLogin = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await consumerLogin.isVisible().catch(() => false)
        && await consumerLogin.isEnabled().catch(() => false)) {
        await consumerLogin.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  const diagnosticScreenshot = resolve(OUTPUT_ROOT, "restart_consumer_route_not_ready.png");
  await page.screenshot({ path: diagnosticScreenshot, fullPage: true }).catch(() => undefined);
  const testIds = await page.locator("[data-testid]").evaluateAll((nodes) =>
    nodes.slice(0, 80).map((node) => node.getAttribute("data-testid")).filter(Boolean),
  ).catch(() => [] as string[]);
  throw new Error(`R4A134_RESTART:CONSUMER_ROUTE_NOT_READY:${page.url()}:${testIds.join(",")}`);
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
  await ensurePositionsVisible(page);
}

async function ensurePositionsVisible(page: Page): Promise<void> {
  const editor = page.getByTestId("request-estimate-items-editor-content");
  const editorAlreadyAttached = await editor.waitFor({ state: "attached", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!editorAlreadyAttached) {
    const positionsToggle = page.getByTestId("request-estimate-positions-toggle").first();
    await positionsToggle.waitFor({ state: "visible", timeout: 90_000 });
    const label = await positionsToggle.innerText();
    if (label.includes("Показать позиции")) await positionsToggle.click({ force: true });
    else invariant(label.includes("Скрыть позиции"), `POSITIONS_DISCLOSURE_STATE_RED:${label}`);
  }
  await editor.waitFor({ state: "attached", timeout: 90_000 });
  await editor.scrollIntoViewIfNeeded();
  await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "attached", timeout: 90_000 });
}

async function itemIdForTitle(page: Page, title: string): Promise<string> {
  const titleNode = page.locator('[data-testid^="consumer-repair-item-title-"]')
    .filter({ hasText: title }).last();
  await titleNode.waitFor({ state: "attached", timeout: 90_000 });
  await titleNode.scrollIntoViewIfNeeded();
  const testId = String(await titleNode.getAttribute("data-testid"));
  const prefix = "consumer-repair-item-title-";
  invariant(testId.startsWith(prefix), "VISIBLE_ITEM_ID_MISSING");
  return testId.slice(prefix.length);
}

function captureBefore(): void {
  const mainBytes = readFileSync(MAIN_RECEIPT);
  const main = JSON.parse(mainBytes.toString("utf8")) as Json;
  const backend = readJson(BACKEND_RECEIPT);
  invariant(main.status === "GREEN_R4_A13_4_CATALOG_QUANTITY_LIFECYCLE_WEB", "MAIN_RECEIPT_NOT_GREEN");
  invariant(Number(backend.backend_pid) > 0 && backend.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "BACKEND_BEFORE_NOT_GREEN");
  atomicJson(BEFORE, {
    schemaVersion: "rik-expo-app.r4-a13-4.catalog-quantity-restart-before.v1",
    generatedUtc: new Date().toISOString(),
    backendPid: Number(backend.backend_pid),
    backendGeneratedUtc: backend.generated_utc,
    compatibilityTuple: backend.compatibility_tuple,
    mainReceiptSha256: sha256(mainBytes),
    finalRevisionId: main.clearLifecycle.reResolvedRevisionId,
    protectedFiles: PROTECTED_FILES.map(fileIdentity),
    credentialsPrinted: false,
    tokensPersisted: false,
  });
  process.stdout.write(`${JSON.stringify({ status: "CAPTURED", path: BEFORE, backendPid: backend.backend_pid })}\n`);
}

async function verifyAfterRestart(): Promise<void> {
  const before = readJson(BEFORE);
  const mainBytes = readFileSync(MAIN_RECEIPT);
  const main = JSON.parse(mainBytes.toString("utf8")) as Json;
  const backend = readJson(BACKEND_RECEIPT);
  invariant(sha256(mainBytes) === before.mainReceiptSha256, "MAIN_RECEIPT_CHANGED_DURING_RESTART");
  invariant(Number(backend.backend_pid) > 0 && Number(backend.backend_pid) !== Number(before.backendPid),
    "BACKEND_PROCESS_NOT_RESTARTED");
  invariant(Date.parse(String(backend.generated_utc)) > Date.parse(String(before.backendGeneratedUtc)),
    "BACKEND_RECEIPT_NOT_NEWER");
  invariant(backend.backend_action === "RESTARTED"
    && backend.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
  "BACKEND_AFTER_NOT_GREEN");
  invariant(backend.compatibility_tuple?.sourceTree === main.runtime.sourceTreeHash,
    "SOURCE_TREE_CHANGED_ACROSS_RESTART");

  const authorization = await loginConsumer();
  const runtimeManifest = await api(authorization, "runtime-manifest");
  invariant(runtimeManifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
    && runtimeManifest.activeCompileJobCount === 0,
  "RUNTIME_MANIFEST_AFTER_RESTART_RED");

  const materialTitle = String(main.materialAddition.resource.titleRu);
  const serviceTitle = String(main.serviceAddition.resource.titleRu);
  const materialRowId = String(main.materialAddition.rowId);
  const serviceRowId = String(main.serviceAddition.rowId);
  const materialAddition = await api(authorization, `revisions/${main.materialAddition.revisionId}`);
  const materialNeed = (materialAddition.preliminaryNeeds as Json[]).find((need) => need.rowId === materialRowId);
  invariant(materialNeed
    && materialNeed.quantity == null
    && materialNeed.titleRu === materialTitle
    && materialNeed.category === "material"
    && materialNeed.procurementEligible === true,
  "INITIAL_PRELIMINARY_NOT_DURABLE_AFTER_RESTART");

  const cleared = await api(authorization, `revisions/${main.clearLifecycle.clearedRevisionId}`);
  const clearedRows = await allRows(authorization, cleared.revisionId);
  const clearedNeed = (cleared.preliminaryNeeds as Json[]).find((need) => need.rowId === materialRowId);
  invariant(clearedNeed
    && clearedNeed.quantity == null
    && clearedNeed.titleRu === materialTitle
    && clearedNeed.category === "material"
    && Number(clearedNeed.unitPrice) === 321.5
    && !clearedRows.some((row) => row.rowId === materialRowId),
  "CLEARED_PRELIMINARY_NOT_DURABLE_AFTER_RESTART");

  const final = await api(authorization, `revisions/${main.clearLifecycle.reResolvedRevisionId}`);
  const finalRows = await allRows(authorization, final.revisionId);
  const material = finalRows.find((row) => row.rowId === materialRowId);
  const service = finalRows.find((row) => row.rowId === serviceRowId);
  invariant((final.preliminaryNeeds as Json[]).length === 0
    && finalRows.length === Number(final.rowCount)
    && material?.titleRu === materialTitle
    && material.category === "material"
    && Number(material.quantity) === 1.25
    && Number(material.unitPrice) === 321.5
    && material.procurementEligible === true
    && material.includedInProcurement === true
    && service?.titleRu === serviceTitle
    && service.category === "service"
    && Number(service.quantity) === 2.5
    && Number(service.unitPrice) === 900
    && service.procurementEligible === false
    && service.includedInProcurement === false,
  "FINAL_ROWS_NOT_DURABLE_AFTER_RESTART");

  const history = await api(authorization,
    `revisions?catalogId=${encodeURIComponent(String(final.catalogId))}&limit=100`);
  invariant((history.revisions as Json[]).some((revision) => revision.revisionId === final.revisionId),
    "FINAL_REVISION_MISSING_FROM_HISTORY_AFTER_RESTART");
  const procurement = await api(authorization, `revisions/${final.revisionId}/artifacts/procurement`);
  const pdf = await api(authorization,
    `revisions/${final.revisionId}/artifacts/pdf?documentProfile=professional_v1`);
  invariant(procurement.status === "ready"
    && procurement.artifactId === main.documents.procurement.artifactId
    && procurement.metadata?.selectedProcurementRowCount === main.documents.procurement.selectedProcurementRowCount,
  "PROCUREMENT_NOT_DURABLE_AFTER_RESTART");
  invariant(pdf.status === "ready"
    && pdf.artifactId === main.documents.pdf.artifactId
    && pdf.metadata?.grandTotalStatus === "COMPLETE",
  "PDF_NOT_DURABLE_AFTER_RESTART");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await openRevision(page, cleared.revisionId);
    const clearedItemId = await itemIdForTitle(page, materialTitle);
    invariant(await page.getByTestId(`consumer-repair-item-quantity-input-${clearedItemId}`).inputValue() === "",
      "CLEARED_UI_QUANTITY_NOT_EMPTY_AFTER_RESTART");
    await page.reload({ waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    await ensurePositionsVisible(page);
    const reloadedClearedItemId = await itemIdForTitle(page, materialTitle);
    invariant(await page.getByTestId(`consumer-repair-item-quantity-input-${reloadedClearedItemId}`).inputValue() === "",
      "CLEARED_UI_QUANTITY_NOT_EMPTY_AFTER_RELOAD");
    const clearedScreenshot = resolve(OUTPUT_ROOT, "material_cleared_after_backend_restart.png");
    await page.screenshot({ path: clearedScreenshot, fullPage: true });

    await openRevision(page, final.revisionId);
    const materialItemId = await itemIdForTitle(page, materialTitle);
    const serviceItemId = await itemIdForTitle(page, serviceTitle);
    const materialQuantity = await page.getByTestId(`consumer-repair-item-quantity-input-${materialItemId}`).inputValue();
    const materialPrice = await page.getByTestId(`consumer-repair-item-unit-price-input-${materialItemId}`).inputValue();
    const serviceQuantity = await page.getByTestId(`consumer-repair-item-quantity-input-${serviceItemId}`).inputValue();
    const servicePrice = await page.getByTestId(`consumer-repair-item-unit-price-input-${serviceItemId}`).inputValue();
    invariant(Number(materialQuantity) === 1.25
      && Number(materialPrice) === 321.5
      && Number(serviceQuantity) === 2.5
      && Number(servicePrice) === 900,
    "FINAL_UI_VALUES_NOT_HYDRATED_AFTER_RESTART");
    const incompleteNotice = page.getByTestId("request-estimate-incomplete-composition-notice");
    await incompleteNotice.waitFor({ state: "hidden", timeout: 90_000 }).catch(() => undefined);
    invariant(!await incompleteNotice.isVisible().catch(() => false),
      "FINAL_UI_FALSE_PRELIMINARY_AFTER_RESTART");
    const finalScreenshot = resolve(OUTPUT_ROOT, "catalog_quantity_final_after_backend_restart.png");
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);

    const protectedAfter = PROTECTED_FILES.map(fileIdentity);
    invariant(JSON.stringify(protectedAfter) === JSON.stringify(before.protectedFiles),
      "PROTECTED_ANDROID_FILES_CHANGED_DURING_RESTART_PROOF");
    const receiptBase = {
      schemaVersion: "rik-expo-app.r4-a13-4.catalog-quantity-restart-reload.v1",
      generatedUtc: new Date().toISOString(),
      status: "GREEN_R4_A13_4_CATALOG_QUANTITY_RESTART_RELOAD",
      mainReceipt: { path: MAIN_RECEIPT, sha256: before.mainReceiptSha256 },
      process: {
        beforePid: before.backendPid,
        afterPid: backend.backend_pid,
        changed: true,
        beforeGeneratedUtc: before.backendGeneratedUtc,
        afterGeneratedUtc: backend.generated_utc,
      },
      runtime: {
        runtimeRole: runtimeManifest.runtimeRole,
        activeCompileJobCount: runtimeManifest.activeCompileJobCount,
        compatibilityTuple: backend.compatibility_tuple,
      },
      durableIdentity: {
        materialRowId,
        serviceRowId,
        initialPreliminaryRevisionId: materialAddition.revisionId,
        clearedPreliminaryRevisionId: cleared.revisionId,
        finalRevisionId: final.revisionId,
        historyContainsFinal: true,
      },
      initialPreliminary: materialNeed,
      clearedPreliminary: clearedNeed,
      finalRows: { material, service, rowCount: finalRows.length, preliminaryNeedCount: 0 },
      artifacts: {
        procurement: {
          artifactId: procurement.artifactId,
          status: procurement.status,
          selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount,
        },
        pdf: {
          artifactId: pdf.artifactId,
          status: pdf.status,
          grandTotalStatus: pdf.metadata?.grandTotalStatus,
        },
      },
      ui: {
        clearedReloadQuantity: "",
        finalValues: { materialQuantity, materialPrice, serviceQuantity, servicePrice },
        clearedScreenshot,
        finalScreenshot,
        pageErrors,
      },
      protectedFiles: { before: before.protectedFiles, after: protectedAfter, unchanged: true },
      productionAccessed: false,
      deployPerformed: false,
      credentialsPrinted: false,
      tokensPersisted: false,
    };
    atomicJson(OUTPUT, { ...receiptBase, receiptSha256: sha256(JSON.stringify(receiptBase)) });
    process.stdout.write(`${JSON.stringify({
      status: receiptBase.status,
      receipt: OUTPUT,
      beforePid: before.backendPid,
      afterPid: backend.backend_pid,
      finalRevisionId: final.revisionId,
      productionAccessed: false,
    })}\n`);
  } finally {
    await browser.close();
  }
}

if (process.argv.includes("--capture-before")) {
  captureBefore();
} else {
  void verifyAfterRestart().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
