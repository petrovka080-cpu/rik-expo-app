import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.road-15000-web-acceptance.v1";
const WEB_ROOT = (process.env.R6_WEB_ROOT ?? "http://127.0.0.1:8081").replace(/\/$/u, "");
const API_ROOT = (process.env.R6_API_ROOT ?? "http://127.0.0.1:8765").replace(/\/$/u, "");
const PROMPT = "Построить асфальтовую дорогу длиной 15 000 м";
const EXPECTED_OWNER = "canonical-work:expanded:asphalt_concrete_pavement";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/web-acceptance/road15000");
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function enterLocalConsumer(page: Page): Promise<void> {
  await page.goto(`${WEB_ROOT}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ state: "visible", timeout: 180_000 });
  if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login"));
    if (attempt === 0) await login.first().waitFor({ state: "visible", timeout: 180_000 });
    if (!await login.first().isVisible().catch(() => false)) {
      const ready = await page.getByTestId("consumer-repair-problem-input")
        .waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false);
      if (ready) return;
      break;
    }
    await login.first().click();
    const ready = await page.getByTestId("consumer-repair-problem-input")
      .waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false);
    if (ready) return;
  }
  const diagnostic = await page.evaluate(() => ({
    url: window.location.href,
    body: document.body.innerText.slice(0, 3_000),
    testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) => node.getAttribute("data-testid")).slice(0, 100),
  }));
  throw new Error(`R6_ROAD_15000_LOCAL_CONSUMER_LOGIN_RED:${JSON.stringify(diagnostic)}`);
}

async function newestDraftId(page: Page): Promise<string> {
  const fromUrl = new URL(page.url()).searchParams.get("draftId");
  if (fromUrl) return fromUrl;
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("rik.consumer_repair.request_bundles.v2.manifest");
    if (!raw) return null;
    try {
      const manifest = JSON.parse(raw) as { bundleIds?: unknown };
      return Array.isArray(manifest.bundleIds) && typeof manifest.bundleIds[0] === "string"
        ? manifest.bundleIds[0]
        : null;
    } catch {
      return null;
    }
  });
  invariant(stored, "R6_ROAD_15000_DRAFT_ID_MISSING");
  return stored;
}

async function visibleText(page: Page, testId: string): Promise<string> {
  return (await page.getByTestId(testId).innerText()).replace(/\s+/gu, " ").trim();
}

async function storedRoadLength(page: Page, draftId: string): Promise<Json> {
  const result = await page.evaluate((id) => {
    const encodedId = encodeURIComponent(id);
    let raw = window.localStorage.getItem(`rik.consumer_repair.request_bundle.v2:${encodedId}`);
    if (!raw) {
      const pointerRaw = window.localStorage.getItem(`rik.consumer_repair.request_pointer.v3:${encodedId}`);
      try {
        const checksum = pointerRaw ? JSON.parse(pointerRaw).currentChecksum : null;
        if (typeof checksum === "string") {
          raw = window.localStorage.getItem(`rik.consumer_repair.request_snapshot.v3:${encodedId}:${checksum}`);
        }
      } catch { /* fail closed below */ }
    }
    try {
      const record = raw ? JSON.parse(raw) : null;
      return record?.estimateDraftSession?.parameters?.length_m ?? null;
    } catch {
      return null;
    }
  }, draftId);
  invariant(result && Number(result.value) === 15_000 && result.unit === "m" && result.origin === "USER_ENTERED",
    `R6_ROAD_15000_DURABLE_LENGTH_MISMATCH:${JSON.stringify(result)}`);
  return result;
}

async function openParameterPanel(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() > 0) return;
  await page.getByTestId("request-estimate-parameters-toggle").click();
  await page.getByTestId("request-estimate-parameter-panel").waitFor({ state: "visible", timeout: 30_000 });
}

async function fillParameter(page: Page, key: string, value: string | number | boolean): Promise<void> {
  await openParameterPanel(page);
  let editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  for (let attempt = 0; attempt < 30 && await editor.count() === 0; attempt += 1) {
    const more = page.getByTestId("request-estimate-show-more-parameters");
    if (await more.count() === 0) break;
    await more.click();
    editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  }
  const activeEditor = editor.filter({ visible: true }).first();
  await activeEditor.waitFor({ state: "visible", timeout: 30_000 });
  const option = page.getByTestId(`editable-param-option-${key}-${String(value)}`).filter({ visible: true });
  if (await option.count() > 0) {
    await option.first().click();
    return;
  }
  const input = activeEditor.getByTestId("editable-param-popover-input");
  await input.fill(String(value));
  invariant((await input.inputValue()).replace(",", ".") === String(value), `R6_ROAD_15000_VALUE_REJECTED:${key}`);
}

async function currentRevisionId(page: Page): Promise<string> {
  const identity = await page.locator('[id^="canonical-estimate-row-identity|"]').first()
    .getAttribute("id", { timeout: 60_000 });
  const revisionId = String(identity ?? "").split("|")[1] ?? "";
  invariant(/^[0-9a-f-]{36}$/iu.test(revisionId), `R6_ROAD_15000_REVISION_ID_MISSING:${identity}`);
  return revisionId;
}

async function editorKeys(page: Page): Promise<string[]> {
  await openParameterPanel(page);
  while (await page.getByTestId("request-estimate-show-more-parameters").count() > 0) {
    await page.getByTestId("request-estimate-show-more-parameters").click();
  }
  return page.locator('[data-testid^="editable-param-inline-editor-"]')
    .evaluateAll((nodes) => [...new Set(nodes.map((node) =>
      String(node.getAttribute("data-testid") ?? "").replace("editable-param-inline-editor-", "")
    ))].sort());
}

async function explicitValidationFixture(
  client: Client,
  releaseId: string,
): Promise<Record<string, string | number | boolean>> {
  const row = (await client.query(`select baseline.input_values
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline
      on baseline.id=manifest.approved_template_baseline_id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [releaseId, EXPECTED_OWNER])).rows[0] as Json | undefined;
  invariant(row?.input_values && typeof row.input_values === "object",
    "R6_ROAD_15000_VALIDATION_FIXTURE_MISSING");
  return row.input_values as Record<string, string | number | boolean>;
}

