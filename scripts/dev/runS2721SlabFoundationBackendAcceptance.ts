import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext } from "playwright";

import { SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID } from
  "../../src/lib/estimate/v4/slabFoundationFullCycleS2719";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-21.slab-foundation-500m2-backend-acceptance.v1";
const API_ROOT = process.env.S2721_BACKEND_ORIGIN
  ?? "http://127.0.0.1:8765/canonical-estimate";
const BROKER_URL = process.env.S2721_LOCAL_DEVELOPER_BROKER_URL
  ?? "http://127.0.0.1:54329";
const LOCAL_WEB_ORIGIN = process.env.S2721_LOCAL_WEB_ORIGIN
  ?? "http://localhost:8081";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/s27-21/acceptance/slab-foundation-500m2-backend",
);
const BROWSER_PROFILE = resolve(
  process.env.S2721_BROWSER_PROFILE
    ?? ".release-runtime/r568/s27-14/tmp-chrome-session-probe",
);
const BROWSER_ORIGIN = String(
  process.env.S2721_BROWSER_ORIGIN ?? "http://localhost:8101",
).replace(/\/+$/u, "");
let activeToken = "";
let retainedAuthContext: BrowserContext | null = null;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_21_SLAB_FOUNDATION_BACKEND:${code}`);
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

function decimalEq(value: unknown, expected: number): boolean {
  return Math.abs(Number(value) - expected) < 0.000001;
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

function refreshTokenFromValue(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    try {
      return refreshTokenFromValue(JSON.parse(value), depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const token = refreshTokenFromValue(entry, depth + 1);
      if (token) return token;
    }
    return null;
  }
  if (typeof value === "object") {
    const object = value as Json;
    if (typeof object.refresh_token === "string" && object.refresh_token.length > 20) {
      return object.refresh_token;
    }
    for (const entry of Object.values(object)) {
      const token = refreshTokenFromValue(entry, depth + 1);
      if (token) return token;
    }
  }
  return null;
}

async function browserSessionToken(): Promise<string | null> {
  if (!existsSync(BROWSER_PROFILE)) return null;
  const context = retainedAuthContext ?? await chromium.launchPersistentContext(
    BROWSER_PROFILE,
    { headless: true, serviceWorkers: "block" },
  );
  const createdContext = retainedAuthContext == null;
  try {
    const page = context.pages()[0] ?? await context.newPage();
    const storageUrl = `${BROWSER_ORIGIN}/__s2721_auth_storage__`;
    await context.route(storageUrl, async (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><title>S27.21 auth storage</title>",
    }));
    await page.goto(storageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    const entries = await page.evaluate(() => Object.entries(window.localStorage));
    const sessionEntry = entries.find(([key, value]) =>
      /^sb-[a-z0-9]+-auth-token$/iu.test(key)
        && key !== "sb-127-auth-token"
        && accessTokenFromValue(value) != null
        && refreshTokenFromValue(value) != null);
    if (!sessionEntry) return null;
    const providerUrl = String(process.env.STAGING_SUPABASE_URL ?? "")
      .trim()
      .replace(/\/+$/u, "");
    const publicKey = String(process.env.STAGING_SUPABASE_READONLY_KEY ?? "").trim();
    invariant(/^https:\/\//u.test(providerUrl) && publicKey.length > 20,
      "STAGING_REFRESH_CONFIG_RED");
    const existingAccessToken = accessTokenFromValue(sessionEntry[1]);
    invariant(existingAccessToken, "BROWSER_ACCESS_TOKEN_RED");
    const existingUserProbe = await fetch(`${providerUrl}/auth/v1/user`, {
      headers: { apikey: publicKey, authorization: `Bearer ${existingAccessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (existingUserProbe.ok) {
      retainedAuthContext = context;
      return existingAccessToken;
    }
    const refreshToken = refreshTokenFromValue(sessionEntry[1]);
    invariant(refreshToken, "BROWSER_REFRESH_TOKEN_RED");
    const refresh = await fetch(`${providerUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: publicKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(30_000),
    });
    const session = await refresh.json().catch(() => ({})) as Json;
    invariant(refresh.ok && typeof session.access_token === "string"
      && typeof session.refresh_token === "string", `STAGING_SESSION_REFRESH_${refresh.status}`);
    const userProbe = await fetch(`${providerUrl}/auth/v1/user`, {
      headers: { apikey: publicKey, authorization: `Bearer ${session.access_token}` },
      signal: AbortSignal.timeout(30_000),
    });
    invariant(userProbe.ok, `STAGING_SESSION_USER_PROBE_${userProbe.status}`);
    await page.evaluate(([key, value]) => {
      window.localStorage.setItem(key, value);
    }, [sessionEntry[0], JSON.stringify(session)] as [string, string]);
    retainedAuthContext = context;
    return session.access_token;
  } finally {
    if (createdContext && retainedAuthContext !== context) await context.close();
  }
}

async function closeRetainedAuthContext(): Promise<void> {
  const context = retainedAuthContext;
  retainedAuthContext = null;
  if (context) await context.close();
}

async function login(): Promise<string> {
  const suppliedToken = String(process.env.S2721_BACKEND_ACCESS_TOKEN ?? "")
    .trim()
    .replace(/^Bearer\s+/iu, "");
  if (suppliedToken) {
    invariant(suppliedToken.length > 20, "SUPPLIED_ACCESS_TOKEN_RED");
    activeToken = suppliedToken;
    return activeToken;
  }
  const browserToken = await browserSessionToken();
  if (browserToken) {
    activeToken = browserToken;
    return activeToken;
  }
  const response = await fetch(`${BROKER_URL}/session`, {
    method: "POST",
    headers: { Origin: LOCAL_WEB_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ role: "consumer" }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.role === "consumer" && typeof body.access_token === "string",
    `CONSUMER_LOGIN_${response.status}`);
  activeToken = body.access_token;
  return activeToken;
}

async function api(token: string, path: string, init: RequestInit = {}): Promise<Json> {
  const request = async (bearer: string) => fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${bearer}`,
      ...(init.body == null ? {} : { "content-type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  let response = await request(activeToken || token);
  if (response.status === 401) {
    await login();
    response = await request(activeToken);
  }
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function waitJob(token: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(token, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${jobId}:${String(job.errorCode ?? "")}`);
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`S27_21_SLAB_FOUNDATION_BACKEND:JOB_TIMEOUT:${jobId}`);
}

async function compile(
  token: string,
  parameters: Json,
  sourceRequestText: string,
  runId: string,
  key: string,
): Promise<Json> {
  const accepted = await api(token, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:compile`,
      catalogId: SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID,
      parameters,
      sourceRequestText,
      primaryMeasureParameterId: "slab_area_m2",
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function recalculate(
  token: string,
  parent: Json,
  parameters: Json,
  runId: string,
  key: string,
): Promise<Json> {
  const accepted = await api(token, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${key}:recalculate`,
      catalogId: parent.catalogId,
      parentRevisionId: parent.revisionId,
      sourceRequestText: parent.sourceRequestText,
      primaryMeasureParameterId: parent.primaryMeasureParameterId,
      parameters,
      currencyCode: parent.currencyCode,
      priceSnapshotIds: parent.priceSnapshotIds ?? [],
      rowOverrides: parent.amendmentContract?.rowOverrides ?? {},
      customRows: parent.amendmentContract?.customRows ?? [],
    }),
  });
  const job = await waitJob(token, String(accepted.jobId));
  return api(token, `revisions/${job.resultRevisionId}`);
}

async function allRows(token: string, revisionId: string): Promise<Json[]> {
  const result: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(token, `revisions/${revisionId}/rows?${query}`);
    result.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return result;
}

async function artifact(
  token: string,
  revisionId: string,
  kind: "pdf" | "procurement",
  runId: string,
): Promise<{ metadata: Json; bytes: Buffer }> {
  const request = await api(token, `revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${runId}:${revisionId}:${kind}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (request.jobId) await waitJob(token, String(request.jobId));
  const query = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  const metadata = await api(token, `revisions/${revisionId}/artifacts/${kind}${query}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `${kind.toUpperCase()}_NOT_READY`);
  const response = await fetch(metadata.signedUrl, {
    headers: { authorization: `Bearer ${activeToken || token}` },
    signal: AbortSignal.timeout(180_000),
  });
  invariant(response.ok, `${kind.toUpperCase()}_DOWNLOAD_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `${kind.toUpperCase()}_SHA_MISMATCH`);
  return { metadata, bytes };
}

async function pdfText(bytes: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n");
}

function byId(rows: readonly Json[]): Map<string, Json> {
  return new Map(rows.map((row) => [String(row.rowId), row]));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId);
  const searchReleaseId = String(current.searchReleaseId);
  invariant(releaseId === "85db481e-021a-52f2-838d-9e225ea1c125"
    && searchReleaseId === "1c627458-2ebf-5e8c-9034-40cdaef7867c",
  `CURRENT_RELEASE_PAIR_RED:${releaseId}:${searchReleaseId}`);

  const token = await login();
  const runtime = await api(token, "runtime-manifest");
  invariant(runtime.compatibilityTuple?.definitionReleaseId === releaseId
    && runtime.compatibilityTuple?.searchReleaseId === searchReleaseId,
  "RUNTIME_RELEASE_PAIR_RED");

  const prompt = "Устройство монолитного плитного фундамента полного цикла площадью 500 м²";
  const search = await api(token,
    `search/catalog?query=${encodeURIComponent(prompt)}&pageSize=50&scope=WORKS`);
  const items = Array.isArray(search.items) ? search.items as Json[] : [];
  const searchIndex = items.findIndex((item) =>
    item.catalogId === SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID);
  invariant(searchIndex >= 0 && searchIndex < 10 && items[searchIndex]?.estimateReady === true,
    `SEARCH_RED:${searchIndex}`);

  const original = await compile(token, { slab_area_m2: 500 }, prompt, runId, "500m2");
  const originalRows = await allRows(token, original.revisionId);
  const originalById = byId(originalRows);
  invariant(original.releaseId === releaseId && original.searchReleaseId === searchReleaseId,
    "REVISION_IDENTITY_RED");
  invariant(originalRows.length === 106 && (original.preliminaryNeeds ?? []).length === 0,
    `ROW_OR_NEED_RED:${originalRows.length}:${original.preliminaryNeeds?.length}`);
  invariant(originalRows.every((row) => row.unitPrice == null && row.amount == null),
    "UNKNOWN_PRICE_STATE_RED");
  invariant(decimalEq(originalById.get("slab-full:01:material:marking-cord")?.quantity, 180)
    && decimalEq(originalById.get("slab-full:03:material:separation-geotextile-rolls")?.quantity, 6)
    && decimalEq(originalById.get("slab-full:04:material:sand")?.quantity, 57.5)
    && decimalEq(originalById.get("slab-full:06:material:membrane-rolls")?.quantity, 55)
    && decimalEq(originalById.get("slab-full:06:material:xps-packages")?.quantity, 122)
    && decimalEq(originalById.get("slab-full:08:material:rebar-d12")?.quantity, 10_368)
    && decimalEq(originalById.get("slab-full:08:material:rebar-d16")?.quantity, 2_592)
    && decimalEq(originalById.get("slab-full:09:material:ready-mix")?.quantity, 108)
    && decimalEq(originalById.get("slab-full:11:consumable:test-sets")?.quantity, 2)
    && decimalEq(originalById.get("slab-full:12:material:repair-mortar-bags")?.quantity, 4),
  "CORE_QUANTITY_CHAIN_RED");

  const doubled = await compile(token, { slab_area_m2: 1_000 },
    "Устройство монолитного плитного фундамента полного цикла площадью 1000 м²",
    runId, "1000m2");
  const doubledRows = await allRows(token, doubled.revisionId);
  invariant(doubledRows.length === 106
    && decimalEq(byId(doubledRows).get("slab-full:01:material:marking-cord")?.quantity,
      254.558441224)
    && decimalEq(byId(doubledRows).get("slab-full:09:material:ready-mix")?.quantity, 216),
  "PUBLISHED_DERIVED_PERIMETER_RED");

  const explicitPerimeter = await recalculate(token, original, {
    ...original.parameters,
    plan_perimeter_override_selected: true,
    plan_perimeter_m: 120,
  }, runId, "explicit-perimeter");
  const explicitRows = await allRows(token, explicitPerimeter.revisionId);
  const explicitById = byId(explicitRows);
  invariant(explicitPerimeter.parentRevisionId === original.revisionId
    && explicitRows.length === 106
    && decimalEq(explicitById.get("slab-full:01:material:marking-cord")?.quantity, 240)
    && decimalEq(explicitById.get("slab-full:09:material:ready-mix")?.quantity, 108),
  "EXPLICIT_PERIMETER_LINEAGE_RED");

  const procurement = await artifact(token, explicitPerimeter.revisionId,
    "procurement", runId);
  const procurementJson = JSON.parse(procurement.bytes.toString("utf8")) as Json;
  const procurementRows = Array.isArray(procurementJson.rows)
    ? procurementJson.rows as Json[]
    : [];
  const procurementIds = new Set(procurementRows.map((row) => String(row.rowId)));
  invariant(procurementRows.length === 46 && [
    "slab-full:03:material:separation-geotextile-rolls",
    "slab-full:04:material:sand",
    "slab-full:06:material:membrane-rolls",
    "slab-full:06:material:xps-packages",
    "slab-full:08:material:rebar-d12",
    "slab-full:08:material:rebar-d16",
    "slab-full:09:material:ready-mix",
    "slab-full:10:material:liquid-curing-packages",
    "slab-full:12:material:repair-mortar-bags",
  ].every((rowId) => procurementIds.has(rowId)), "PROCUREMENT_COMPOSITION_RED");

  const pdf = await artifact(token, explicitPerimeter.revisionId, "pdf", runId);
  const text = await pdfText(pdf.bytes);
  invariant(pdf.bytes.subarray(0, 4).toString("ascii") === "%PDF"
    && pdf.metadata.metadata?.revisionId === explicitPerimeter.revisionId
    && pdf.metadata.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE"
    && text.includes("Цены не заполнены")
    && !text.includes("Оценено 0,00")
    && !text.includes("Техническое приложение"),
  "PDF_UNKNOWN_PRICE_OR_REVISION_RED");

  const history = await api(token,
    `revisions?catalogId=${encodeURIComponent(SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID)}&limit=20`);
  invariant((history.revisions as Json[]).some((revision) =>
    revision.revisionId === explicitPerimeter.revisionId), "REVISION_HISTORY_RED");

  const categoryCounts = Object.fromEntries([
    ...new Set(originalRows.map((row) => String(row.category))),
  ].map((category) => [category, originalRows.filter((row) => row.category === category).length]));
  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_21_SLAB_FOUNDATION_500M2_BACKEND",
    capturedAt: new Date().toISOString(),
    runId,
    definitionReleaseId: releaseId,
    searchReleaseId,
    runtimeIdentity: runtime.compatibilityTuple,
    search: { prompt, index: searchIndex },
    revisions: {
      originalRevisionId: original.revisionId,
      doubledRevisionId: doubled.revisionId,
      explicitPerimeterRevisionId: explicitPerimeter.revisionId,
      explicitPerimeterParentRevisionId: explicitPerimeter.parentRevisionId,
    },
    composition: {
      rowCount: originalRows.length,
      categoryCounts,
      preliminaryNeedCount: original.preliminaryNeeds?.length ?? 0,
      procurementRowCount: procurementRows.length,
      zeroQuantityControlRows: originalRows.filter((row) => Number(row.quantity) === 0)
        .map((row) => row.rowId),
    },
    quantities: {
      areaM2: 500,
      derivedPerimeterM: 90,
      markingCordM: originalById.get("slab-full:01:material:marking-cord")?.quantity,
      readyMixM3: originalById.get("slab-full:09:material:ready-mix")?.quantity,
      reinforcementD12Kg: originalById.get("slab-full:08:material:rebar-d12")?.quantity,
      reinforcementD16Kg: originalById.get("slab-full:08:material:rebar-d16")?.quantity,
      explicitPerimeterM: 120,
      explicitMarkingCordM:
        explicitById.get("slab-full:01:material:marking-cord")?.quantity,
      doubledAreaDerivedMarkingCordM:
        byId(doubledRows).get("slab-full:01:material:marking-cord")?.quantity,
    },
    procurement: { artifactSha256: procurement.metadata.sha256, rowCount: procurementRows.length },
    pdf: {
      artifactSha256: pdf.metadata.sha256,
      byteSize: pdf.bytes.length,
      exactRevision: true,
      unknownPriceMessageVerified: true,
      misleadingZeroEstimateAbsent: true,
      technicalAppendixAbsent: true,
    },
    historyContainsExplicitPerimeterRevision: true,
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const receipt = { ...unsigned, sha256: sha256(JSON.stringify(unsigned)) };
  atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), receipt);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

async function run(): Promise<void> {
  try {
    await main();
  } finally {
    await closeRetainedAuthContext();
  }
}

void run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
