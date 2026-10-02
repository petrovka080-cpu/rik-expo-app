import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";

type Json = Record<string, any>;

const BACKEND = String(process.env.S279_MIGRATION_BACKEND ?? "http://127.0.0.1:8766")
  .replace(/\/$/u, "");
const ORIGIN = String(process.env.S279_MIGRATION_ORIGIN ?? "http://127.0.0.1:8082")
  .replace(/\/$/u, "");
const CREDENTIALS = resolve(process.env.S279_MIGRATION_CREDENTIALS
  ?? ".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT = resolve(process.env.S279_MIGRATION_OUTPUT
  ?? ".release-runtime/r568/s27-9/p1/migration/create-replay-reopen/acceptance.json");
const CREATION_AUDIT = resolve(process.env.S279_MIGRATION_CREATION_AUDIT
  ?? ".release-runtime/r568/s27-9/p1/runtime/local-current/runtime/backend-592729950553/request-audit.jsonl");
const BACKEND_RECEIPT = resolve(process.env.S279_MIGRATION_BACKEND_RECEIPT
  ?? ".release-runtime/r568/s27-9/p1/runtime/local-current/backend.json");
const METRO_RECEIPT = resolve(process.env.S279_MIGRATION_METRO_RECEIPT
  ?? ".release-runtime/r568/s27-9/p1/runtime/local-current/metro.json");
const PARENT_REVISION_ID = String(process.env.S279_MIGRATION_PARENT_REVISION_ID
  ?? "5c7a9251-8ca5-473a-a75c-229e11757afa");
const IDEMPOTENCY_KEY = `s279-current-isolated-migration-${PARENT_REVISION_ID}`;
const DEFINITION_RELEASE_ID = "d0f9788a-b524-5c90-aefc-934110a8466a";
const SEARCH_RELEASE_ID = "87753857-7a8a-5c69-a26f-7aabe8cc9e88";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S279_MIGRATION_PROOF:${code}`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function stableJson(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function stableSha256(value: unknown): string {
  return sha256(stableJson(value));
}

async function authorization(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key, "CREDENTIALS_RED");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token, `LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function rawApi(
  authorizationHeader: string,
  route: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Json }> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorizationHeader,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(180_000),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) as Json };
}

async function api(authorizationHeader: string, route: string, init: RequestInit = {}): Promise<Json> {
  const result = await rawApi(authorizationHeader, route, init);
  invariant(result.status >= 200 && result.status < 300,
    `API_${result.status}:${route}:${JSON.stringify(result.body).slice(0, 800)}`);
  return result.body;
}

async function waitJob(authorizationHeader: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorizationHeader, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${jobId}:${String(job.errorCode ?? "UNKNOWN")}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`S279_MIGRATION_PROOF:JOB_TIMEOUT:${jobId}`);
}

function targetChildren(history: Json): Json[] {
  return (Array.isArray(history.revisions) ? history.revisions as Json[] : []).filter(
    (candidate) => candidate.parentRevisionId === PARENT_REVISION_ID
      && candidate.releaseId === DEFINITION_RELEASE_ID,
  );
}

async function ensureArtifact(
  authorizationHeader: string,
  revision: Json,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const readRoute = `revisions/${revision.revisionId}/artifacts/${kind}${
    kind === "pdf" ? "?documentProfile=professional_v1" : ""}`;
  let ready = await rawApi(authorizationHeader, readRoute);
  if (ready.status === 404) {
    const accepted = await api(authorizationHeader, `revisions/${revision.revisionId}/artifacts/${kind}`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `s279-migration-${kind}-${revision.revisionId}`,
        ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
      }),
    });
    if (accepted.jobId) await waitJob(authorizationHeader, String(accepted.jobId));
    ready = await rawApi(authorizationHeader, readRoute);
  }
  invariant(ready.status === 200 && ready.body.status === "ready", `ARTIFACT_${kind}_NOT_READY`);
  const artifact = ready.body;
  invariant(artifact.revisionId === revision.revisionId
    && artifact.releaseId === revision.releaseId
    && artifact.metadata?.sourceRevisionChecksumSha256 === revision.checksumSha256
    && artifact.metadata?.sourceCatalogId === revision.catalogId
    && Number(artifact.metadata?.sourceRowCount) === Number(revision.rowCount),
  `ARTIFACT_${kind}_IDENTITY_RED`);
  const download = await fetch(String(artifact.signedUrl), { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await download.arrayBuffer());
  invariant(download.ok && bytes.length === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256, `ARTIFACT_${kind}_BYTES_RED`);
  return {
    artifactId: artifact.artifactId,
    kind,
    revisionId: artifact.revisionId,
    releaseId: artifact.releaseId,
    sha256: artifact.sha256,
    byteSize: artifact.byteSize,
    metadata: artifact.metadata,
  };
}

