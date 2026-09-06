import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Response } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const CATALOG_ID = "canonical-work:expanded:strip_foundation";
const MASTER_SHA256 = "9262479c9c9fb3107c4541046c367db7934c875ea8354cc472a7529788635d1b";
const EVIDENCE_ROOT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a10-foundation-confirm/02_WEB",
);
const AMBIGUOUS_PROMPT = "устройство ленточного фундамента 100 метров длина и 20 метров ширина";
const COMPLETE_PROMPT = [
  "устройство ленточного фундамента",
  "суммарная длина ленты 40 м; ширина ленты 0,5 м; высота ленты 1,5 м",
  "бетонная подготовка входит; толщина бетонной подготовки 0,1 м; класс бетона B25; водонепроницаемость W6; морозостойкость F150; подвижность смеси P4; запас бетонной смеси 2%",
  "масса арматуры 2,4 т; масса вязальной проволоки 28,8 кг; транспортная масса опалубки 12 т",
  "доставка бетонной смеси 18 км; доставка арматуры 18 км; доставка опалубки 18 км",
  "земляные работы входят; объём разработки грунта 54 м3",
  "подушка основания входит; материал подушки песок; объём материала подушки 4 м3; доставка материала подушки 12 км",
  "гидроизоляция входит; система гидроизоляции обмазочная; площадь гидроизоляции 120 м2",
  "обратная засыпка входит; объём обратной засыпки 20 м3",
  "вывоз грунта входит; плотность грунта 1,8 т/м3; расстояние вывоза грунта 15 км",
].join(". ");

async function openRequest(page: Page): Promise<void> {
  await page.goto(new URL("/request", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("auth.login.screen")).toHaveCount(0);
}

async function resetRequest(page: Page): Promise<void> {
  await openRequest(page);
  await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible({ timeout: 120_000 });
}

async function attachProofPhoto(page: Page): Promise<void> {
  const photoButton = page.locator('[data-testid^="estimate-material-row-photo-button-"]').first();
  await expect(photoButton).toBeVisible({ timeout: 60_000 });
  await photoButton.click();
  const picker = page.locator(
    '[data-testid="mobile-photo-gallery"], [data-testid="mobile-photo-pick-library"]',
  ).first();
  await expect(picker).toBeVisible({ timeout: 30_000 });
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await picker.click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "r4-a10-foundation-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByTestId("mobile-photo-review-screen")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("mobile-photo-use").click();
  await expect(page.getByTestId("mobile-photo-capture-flow")).toHaveCount(0, { timeout: 120_000 });
}

async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).replace(/\s+/gu, " ");
}

