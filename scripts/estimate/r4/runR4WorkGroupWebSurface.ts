import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { chromium, type Page } from "playwright";

import {
  allRevisionRows,
  api,
  appendJsonl,
  argument,
  atomicJson,
  completedCaseIds,
  ensureArtifact,
  fileProof,
  inspectPng,
  invariant,
  loadBatch,
  proofSession,
  sha256,
  stableJson,
  type BackendCase,
  type Json,
} from "./r4WorkGroupSurfaceShared";

const MASTER_SHA256 = process.env.ESTIMATE_SURFACE_MASTER_SHA256
  ?? "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const SOURCE_SHA_RE = /^[0-9a-f]{64}$/u;

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/gu, "_");
}

function displayedCount(value: string): number {
  const match = value.match(/\d+/u);
  return match ? Number(match[0]) : 0;
}

async function searchProof(apiRoot: string, workIdentity: string): Promise<Json> {
  const catalog = await api(apiRoot, `catalog/${encodeURIComponent(workIdentity)}`);
  const searchText = String(catalog.item?.titleRu ?? "").trim();
  invariant(searchText.length >= 2, `R4_WEB_SEARCH_TITLE_MISSING:${workIdentity}`);
  const result = await api(apiRoot, `search/catalog?query=${encodeURIComponent(searchText)}&mode=PHRASE&pageSize=100`);
  const exact = (result.items as Json[]).find((item) => item.catalogId === workIdentity);
  invariant(exact?.estimateReady === true, `R4_WEB_SEARCH_EXACT_RED:${workIdentity}`);
  return {
    searchIndexReleaseId: result.searchIndexReleaseId,
    resultSetSha256: result.resultSetSha256,
    exactCatalogId: exact.catalogId,
    exactMatchType: exact.matchType,
    searchText,
    estimateReady: exact.estimateReady,
    proofSha256: sha256(stableJson({
      searchIndexReleaseId: result.searchIndexReleaseId,
      resultSetSha256: result.resultSetSha256,
      exactCatalogId: exact.catalogId,
      exactMatchType: exact.matchType,
    })),
  };
}

type UiCanonicalRow = {
  rowId: string;
  rowSha256: string;
  revisionId: string;
  releaseId: string;
  catalogId: string;
  unitId: string;
  itemType: string;
  label: string;
  quantity: number;
};

async function uiRows(
  page: Page,
  rows: Json[],
  revisionId: string,
  releaseId: string,
): Promise<UiCanonicalRow[]> {
  const expected = rows.map((row) => ({
    rowId: String(row.rowId),
    rowSha256: String(row.rowSha256),
    titleRu: String(row.titleRu),
    unitId: String(row.unitId),
    quantity: Number(row.quantity),
  }));
  const handle = await page.waitForFunction(({ expectedRows, expectedRevisionId, expectedReleaseId }) => {
    const visible = Array.from(document.querySelectorAll<HTMLElement>('[id^="canonical-estimate-row-identity|"]'))
      .map((container) => {
        const [prefix, revisionId, releaseId, catalogId, rowSha256, unitId, itemType, ...rowIdParts]
          = container.id.split("|");
        const input = container.querySelector<HTMLInputElement>(
          '[data-testid^="consumer-repair-item-quantity-input-"]',
        );
        return {
          rowId: prefix === "canonical-estimate-row-identity" ? rowIdParts.join("|") : "",
          rowSha256: String(rowSha256 ?? ""),
          revisionId: String(revisionId ?? ""),
          releaseId: String(releaseId ?? ""),
          catalogId: String(catalogId ?? ""),
          unitId: String(unitId ?? ""),
          itemType: String(itemType ?? ""),
          label: String(input?.getAttribute("aria-label") ?? ""),
          quantity: Number(input?.value),
        };
      });
    if (visible.length !== expectedRows.length) return false;
    const byRowId = new Map(visible.map((row) => [row.rowId, row]));
    if (byRowId.size !== visible.length) return false;
    for (const expectedRow of expectedRows) {
      const candidate = byRowId.get(expectedRow.rowId);
      if (!candidate
        || candidate.rowSha256 !== expectedRow.rowSha256
        || candidate.revisionId !== expectedRevisionId
        || candidate.releaseId !== expectedReleaseId
        || candidate.unitId !== expectedRow.unitId
        || !candidate.label.startsWith(`Количество ${expectedRow.titleRu}:`)
        || candidate.quantity !== expectedRow.quantity) return false;
    }
    return visible;
  }, { expectedRows: expected, expectedRevisionId: revisionId, expectedReleaseId: releaseId },
  { timeout: 120_000, polling: 100 });
  return await handle.jsonValue() as UiCanonicalRow[];
}