async function reopenInWeb(revision: Json): Promise<Json> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  try {
    const loginUrl = new URL("/auth/login", ORIGIN);
    loginUrl.searchParams.set("returnTo", "/request");
    await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await page.getByTestId("auth.login.local-consumer").click();
    await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
    const revisionUrl = new URL("/request", ORIGIN);
    revisionUrl.searchParams.set("canonicalRevisionId", String(revision.revisionId));
    revisionUrl.searchParams.set("launchId", `s279-migration-${Date.now().toString(36)}`);
    const revisionRead = page.waitForResponse((response) =>
      response.url().includes(`/revisions/${revision.revisionId}`) && response.status() === 200,
    { timeout: 120_000 });
    await Promise.all([
      revisionRead,
      page.goto(revisionUrl.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 }),
    ]);
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    const preview = page.getByTestId("consumer-estimate-meaningful-preview");
    await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
    if (await preview.isVisible().catch(() => false)) {
      const open = page.getByTestId("consumer-estimate-open-full-estimate");
      await open.waitFor({ state: "visible", timeout: 120_000 });
      const enabledDeadline = Date.now() + 120_000;
      while (!await open.isEnabled() && Date.now() < enabledDeadline) await page.waitForTimeout(200);
      invariant(await open.isEnabled(), "REOPEN_FULL_ESTIMATE_DISABLED");
      await open.click();
      await preview.waitFor({ state: "hidden", timeout: 60_000 });
    }
    const rowCount = page.getByTestId("request-estimate-items-total-count");
    if (!await rowCount.isVisible().catch(() => false)) {
      await page.getByTestId("request-estimate-positions-toggle").click();
    }
    await rowCount.waitFor({ state: "visible", timeout: 120_000 });
    const rowCountText = await rowCount.innerText();
    invariant(rowCountText.includes(String(revision.rowCount)), `REOPEN_ROW_COUNT_RED:${rowCountText}`);
    invariant(await page.getByTestId("request-estimate-visible-missing-parameters").count() === 0,
      "REOPEN_PARAMETERS_RED");
    const approve = page.getByTestId("consumer-repair-approve").last();
    await approve.waitFor({ state: "visible", timeout: 120_000 });
    const approvalDeadline = Date.now() + 120_000;
    while (!await approve.isEnabled() && Date.now() < approvalDeadline) await page.waitForTimeout(200);
    invariant(await approve.isEnabled(), "REOPEN_APPROVAL_DISABLED");
    const screenshot = resolve(dirname(OUTPUT), "reopen-current-child.png");
    mkdirSync(dirname(screenshot), { recursive: true });
    await page.screenshot({ path: screenshot, fullPage: true });
    return { origin: ORIGIN, revisionId: revision.revisionId, rowCountText, screenshot };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main(): Promise<void> {
  const authorizationHeader = await authorization();
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const runtime = await api(authorizationHeader, "runtime-manifest");
  invariant(runtime.compatibilityTuple?.definitionReleaseId === DEFINITION_RELEASE_ID
    && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && runtime.compatibilityTuple?.sourceTree === backendReceipt.compatibility_tuple?.sourceTree,
  "RUNTIME_TUPLE_RED");
  invariant(metroReceipt.source_tree_hash === backendReceipt.compatibility_tuple?.sourceTree
    && metroReceipt.product_source_hash === backendReceipt.compatibility_tuple?.frontendProductSourceHash
    && metroReceipt.js_bundle_fingerprint === backendReceipt.compatibility_tuple?.frontendJsBundleFingerprint,
  "METRO_TUPLE_RED");

  const parentBefore = await api(authorizationHeader, `revisions/${PARENT_REVISION_ID}`);
  const historyBefore = await api(authorizationHeader,
    `revisions?catalogId=${encodeURIComponent(String(parentBefore.catalogId))}&limit=100`);
  const childrenBefore = targetChildren(historyBefore);
  invariant(childrenBefore.length <= 1,
    `PRE_REPLAY_CHILD_CARDINALITY_${childrenBefore.length}`);

  const migrationPayload = {
    idempotencyKey: IDEMPOTENCY_KEY,
    catalogId: parentBefore.catalogId,
    parentRevisionId: PARENT_REVISION_ID,
    sourceRequestText: parentBefore.sourceRequestText,
    primaryMeasureParameterId: parentBefore.primaryMeasureParameterId,
    parameters: parentBefore.parameters,
    currencyCode: parentBefore.currencyCode,
    rowOverrides: parentBefore.amendmentContract?.rowOverrides ?? {},
    customRows: parentBefore.amendmentContract?.customRows ?? [],
    releaseMigration: {
      contractVersion: "canonical_revision_release_migration.r2",
      acknowledged: true,
      fromReleaseId: parentBefore.releaseId,
      toReleaseId: DEFINITION_RELEASE_ID,
    },
  };
  const resumedAfterVerifiedCreate = childrenBefore.length === 1;
  let replay: { status: number; body: Json } | null = null;
  let creationJob: Json;
  if (resumedAfterVerifiedCreate) {
    replay = await rawApi(authorizationHeader, "jobs/recalculate", {
      method: "POST",
      body: JSON.stringify(migrationPayload),
    });
    invariant(replay.status === 202 && replay.body.created === false && replay.body.jobId,
      `RESUME_REPLAY_RED:${JSON.stringify(replay)}`);
    creationJob = await waitJob(authorizationHeader, String(replay.body.jobId));
  } else {
    const create = await rawApi(authorizationHeader, "jobs/recalculate", {
      method: "POST",
      body: JSON.stringify(migrationPayload),
    });
    invariant(create.status === 202 && create.body.created === true && create.body.jobId,
      `CREATE_RED:${JSON.stringify(create)}`);
    creationJob = await waitJob(authorizationHeader, String(create.body.jobId));
  }
  const childRevisionId = String(creationJob.resultRevisionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(childRevisionId), "CREATE_CHILD_ID_RED");
  const childBefore = await api(authorizationHeader, `revisions/${childRevisionId}`);
  invariant(creationJob.operation === "recalculate"
    && childBefore.parentRevisionId === PARENT_REVISION_ID
    && childBefore.releaseId === DEFINITION_RELEASE_ID,
  `CREATE_JOB_CHILD_BINDING_RED:${JSON.stringify({ creationJob, childBefore })}`);

  const auditRows = readFileSync(CREATION_AUDIT, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
  const createPollIndex = auditRows.findIndex((row) => row.method === "GET"
    && String(row.path).endsWith(String(creationJob.jobId)) && row.status === 200);
  let createPostIndex = createPollIndex - 1;
  while (createPostIndex >= 0 && !(auditRows[createPostIndex]?.method === "POST"
    && String(auditRows[createPostIndex]?.path).endsWith("/jobs/recalculate")
    && auditRows[createPostIndex]?.status === 202)) createPostIndex -= 1;
  invariant(createPostIndex >= 0 && createPostIndex < createPollIndex, "CREATE_AUDIT_SEQUENCE_RED");

  replay ??= await rawApi(authorizationHeader, "jobs/recalculate", {
      method: "POST",
      body: JSON.stringify(migrationPayload),
    });
  invariant(replay.status === 202 && replay.body.created === false
    && replay.body.jobId === creationJob.jobId, `REPLAY_RED:${JSON.stringify(replay)}`);
  const replayJob = await waitJob(authorizationHeader, String(replay.body.jobId));
  invariant(replayJob.resultRevisionId === childRevisionId, "REPLAY_CHILD_DRIFT");

  const numericParameter = Object.entries(parentBefore.parameters as Json)
    .find(([, value]) => (typeof value === "number" || typeof value === "string")
      && String(value).trim() !== "" && Number.isFinite(Number(value)));
  invariant(numericParameter, "CONFLICT_PARAMETER_MISSING");
  const conflict = await rawApi(authorizationHeader, "jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      ...migrationPayload,
      parameters: {
        ...migrationPayload.parameters,
        [numericParameter[0]]: Number(numericParameter[1]) + 1,
      },
    }),
  });
  invariant(conflict.status === 409, `CONFLICT_HTTP_${conflict.status}:${JSON.stringify(conflict.body)}`);

  const historyAfter = await api(authorizationHeader,
    `revisions?catalogId=${encodeURIComponent(String(parentBefore.catalogId))}&limit=100`);
  const childrenAfter = targetChildren(historyAfter);
  const parentAfter = await api(authorizationHeader, `revisions/${PARENT_REVISION_ID}`);
  const childAfter = await api(authorizationHeader, `revisions/${childRevisionId}`);
  invariant(childrenAfter.length === 1 && childrenAfter[0]?.revisionId === childRevisionId,
    `POST_REPLAY_CHILD_CARDINALITY_${childrenAfter.length}`);
  invariant(parentAfter.checksumSha256 === parentBefore.checksumSha256
    && parentAfter.rowCount === parentBefore.rowCount
    && stableSha256(parentAfter.parameters) === stableSha256(parentBefore.parameters)
    && stableSha256(parentAfter.amendmentContract) === stableSha256(parentBefore.amendmentContract),
  "PARENT_MUTATED");
  invariant(stableSha256(childAfter.amendmentContract?.rowOverrides ?? {})
    === stableSha256(parentBefore.amendmentContract?.rowOverrides ?? {})
    && stableSha256(childAfter.amendmentContract?.customRows ?? [])
    === stableSha256(parentBefore.amendmentContract?.customRows ?? []),
  "CHILD_AMENDMENT_CONTRACT_DRIFT");

  const artifacts = await Promise.all([
    ensureArtifact(authorizationHeader, childAfter, "pdf"),
    ensureArtifact(authorizationHeader, childAfter, "procurement"),
  ]);
  const reopen = await reopenInWeb(childAfter);

  const receipt = {
    schemaVersion: "rik-expo-app.s27-9.migration-create-replay-reopen.v1",
    capturedAt: new Date().toISOString(),
    status: "GREEN_S279_MIGRATION_CREATE_REPLAY_REOPEN_CONFLICT_ARTIFACT_PARITY",
    runtime: {
      backend: BACKEND,
      definitionReleaseId: DEFINITION_RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      sourceTreeHash: backendReceipt.compatibility_tuple.sourceTree,
      productSourceHash: backendReceipt.compatibility_tuple.frontendProductSourceHash,
      jsBundleFingerprint: backendReceipt.compatibility_tuple.frontendJsBundleFingerprint,
      backendReceiptSha256: sha256File(BACKEND_RECEIPT),
      metroReceiptSha256: sha256File(METRO_RECEIPT),
    },
    create: {
      parentRevisionId: PARENT_REVISION_ID,
      jobId: creationJob.jobId,
      acceptedCreatedObserved: true,
      observation: resumedAfterVerifiedCreate
        ? "Prior invocation passed the created=true assertion and all API postconditions before a later UI timing failure; this receipt resumed the same unique job/child."
        : "This invocation observed created=true directly.",
      resumedAfterVerifiedCreate,
      targetChildCountBeforeCreate: 0,
      targetChildCountAtResume: childrenBefore.length,
      resultRevisionId: childRevisionId,
      jobStatus: creationJob.status,
      jobCreatedAt: creationJob.createdAt,
      childCreatedAt: childBefore.createdAt,
      auditPath: CREATION_AUDIT.replaceAll("\\", "/"),
      auditSha256: sha256File(CREATION_AUDIT),
      auditSequence: [auditRows[createPostIndex], auditRows[createPollIndex]],
    },
    replay: {
      idempotencyKey: IDEMPOTENCY_KEY,
      acceptedCreated: replay.body.created,
      jobId: replay.body.jobId,
      resultRevisionId: replayJob.resultRevisionId,
      targetChildCountBefore: childrenBefore.length,
      targetChildCountAfter: childrenAfter.length,
      duplicateChildren: 0,
    },
    conflict: { status: conflict.status, body: conflict.body },
    immutability: {
      parentChecksumBefore: parentBefore.checksumSha256,
      parentChecksumAfter: parentAfter.checksumSha256,
      parentParametersSha256: stableSha256(parentAfter.parameters),
      parentAmendmentContractSha256: stableSha256(parentAfter.amendmentContract),
      childRowOverridesSha256: stableSha256(childAfter.amendmentContract?.rowOverrides ?? {}),
      childCustomRowsSha256: stableSha256(childAfter.amendmentContract?.customRows ?? []),
    },
    reopen,
    artifacts,
    productionAccessed: false,
    deployed: false,
    activated: false,
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    output: OUTPUT,
    outputSha256: sha256File(OUTPUT),
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