function selectedMissingParameterIds(revision: Json): string[] {
  return [...new Set((revision.preliminaryNeeds ?? [])
    .filter((need: Json) => need.selected)
    .flatMap((need: Json) => Array.isArray(need.missingParameterIds) ? need.missingParameterIds : []))]
    .map(String)
    .sort();
}

async function readRevision(revisionId: string, authorization: string): Promise<Json> {
  const response = await fetch(`${API_ROOT}/revisions/${revisionId}`, {
    headers: { accept: "application/json", authorization },
  });
  const revision = await response.json() as Json;
  invariant(response.status === 200, `R6_ROAD_15000_REVISION_READ_${response.status}:${revisionId}`);
  return revision;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const currentRelease = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(currentRelease.definitionReleaseId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(releaseId), "R6_ROAD_15000_RELEASE_ID_MISSING");
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-road-15000-web-acceptance" });
  await client.connect();
  const validationFixture = await explicitValidationFixture(client, releaseId);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const requests: Json[] = [];
  let backendAuthorization = "";
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => {
    if (!response.url().startsWith(API_ROOT)) return;
    requests.push({ method: response.request().method(), status: response.status(), url: response.url() });
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(API_ROOT)) return;
    const authorization = request.headers()["authorization"];
    if (authorization) backendAuthorization = authorization;
  });

  try {
    await enterLocalConsumer(page);
    await page.goto(`${WEB_ROOT}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const input = page.getByTestId("consumer-repair-problem-input");
    await input.waitFor({ state: "visible", timeout: 120_000 });
    await input.fill(PROMPT);
    const suggestions = page.getByTestId("consumer-repair-work-suggestions");
    await suggestions.waitFor({ state: "visible", timeout: 60_000 });
    const suggestion = page.getByTestId("consumer-repair-work-suggestion-1");
    const suggestionText = (await suggestion.innerText()).replace(/\s+/gu, " ").trim();
    await suggestion.click();
    invariant(await input.inputValue() === PROMPT, `R6_ROAD_15000_PROMPT_CHANGED_AFTER_SELECTION:${await input.inputValue()}`);
    const buildEstimate = page.getByTestId("inline-work-prompt-build-estimate")
      .or(page.getByTestId("consumer-repair-prepare-draft"));
    await buildEstimate.first().waitFor({ state: "visible", timeout: 30_000 });
    await buildEstimate.first().click();
    const scopeSelection = page.getByTestId("road-scope-selection");
    await scopeSelection.waitFor({ state: "visible", timeout: 90_000 });
    const selectedIdentity = page.getByTestId(`request-estimate-selected-catalog-id-${EXPECTED_OWNER}`);
    await selectedIdentity.waitFor({ state: "attached", timeout: 30_000 });
    invariant((await scopeSelection.innerText()).includes(PROMPT), "R6_ROAD_15000_PENDING_PROMPT_NOT_VISIBLE");
    const offeredScopeTestIds = await scopeSelection.locator('[data-testid^="road-scope-option-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    invariant(offeredScopeTestIds.length === 4, `R6_ROAD_15000_SCOPE_COUNT:${offeredScopeTestIds.length}`);
    const draftId = await newestDraftId(page);
    const durableLengthBeforeReload = await storedRoadLength(page, draftId);
    const pendingUrl = `${WEB_ROOT}/request?draftId=${encodeURIComponent(draftId)}`;
    const pendingPostsBeforeReload = requests.filter((request) => request.method === "POST").length;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-scope-pending.png`), fullPage: true });

    await page.goto(pendingUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await scopeSelection.waitFor({ state: "visible", timeout: 90_000 });
    const pendingPostsAfterReload = requests.filter((request) => request.method === "POST").length;
    invariant(pendingPostsAfterReload === pendingPostsBeforeReload, "R6_ROAD_15000_PENDING_RELOAD_MUTATED_BACKEND");
    invariant((await scopeSelection.innerText()).includes(PROMPT), "R6_ROAD_15000_PENDING_PROMPT_LOST_ON_RELOAD");
    const reloadedPrompt = await visibleText(page, "request-estimate-current-launch-prompt-text");
    invariant(reloadedPrompt === PROMPT, `R6_ROAD_15000_INPUT_LOST_ON_RELOAD:${reloadedPrompt}`);
    const durableLengthAfterReload = await storedRoadLength(page, draftId);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-scope-reload.png`), fullPage: true });

    await page.getByTestId("road-scope-option-full_pavement_structure").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    const revisionId = await currentRevisionId(page);
    invariant(backendAuthorization, "R6_ROAD_15000_BACKEND_AUTHORIZATION_MISSING");
    const revision = await readRevision(revisionId, backendAuthorization);
    invariant(revision.releaseId === releaseId, `R6_ROAD_15000_RELEASE_MISMATCH:${revision.releaseId}`);
    invariant(revision.sourceRequestText === PROMPT, `R6_ROAD_15000_BACKEND_PROMPT_MISMATCH:${revision.sourceRequestText}`);
    const rowCountText = await visibleText(page, "request-estimate-row-count");
    const parameterStatusText = await visibleText(page, "request-estimate-parameter-status").catch(() => "");
    const selectedScopeText = await visibleText(page, "request-estimate-selected-scope").catch(() => "");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-pavement-preliminary.png`), fullPage: true });

    const explicitCoreInputs = {
      area_m2: 105_000,
      width_m: 7,
      traffic_class: "HEAVY",
      base_condition: "NEW_BASE_REQUIRED",
      wearing_layer_thickness_mm: 50,
      wearing_mix_type: "DENSE_FINE_GRAINED",
      asphalt_density_t_m3: 2.4,
    } as const;
    const preliminaryEditorKeys = await editorKeys(page);
    for (const [parameterId, value] of Object.entries(explicitCoreInputs)) {
      await fillParameter(page, parameterId, value);
    }
    const accepted = page.waitForResponse((response) => response.request().method() === "POST"
      && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
    await page.getByTestId("editable-param-batch-apply").first().click();
    await accepted;
    const childRevisionId = await page.waitForFunction((parentId) => {
      const identity = document.querySelector('[id^="canonical-estimate-row-identity|"]')?.getAttribute("id") ?? "";
      const id = identity.split("|")[1] ?? "";
      return id && id !== parentId ? id : null;
    }, revisionId, { timeout: 120_000 }).then((handle) => handle.jsonValue() as Promise<string>);
    const childRevision = await readRevision(childRevisionId, backendAuthorization);
    const childParameterStatusText = await visibleText(page, "request-estimate-parameter-status").catch(() => "");
    const childEditorKeys = await editorKeys(page);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-core-inputs.png`), fullPage: true });

    const childMissingParameterIds = selectedMissingParameterIds(childRevision);
    invariant(childMissingParameterIds.length > 0, "R6_ROAD_15000_EXPECTED_ENGINEERING_INPUTS_MISSING");
    const inaccessibleMissingParameterIds = childMissingParameterIds.filter((parameterId) =>
      !childEditorKeys.includes(parameterId)
    );
    invariant(inaccessibleMissingParameterIds.length === 0,
      `R6_ROAD_15000_ACTIVE_INPUTS_NOT_EDITABLE:${JSON.stringify(inaccessibleMissingParameterIds)}`);
    const fixtureGaps = childMissingParameterIds.filter((parameterId) =>
      !Object.prototype.hasOwnProperty.call(validationFixture, parameterId)
    );
    invariant(fixtureGaps.length === 0,
      `R6_ROAD_15000_EXPLICIT_FIXTURE_GAPS:${JSON.stringify(fixtureGaps)}`);
    const explicitEngineeringInputs = Object.fromEntries(childMissingParameterIds.map((parameterId) => [
      parameterId,
      validationFixture[parameterId],
    ]));
    for (const [parameterId, value] of Object.entries(explicitEngineeringInputs)) {
      await fillParameter(page, parameterId, value);
    }
    const finalAccepted = page.waitForResponse((response) => response.request().method() === "POST"
      && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
    await page.getByTestId("editable-param-batch-apply").first().click();
    await finalAccepted;
    const finalRevisionId = await page.waitForFunction((parentId) => {
      const identity = document.querySelector('[id^="canonical-estimate-row-identity|"]')?.getAttribute("id") ?? "";
      const id = identity.split("|")[1] ?? "";
      return id && id !== parentId ? id : null;
    }, childRevisionId, { timeout: 120_000 }).then((handle) => handle.jsonValue() as Promise<string>);
    const finalRevision = await readRevision(finalRevisionId, backendAuthorization);
    const finalMissingParameterIds = selectedMissingParameterIds(finalRevision);
    invariant((finalRevision.preliminaryNeeds ?? []).length === 0,
      `R6_ROAD_15000_FINAL_NEEDS_REMAIN:${(finalRevision.preliminaryNeeds ?? []).length}:${JSON.stringify(finalMissingParameterIds)}`);
    const finalParameterStatusText = await visibleText(page, "request-estimate-parameter-status").catch(() => "");
    invariant(!/[1-9]\d*\s+параметр/iu.test(finalParameterStatusText),
      `R6_ROAD_15000_UI_FALSE_READY:${finalParameterStatusText}`);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-complete.png`), fullPage: true });

    const postsBeforeFinalReload = requests.filter((request) => request.method === "POST").length;
    await page.goto(pendingUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 120_000 });
    const reloadedFinalRevisionId = await currentRevisionId(page);
    const postsAfterFinalReload = requests.filter((request) => request.method === "POST").length;
    invariant(reloadedFinalRevisionId === finalRevisionId,
      `R6_ROAD_15000_FINAL_REVISION_NOT_PRESERVED:${finalRevisionId}:${reloadedFinalRevisionId}`);
    invariant(postsAfterFinalReload === postsBeforeFinalReload, "R6_ROAD_15000_FINAL_RELOAD_MUTATED_BACKEND");
    const durableLengthAfterCompletionReload = await storedRoadLength(page, draftId);
    const finalReloadStatusText = await visibleText(page, "request-estimate-parameter-status").catch(() => "");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-road-15000-${runId}-complete-reload.png`), fullPage: true });

    const unsigned = {
      contract: CONTRACT,
      runId,
      generatedAt: new Date().toISOString(),
      prompt: PROMPT,
      selectedOwner: EXPECTED_OWNER,
      suggestionText,
      pending: {
        draftId,
        pendingUrl,
        offeredScopeTestIds,
        promptPreservedAfterSelection: true,
        promptPreservedAfterReload: true,
        durableLengthBeforeReload,
        durableLengthAfterReload,
        reloadMutationPosts: pendingPostsAfterReload - pendingPostsBeforeReload,
      },
      continued: {
        selectedScope: "FULL_PAVEMENT_STRUCTURE",
        selectedScopeText,
        revisionId,
        revision: {
          catalogId: revision.catalogId,
          releaseId: revision.releaseId,
          status: revision.status,
          parameters: revision.parameters,
          preliminaryNeedsCount: (revision.preliminaryNeeds ?? []).length,
          missingParameterIds: selectedMissingParameterIds(revision),
        },
        rowCountText,
        parameterStatusText,
        preliminaryEditorKeys,
        explicitCoreInputs,
        childRevisionId,
        childParameterStatusText,
        childEditorKeys,
        childMissingParameterIds,
        childRevision: {
          catalogId: childRevision.catalogId,
          releaseId: childRevision.releaseId,
          status: childRevision.status,
          preliminaryNeedsCount: (childRevision.preliminaryNeeds ?? []).length,
          missingParameterIds: childMissingParameterIds,
        },
        explicitEngineeringInputs,
        finalRevisionId,
        finalParameterStatusText,
        finalRevision: {
          catalogId: finalRevision.catalogId,
          releaseId: finalRevision.releaseId,
          status: finalRevision.status,
          rowCount: finalRevision.rowCount,
          preliminaryNeedsCount: (finalRevision.preliminaryNeeds ?? []).length,
          missingParameterIds: finalMissingParameterIds,
        },
      },
      reload: {
        finalRevisionId: reloadedFinalRevisionId,
        mutationPosts: postsAfterFinalReload - postsBeforeFinalReload,
        durableLengthAfterCompletionReload,
        finalReloadStatusText,
      },
      requests,
      pageErrors,
      consoleErrors,
      screenshots: [
        `r6-road-15000-${runId}-scope-pending.png`,
        `r6-road-15000-${runId}-scope-reload.png`,
        `r6-road-15000-${runId}-pavement-preliminary.png`,
        `r6-road-15000-${runId}-core-inputs.png`,
        `r6-road-15000-${runId}-complete.png`,
        `r6-road-15000-${runId}-complete-reload.png`,
      ],
      status: "GREEN_R6_ROAD_15000_FULL_UI_INPUTS_SAVED_COMPLETE_RELOAD",
    };
    invariant(pageErrors.length === 0, `R6_ROAD_15000_PAGE_ERRORS:${pageErrors.join("|")}`);
    const report = { ...unsigned, sha256: sha256(JSON.stringify(unsigned)) };
    const reportPath = resolve(OUTPUT_ROOT, `R6_ROAD_15000_WEB_ACCEPTANCE_${runId}.json`);
    atomicJson(reportPath, report);
    process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, draftId, revisionId,
      childRevisionId, finalRevisionId, rowCountText, parameterStatusText, childParameterStatusText,
      childMissingCount: childMissingParameterIds.length, finalParameterStatusText, finalRemainingNeeds: 0 }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