function restartExactOwnedBackend(): { beforePid: number; afterPid: number } {
  const root = process.cwd();
  const receiptPath = path.join(root, ".release-runtime/r568/runtime/local-developer-current/backend.json");
  const credentialsPath = path.join(root, ".release-runtime/r551/runtime/local-developer/credentials.json");
  const releasePath = path.join(root, "data/estimate-benchmarks/r568-local-developer-canonical-release.json");
  const before = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
    backend_pid: number;
    compatibility_tuple: {
      definitionReleaseId: string;
      searchReleaseId: string;
      sourceHead: string;
      sourceTree: string;
      frontendProductSourceHash: string;
      frontendJsBundleFingerprint: string;
    };
  };
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8")) as {
    provider_url: string;
    publishable_key: string;
  };
  const configuredRelease = JSON.parse(fs.readFileSync(releasePath, "utf8")) as {
    definitionReleaseId: string;
    searchReleaseId: string;
  };
  const script = [
    "$ErrorActionPreference='Stop'",
    "$root=[IO.Path]::GetFullPath($env:R4A10_ROOT)",
    "$receipt=Get-Content -LiteralPath (Join-Path $root '.release-runtime/r568/runtime/local-developer-current/backend.json') -Raw|ConvertFrom-Json",
    "$connection=Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction Stop|Select-Object -First 1",
    "$process=Get-CimInstance Win32_Process -Filter \"ProcessId=$($connection.OwningProcess)\" -ErrorAction Stop",
    "if([int]$receipt.backend_pid -ne [int]$process.ProcessId -or $process.Name -ne 'node.exe' -or [string]$process.CommandLine -notmatch 'serveCanonicalEstimateLocalR1\\.ts'){throw 'R4_A10_BACKEND_OWNER_GUARD_RED'}",
    "$pidBefore=[int]$process.ProcessId",
    "Stop-Process -Id $pidBefore -ErrorAction Stop",
    "$deadline=(Get-Date).AddSeconds(15)",
    "while((Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue) -and (Get-Date)-lt $deadline){Start-Sleep -Milliseconds 100}",
    "if(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue){throw 'R4_A10_BACKEND_STOP_TIMEOUT'}",
  ].join("; ");
  execFileSync("powershell", ["-NoProfile", "-Command", script], {
    cwd: root,
    env: { ...process.env, R4A10_ROOT: root },
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 30_000,
  });
  execFileSync(process.execPath, [
    "--import",
    "tsx",
    "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts",
  ], {
    cwd: root,
    env: {
      ...process.env,
      LOCAL_DEVELOPER_PROVIDER_URL: credentials.provider_url,
      LOCAL_DEVELOPER_PROVIDER_PUBLIC_KEY: credentials.publishable_key,
      LOCAL_DEVELOPER_BUILD_COMMIT: before.compatibility_tuple.sourceHead,
      LOCAL_DEVELOPER_SOURCE_TREE_HASH: before.compatibility_tuple.sourceTree,
      LOCAL_DEVELOPER_PRODUCT_SOURCE_HASH: before.compatibility_tuple.frontendProductSourceHash,
      LOCAL_DEVELOPER_JS_BUNDLE_FINGERPRINT: before.compatibility_tuple.frontendJsBundleFingerprint,
      LOCAL_DEVELOPER_DEFINITION_RELEASE_ID: configuredRelease.definitionReleaseId,
      LOCAL_DEVELOPER_SEARCH_RELEASE_ID: configuredRelease.searchReleaseId,
    },
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 90_000,
  });
  const after = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
    backend_pid: number;
    backend_action: string;
    production_requests: number;
    compatibility_tuple: {
      definitionReleaseId: string;
      searchReleaseId: string;
    };
  };
  expect(after.backend_action).toBe("RESTARTED");
  expect(after.production_requests).toBe(0);
  expect(after.compatibility_tuple.definitionReleaseId).toBe(configuredRelease.definitionReleaseId);
  expect(after.compatibility_tuple.searchReleaseId).toBe(configuredRelease.searchReleaseId);
  expect(after.backend_pid).not.toBe(before.backend_pid);
  return { beforePid: before.backend_pid, afterPid: after.backend_pid };
}

async function readDurableProcurementArtifact(page: Page, revisionId: string) {
  const credentials = JSON.parse(fs.readFileSync(
    path.resolve(".release-runtime/r551/runtime/local-developer/credentials.json"),
    "utf8",
  )) as { publishable_key: string };
  return page.evaluate(async ({ backendOrigin, targetRevisionId, publishableKey }) => {
    const sessionKey = Object.keys(localStorage).find((key) => /^sb-.*-auth-token$/u.test(key));
    const rawSession = sessionKey ? localStorage.getItem(sessionKey) : null;
    const session = rawSession ? JSON.parse(rawSession) as Record<string, any> : null;
    const accessToken = String(
      session?.access_token ?? session?.currentSession?.access_token ?? session?.session?.access_token ?? "",
    );
    if (!accessToken) throw new Error("R4_A10_BROWSER_SESSION_TOKEN_MISSING");
    const artifactResponse = await fetch(
      `${backendOrigin}/canonical-estimate/revisions/${encodeURIComponent(targetRevisionId)}/artifacts/procurement`,
      { headers: { Authorization: `Bearer ${accessToken}`, apikey: publishableKey } },
    );
    const artifact = await artifactResponse.json() as Record<string, any>;
    if (!artifactResponse.ok || !artifact.signedUrl) {
      throw new Error(`R4_A10_PROCUREMENT_ARTIFACT_READ_FAILED:${artifactResponse.status}`);
    }
    const fileResponse = await fetch(String(artifact.signedUrl));
    const projection = await fileResponse.json() as Record<string, any>;
    return {
      artifactStatus: artifact.status,
      artifactKind: artifact.kind,
      artifactRevisionId: artifact.revisionId,
      artifactReleaseId: artifact.releaseId,
      fileStatus: fileResponse.status,
      fileContentType: fileResponse.headers.get("content-type"),
      schemaVersion: projection.schemaVersion,
      selectedRowCount: projection.selectedRowCount,
      rowTitles: Array.isArray(projection.rows)
        ? projection.rows.map((row: Record<string, unknown>) => String(row.titleRu ?? ""))
        : [],
    };
  }, { backendOrigin: BACKEND_ORIGIN, targetRevisionId: revisionId, publishableKey: credentials.publishable_key });
}