async function scrollToStableTestId(page: Page, testId: string): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const locator = page.getByTestId(testId).last();
      await locator.waitFor({ state: "attached", timeout: 15_000 });
      await locator.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
      await locator.waitFor({ state: "visible", timeout: 15_000 });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(100);
    }
  }
  throw lastError;
}

function exactRowParity(rows: Json[], visible: UiCanonicalRow[]): boolean {
  if (rows.length === 0 || rows.length !== visible.length) return false;
  const byRowId = new Map(visible.map((row) => [row.rowId, row]));
  if (byRowId.size !== visible.length) return false;
  for (const row of rows) {
    const candidate = byRowId.get(String(row.rowId));
    if (!candidate
      || candidate.rowSha256 !== String(row.rowSha256)
      || candidate.unitId !== String(row.unitId)
      || !candidate.label.startsWith(`Количество ${String(row.titleRu)}:`)
      || candidate.quantity !== Number(row.quantity)) return false;
  }
  return true;
}

async function executeCase(input: {
  page: Page;
  row: BackendCase;
  baseUrl: string;
  apiRoot: string;
  output: string;
  sourceSha: string;
  buildSha: string;
  releaseId: string;
  search: Json;
}): Promise<Json> {
  const { page, row, baseUrl, apiRoot, output, sourceSha, buildSha, releaseId, search } = input;
  invariant(row.revision_id && row.compile_job_status === "succeeded" && row.defects.length === 0,
    `R4_WEB_BACKEND_CASE_RED:${row.case_id}`);
  const revisionId = row.revision_id;
  const blockers: string[] = [];
  const requestTrace: Json[] = [];
  const pageErrors: string[] = [];
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") pageErrors.push(message.text());
  };
  const onResponse = (response: { url(): string; status(): number; request(): { method(): string } }) => {
    if (response.url().includes("/canonical-estimate/")) {
      requestTrace.push({ method: response.request().method(), url: response.url(), status: response.status() });
    }
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  page.on("response", onResponse);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  try {
    const targetPath = `/request?canonicalRevisionId=${encodeURIComponent(revisionId)}&r4case=${encodeURIComponent(row.case_id)}`;
    const exactRevisionResponse = page.waitForResponse((response) =>
      response.status() === 200
      && response.url().includes(`/canonical-estimate/revisions/${revisionId}`)
      && !response.url().includes("/rows"),
    { timeout: 120_000 });
    await page.evaluate(({ target }) => {
      window.history.pushState({}, "", target);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, { target: targetPath });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId(`request-estimate-selected-catalog-id-${row.work_identity}`)
      .waitFor({ state: "visible", timeout: 120_000 });
    await exactRevisionResponse;
    await page.getByTestId("consumer-repair-draft-release-id")
      .waitFor({ state: "attached", timeout: 120_000 });
    await page.getByTestId("request-estimate-positions-panel").waitFor({ state: "visible", timeout: 120_000 });

    const [revision, rows, history] = await Promise.all([
      api(apiRoot, `revisions/${revisionId}`),
      allRevisionRows(apiRoot, revisionId),
      api(apiRoot, `revisions?catalogId=${encodeURIComponent(row.work_identity)}&limit=100`),
    ]);
    const visibleRows = await uiRows(page, rows, revisionId, releaseId);
    const rowCountText = await page.getByTestId("request-estimate-row-count").innerText();
    const currentRevisionText = await page.getByTestId("estimate-current-revision-id").innerText();
    await page.getByTestId("consumer-repair-bottom-actions").last()
      .waitFor({ state: "visible", timeout: 30_000 });

    if (revision.revisionId !== revisionId || revision.releaseId !== releaseId
      || revision.catalogId !== row.work_identity || Number(revision.rowCount) !== row.row_count) {
      blockers.push("REVISION_IDENTITY_RED");
    }
    if (rows.length !== row.row_count || displayedCount(rowCountText) !== row.row_count) blockers.push("ROW_COUNT_RED");
    if (!exactRowParity(rows, visibleRows)) blockers.push("BACKEND_UI_ROW_PARITY_RED");
    if (!(history.revisions as Json[]).some((item) => item.revisionId === revisionId)) blockers.push("HISTORY_REVISION_MISSING");
    if (!currentRevisionText.includes(String(revision.revisionNumber))) blockers.push("HISTORY_UI_IDENTITY_RED");
    if (!requestTrace.some((item) => item.status === 200 && item.url.includes(`/revisions/${revisionId}`))) {
      blockers.push("UI_CANONICAL_NETWORK_TRACE_MISSING");
    }

    const caseDirectory = join(output, "screenshots", safeName(row.work_group_id));
    mkdirSync(caseDirectory, { recursive: true });
    const topPath = join(caseDirectory, `${safeName(row.case_id)}-top.png`);
    const footerPath = join(caseDirectory, `${safeName(row.case_id)}-footer.png`);
    await scrollToStableTestId(page, "request-estimate-summary-card");
    await page.screenshot({ path: topPath });
    await scrollToStableTestId(page, "consumer-repair-bottom-actions");
    await page.screenshot({ path: footerPath });
    const topVisual = inspectPng(topPath);
    const footerVisual = inspectPng(footerPath);

    const [pdf, procurement] = await Promise.all([
      ensureArtifact(apiRoot, revisionId, releaseId, "pdf"),
      ensureArtifact(apiRoot, revisionId, releaseId, "procurement"),
    ]);
    if (pdf.status !== "ready" || pdf.revisionId !== revisionId) blockers.push("PDF_RED");
    if (procurement.status !== "ready" || procurement.revisionId !== revisionId) blockers.push("PROCUREMENT_RED");
    if (pageErrors.length > 0) blockers.push("PAGE_RUNTIME_ERRORS");

    const finishedAt = new Date().toISOString();
    return {
      contract: "rik-expo-app-r4.work-group-surface-case.v1",
      master_sha256: MASTER_SHA256,
      batch_id: row.batch_id,
      work_group_id: row.work_group_id,
      case_id: row.case_id,
      case_ordinal: row.case_ordinal,
      work_identity: row.work_identity,
      scenario_class: row.scenario_class,
      surface: "WEB",
      source_sha: sourceSha,
      build_sha: buildSha,
      input_sha: row.input_sha,
      revision_id: revisionId,
      boq_sha: row.boq_sha,
      search_ok: true,
      content_ok: blockers.every((item) => !["ROW_COUNT_RED", "REVISION_IDENTITY_RED"].includes(item)),
      formula_ok: blockers.every((item) => item !== "BACKEND_UI_ROW_PARITY_RED"),
      ui_ok: blockers.every((item) => !item.includes("UI_") && item !== "PAGE_RUNTIME_ERRORS"),
      history_ok: blockers.every((item) => !item.startsWith("HISTORY_")),
      pdf_ok: blockers.every((item) => item !== "PDF_RED"),
      procurement_ok: blockers.every((item) => item !== "PROCUREMENT_RED"),
      visual_review_ok: topVisual.pixelIntegrity === "GREEN" && footerVisual.pixelIntegrity === "GREEN",
      search_proof: search,
      ui: {
        base_url: baseUrl,
        backend_api_root: apiRoot,
        expected_rows: row.row_count,
        visible_rows: visibleRows.length,
        row_count_text: rowCountText,
        current_revision_text: currentRevisionText,
        canonical_request_count: requestTrace.length,
        canonical_request_trace_sha256: sha256(stableJson(requestTrace)),
        screenshot_top: topVisual,
        screenshot_footer: footerVisual,
        visual_review_method: "REAL_BROWSER_DOM_IDENTITY_PLUS_PIXEL_INTEGRITY_AND_TOP_FOOTER_INSPECTION",
      },
      artifacts: {
        pdf: { artifact_id: pdf.artifactId, sha256: pdf.sha256, revision_id: pdf.revisionId },
        procurement: { artifact_id: procurement.artifactId, sha256: procurement.sha256, revision_id: procurement.revisionId },
      },
      page_errors: pageErrors,
      defects: blockers,
      production_accessed: false,
      started_at: startedAt,
      completed_at: finishedAt,
      duration_ms: Number((performance.now() - started).toFixed(3)),
      verdict: blockers.length === 0 ? "GREEN" : "RED",
    };
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
    page.off("response", onResponse);
  }
}

async function main(): Promise<void> {
  const batchId = argument("batch");
  invariant(/^BATCH-00[1-8]$/u.test(batchId), "R4_WEB_BATCH_REQUIRED");
  const sourceSha = argument("source-sha");
  const buildSha = argument("build-sha");
  invariant(SOURCE_SHA_RE.test(sourceSha) && SOURCE_SHA_RE.test(buildSha), "R4_WEB_SOURCE_AND_BUILD_SHA_REQUIRED");
  const baseUrl = argument("base-url", "http://127.0.0.1:8180").replace(/\/+$/u, "");
  const apiRoot = argument("api-root", "http://127.0.0.1:8765/canonical-estimate").replace(/\/+$/u, "");
  const output = resolve(argument("output",
    `.release-runtime/real-useful-estimates-r4/evidence/current-green/work-group-runtime/web/${batchId.toLowerCase()}`));
  const workers = Math.max(1, Math.min(8, Number(argument("workers", "4")) || 4));
  const offset = Math.max(0, Number(argument("offset", "0")) || 0);
  const limitArgument = Number(argument("limit", "0")) || 0;
  const { aggregateProof, binding, backendCases } = loadBatch(batchId);
  const expected = backendCases.filter((row) => row.case_ordinal >= 1 && row.case_ordinal <= 15);
  invariant(expected.length === binding.work_groups * 15 && expected.every((row) => row.compile_job_status === "succeeded"),
    `R4_WEB_15_PER_GROUP_PLAN_RED:${batchId}`);
  const ledgerPath = join(output, `${batchId}_WEB_CASES_R4.jsonl`);
  const completed = completedCaseIds(ledgerPath, { sourceSha, buildSha });
  const pendingAll = expected.filter((row) => !completed.has(row.case_id));
  const pending = pendingAll.slice(offset, limitArgument > 0 ? offset + limitArgument : undefined);
  mkdirSync(output, { recursive: true });

  const runtime = await api(apiRoot, "runtime-manifest");
  invariant(["rik_r4_runtime", "rik_r4_runtime_b5_v2"].includes(String(runtime.database?.name))
    && runtime.specSha256 === MASTER_SHA256,
    `R4_WEB_RUNTIME_IDENTITY_RED:${batchId}`);
  invariant(runtime.searchRelease?.id, `R4_WEB_SEARCH_RELEASE_MISSING:${batchId}`);
  const browser = await chromium.launch({ headless: true });
  const searchCache = new Map<string, Promise<Json>>();
  let cursor = 0;
  let newGreen = 0;
  let newRed = 0;
  await Promise.all(Array.from({ length: Math.min(workers, Math.max(1, pending.length)) }, async (_, workerIndex) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const session = proofSession();
    await context.addInitScript(({ value }) => {
      for (const key of ["sb-127-auth-token", "sb-10-auth-token"]) localStorage.setItem(key, JSON.stringify(value));
    }, { value: session });
    await context.route("**/auth/v1/user", (route) => route.fulfill({ status: 200,
      contentType: "application/json; charset=utf-8", body: JSON.stringify(session.user) }));
    await context.route("**/rest/v1/rpc/get_my_role", (route) => route.fulfill({ status: 200,
      contentType: "application/json; charset=utf-8", body: JSON.stringify("consumer") }));
    await context.route("**/rest/v1/rpc/ensure_my_profile", (route) => route.fulfill({ status: 200,
      contentType: "application/json; charset=utf-8", body: "null" }));
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(() => document.body.innerText.trim().length > 20, undefined, { timeout: 120_000 });
    await page.waitForFunction(() => Boolean((globalThis as typeof globalThis & {
      __RIK_BUILD_IDENTITY_EVIDENCE__?: string;
    }).__RIK_BUILD_IDENTITY_EVIDENCE__), undefined, { timeout: 120_000 });
    const embeddedBuildIdentity = JSON.parse(await page.evaluate(() =>
      (globalThis as typeof globalThis & { __RIK_BUILD_IDENTITY_EVIDENCE__?: string })
        .__RIK_BUILD_IDENTITY_EVIDENCE__ ?? "null")) as Json | null;
    invariant(embeddedBuildIdentity?.release?.productSourceHash === sourceSha,
      `R4_WEB_EMBEDDED_SOURCE_IDENTITY_RED:${embeddedBuildIdentity?.release?.productSourceHash}:${sourceSha}`);
    while (cursor < pending.length) {
      const index = cursor++;
      const row = pending[index]!;
      let search = searchCache.get(row.work_identity);
      if (!search) {
        search = searchProof(apiRoot, row.work_identity);
        searchCache.set(row.work_identity, search);
      }
      try {
        const result = await executeCase({ page, row, baseUrl, apiRoot, output, sourceSha, buildSha,
          releaseId: binding.release_id, search: await search });
        appendJsonl(ledgerPath, result);
        if (result.verdict === "GREEN") newGreen += 1;
        else newRed += 1;
      } catch (error) {
        const result = {
          contract: "rik-expo-app-r4.work-group-surface-case.v1",
          master_sha256: MASTER_SHA256,
          batch_id: batchId,
          work_group_id: row.work_group_id,
          case_id: row.case_id,
          case_ordinal: row.case_ordinal,
          work_identity: row.work_identity,
          scenario_class: row.scenario_class,
          surface: "WEB",
          source_sha: sourceSha,
          build_sha: buildSha,
          input_sha: row.input_sha,
          revision_id: row.revision_id,
          boq_sha: row.boq_sha,
          defects: [error instanceof Error ? error.message : String(error)],
          production_accessed: false,
          worker_index: workerIndex,
          verdict: "RED",
        };
        appendJsonl(ledgerPath, result);
        newRed += 1;
      }
    }
    await context.close();
  }));
  await browser.close();

  const allRows = (await import("./r4WorkGroupSurfaceShared")).jsonl(ledgerPath)
    .filter((row) => row.source_sha === sourceSha && row.build_sha === buildSha);
  const latest = new Map<string, Json>();
  for (const row of allRows) latest.set(String(row.case_id), row);
  const current = expected.map((row) => latest.get(row.case_id)).filter(Boolean) as Json[];
  const green = current.filter((row) => row.verdict === "GREEN");
  const currentLedgerPath = join(output, `${batchId}_WEB_CURRENT_CASES_R4.jsonl`);
  writeFileSync(currentLedgerPath, `${current.map((row) => stableJson(row)).join("\n")}\n`, "utf8");
  const summary = {
    contract: "rik-expo-app-r4.work-group-web-surface-summary.v1",
    master_sha256: MASTER_SHA256,
    source_sha: sourceSha,
    build_sha: buildSha,
    batch_id: batchId,
    release_id: binding.release_id,
    expected_cases: expected.length,
    completed_cases: current.length,
    green_cases: green.length,
    red_cases: current.length - green.length,
    work_groups_expected: binding.work_groups,
    work_groups_green_15_of_15: new Set(green.map((row) => row.work_group_id)).size === binding.work_groups
      && Array.from(new Set(green.map((row) => row.work_group_id))).every((group) => green.filter((row) => row.work_group_id === group).length >= 15),
    new_execution: { pending_selected: pending.length, green: newGreen, red: newRed },
    parents: { backend_aggregate: aggregateProof, backend_ledger: fileProof(resolve(binding.ledger.path)) },
    ledger: fileProof(currentLedgerPath),
    resumable_history_ledger: fileProof(ledgerPath),
    production_accessed: false,
    status: green.length === expected.length ? "GREEN_WEB_15_PER_WORK_GROUP" : newRed > 0 ? "RED" : "R4_WEB_IN_PROGRESS",
  };
  atomicJson(join(output, `${batchId}_WEB_SUMMARY_R4.json`), summary);
  process.stdout.write(`${JSON.stringify({ status: summary.status, batchId, expected: expected.length,
    completed: current.length, green: green.length, newGreen, newRed }, null, 2)}\n`);
  if (newRed > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