test.describe("R4-A10 strip-foundation routing, technology and confirm", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(600_000);

  test("fails closed for ambiguous geometry, then compiles and approves the complete technological scope", async ({ page }) => {
    test.setTimeout(600_000);
    await ensureLiveWebApp();
    const configuredRuntime = restartExactOwnedBackend();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const productionOrigins = new Set<string>();
    const compileResponses: Response[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
    });
    page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
    page.on("request", (request) => {
      if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
        productionOrigins.add(new URL(request.url()).origin);
      }
    });
    page.on("response", (response) => {
      if (response.request().method() === "POST" && response.url() === `${BACKEND_ORIGIN}/jobs/compile`) {
        compileResponses.push(response);
      }
    });

    await resetRequest(page);
    await page.getByTestId("consumer-repair-problem-input").fill(AMBIGUOUS_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("consumer-repair-status")).toContainText(
      /обязательные (?:исходные данные|параметры)/iu,
      { timeout: 120_000 },
    );
    expect(compileResponses).toHaveLength(0);
    await expect(page.locator('[id^="canonical-estimate-row-identity|"]')).toHaveCount(0);
    const ambiguousText = await bodyText(page);
    expect(ambiguousText).not.toMatch(/12\s*000\s*м|12\s*этаж|несущий каркас|ограждающие конструкции|фасад/iu);
    expect(ambiguousText).toMatch(/длина ленты|суммарн.*длин.*лент/iu);
    expect(ambiguousText).toMatch(/ширина ленты/iu);
    expect(ambiguousText).toMatch(/высота (?:бетонной )?ленты/iu);

    await resetRequest(page);
    const compileResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && response.url() === `${BACKEND_ORIGIN}/jobs/compile`,
    { timeout: 180_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(COMPLETE_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compileResponsePromise;
    expect(compileResponse.status()).toBe(202);
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 180_000 });
    const anchors = page.locator("[data-testid^='request-estimate-item-anchor-']");
    await expect(anchors).toHaveCount(29, { timeout: 180_000 });
    const identity = String(await page.locator('[id^="canonical-estimate-row-identity|"]').first().getAttribute("id"));
    const identityParts = identity.split("|");
    expect(identityParts[3]).toBe(CATALOG_ID);
    const revisionId = identityParts[1];
    const releaseId = identityParts[2];
    expect(revisionId).toBeTruthy();
    expect(releaseId).toBeTruthy();

    const completeText = await bodyText(page);
    for (const required of [
      "Бетонная смесь B25, W6, F150, P4",
      "Арматурная сталь по проектной ведомости",
      "Устройство бетонной подготовки",
      "Монтаж арматурного каркаса",
      "Укладка и уплотнение бетонной смеси",
      "Разработка грунта под фундаментную ленту",
      "Песок для уплотнённой подушки основания",
      "Битумно-полимерная обмазочная гидроизоляция",
      "Экскаватор для разработки грунта",
      "Доставка материала подушки основания",
      "Вывоз лишнего грунта автомобилями-самосвалами",
    ]) expect(completeText).toContain(required);
    expect(completeText).toContain("Устройство монолитного железобетонного ленточного фундамента — 40 м");
    expect(completeText).not.toMatch(/12\s*000\s*м|12\s*этаж|несущий каркас|ограждающие конструкции|фасад/iu);

    await page.getByTestId("consumer-estimate-open-procurement").click();
    await expect(page.getByTestId("consumer-estimate-procurement-list")).toBeVisible({ timeout: 60_000 });
    await attachProofPhoto(page);
    await expect(page.getByTestId("consumer-repair-city-input")).toHaveValue("");
    await expect(page.getByTestId("consumer-repair-address-input")).toHaveValue("");
    await expect(page.getByTestId("consumer-repair-phone-input")).toHaveValue("");

    const draftUrl = page.url();
    const pdfFileResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND_ORIGIN}/canonical-estimate/artifact-files/`) && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/iu, { timeout: 180_000 });
    const pdfFileResponse = await pdfFileResponsePromise;
    expect(pdfFileResponse.headers()["content-type"]).toContain("application/pdf");
    const pdfRoute = new URL(page.url());
    expect(pdfRoute.searchParams.get("sessionId")).toBeTruthy();
    const pdfFrame = page.getByTestId("pdf-viewer-web-iframe");
    await expect(pdfFrame).toHaveAttribute(
      "src",
      /^http:\/\/127\.0\.0\.1:8765\/canonical-estimate\/artifact-files\//u,
      { timeout: 120_000 },
    );
    await expect(pdfFrame).toHaveAttribute("aria-busy", "false", { timeout: 120_000 });
    await expect(page.locator("body")).not.toContainText("Document not found");
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page).toHaveURL(draftUrl);
    await expect(page.locator('[id^="canonical-estimate-row-identity|"]').first()).toBeVisible({ timeout: 120_000 });

    await page.getByTestId("consumer-repair-approve").last().click();
    await expect(page.getByTestId("consumer-repair-status")).toContainText(/утверждена/iu, { timeout: 180_000 });
    await page.getByTestId("consumer-repair-history-button").click();
    const historyRow = page.getByTestId("consumer-repair-history-row")
      .filter({ hasText: /ленточн.*фундамент/iu })
      .first();
    await expect(historyRow).toBeVisible({ timeout: 120_000 });
    await historyRow.getByTestId("consumer-repair-history-main").click();
    await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-history-readonly-item")).toHaveCount(29);
    await expect(page.getByTestId("consumer-repair-history-backend-pdf-artifact")).toHaveCount(1);

    const restarted = restartExactOwnedBackend();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 120_000 });
    await page.getByTestId("consumer-repair-history-button").click();
    const restoredHistoryRow = page.getByTestId("consumer-repair-history-row")
      .filter({ hasText: /ленточн.*фундамент/iu })
      .first();
    await expect(restoredHistoryRow).toBeVisible({ timeout: 120_000 });
    await restoredHistoryRow.getByTestId("consumer-repair-history-main").click();
    await expect(page.getByTestId("consumer-repair-history-readonly-item")).toHaveCount(29, { timeout: 120_000 });
    await expect(page.getByTestId("consumer-repair-history-backend-pdf-artifact")).toHaveCount(1);
    await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toContainText(
      "Устройство монолитного железобетонного ленточного фундамента",
    );
    const durableProcurement = await readDurableProcurementArtifact(page, revisionId);
    expect(durableProcurement).toMatchObject({
      artifactStatus: "ready",
      artifactKind: "procurement",
      artifactRevisionId: revisionId,
      artifactReleaseId: releaseId,
      fileStatus: 200,
      schemaVersion: "canonical_estimate_procurement_r7",
    });
    expect(Number(durableProcurement.selectedRowCount)).toBeGreaterThan(0);
    expect(durableProcurement.rowTitles).toContain("Бетонная смесь B25, W6, F150, P4");

    const archivalPdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND_ORIGIN}/canonical-estimate/artifact-files/`) && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("consumer-repair-history-open-pdf-expanded").click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/iu, { timeout: 180_000 });
    const archivalPdfResponse = await archivalPdfResponsePromise;
    expect(archivalPdfResponse.headers()["content-type"]).toContain("application/pdf");
    await expect(page.getByTestId("pdf-viewer-web-iframe")).toHaveAttribute("aria-busy", "false", {
      timeout: 120_000,
    });

    fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
    const screenshotPath = path.join(EVIDENCE_ROOT, "foundation-approved-restart-pdf.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(path.join(EVIDENCE_ROOT, "foundation-confirm.json"), `${JSON.stringify({
      schemaVersion: "rik-expo-app.r4-a10.foundation-confirm-web.v1",
      generatedAt: new Date().toISOString(),
      masterSha256: MASTER_SHA256,
      ambiguous: { prompt: AMBIGUOUS_PROMPT, backendCompileRequests: 0, inventedBuildingParameters: false },
      complete: { prompt: COMPLETE_PROMPT, compileStatus: compileResponse.status(), revisionId, releaseId,
        catalogId: CATALOG_ID, rowCount: 29, procurementOpened: true, professionalPdfOpened: true,
        approved: true, approvedWithoutContacts: true, durableHistoryOpened: true, archivalPdfReady: true,
        procurementArtifactReady: true, procurementRowCountAfterRestart: durableProcurement.selectedRowCount,
        exactWorkTitle: "Устройство монолитного железобетонного ленточного фундамента",
        exactConcreteTitle: "Бетонная смесь B25, W6, F150, P4",
        initialBackendPidBefore: configuredRuntime.beforePid, initialBackendPidAfter: configuredRuntime.afterPid,
        pageReloaded: true, backendRestarted: true, backendPidBefore: restarted.beforePid,
        backendPidAfter: restarted.afterPid, rowCountAfterRestart: 29,
        archivalPdfContentTypeAfterRestart: archivalPdfResponse.headers()["content-type"] },
      consoleErrors,
      pageErrors,
      productionOrigins: [...productionOrigins],
      productionRequests: 0,
      screenshot: path.relative(process.cwd(), screenshotPath).replace(/\\/gu, "/"),
      fakeGreenClaimed: false,
    }, null, 2)}\n`, "utf8");

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect([...productionOrigins]).toEqual([]);
  });

});
