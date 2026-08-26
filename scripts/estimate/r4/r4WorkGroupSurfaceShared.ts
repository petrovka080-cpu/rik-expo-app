import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const { PNG } = require("pngjs") as {
  PNG: { sync: { read(value: Buffer): { width: number; height: number; data: Buffer } } };
};

export type Json = Record<string, any>;

export type BackendCase = Json & {
  batch_id: string;
  work_group_id: string;
  case_id: string;
  case_ordinal: number;
  work_identity: string;
  scenario_class: string;
  input_sha: string;
  boq_sha: string | null;
  release_id: string;
  revision_id: string | null;
  row_count: number;
  compile_job_status: string;
  defects: string[];
};

export type BatchBinding = Json & {
  batch_id: string;
  release_id: string;
  release_key: string;
  work_groups: number;
  cases: number;
  ledger: { path: string; bytes: number; sha256: string };
  summary: { path: string; bytes: number; sha256: string };
};

const DEFAULT_MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const AGGREGATE = resolve(argument("aggregate",
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/11_WORK_GROUP_BACKEND_AGGREGATE_R4.json"));
const TOKEN = "local-dev-runtime-token";
const RETRY_DELAYS_MS = [100, 250, 500, 1_000] as const;

export function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

export function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value as Json).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Json)[key])}`).join(",")}}`;
}

export function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

export function fileProof(path: string): Json {
  const bytes = readFileSync(path);
  return { path: resolve(path).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

export function jsonl(path: string): Json[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

export function appendJsonl(path: string, value: Json): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${stableJson(value)}\n`, "utf8");
}

export function loadBatch(batchId: string): {
  aggregate: Json;
  aggregateProof: Json;
  binding: BatchBinding;
  backendCases: BackendCase[];
} {
  const aggregate = JSON.parse(readFileSync(AGGREGATE, "utf8")) as Json;
  const expectedStatus = argument("aggregate-status", "GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING");
  const expectedMasterSha256 = argument("master-sha", DEFAULT_MASTER_SHA256);
  invariant(aggregate.status === expectedStatus, "R4_SURFACE_BACKEND_AGGREGATE_RED");
  invariant(aggregate.master_sha256 === expectedMasterSha256,
    "R4_SURFACE_MASTER_SHA_RED");
  const binding = (aggregate.batches as BatchBinding[]).find((item) => item.batch_id === batchId);
  invariant(binding, `R4_SURFACE_BATCH_NOT_FOUND:${batchId}`);
  const ledgerPath = resolve(binding.ledger.path);
  invariant(existsSync(ledgerPath), `R4_SURFACE_BACKEND_LEDGER_MISSING:${batchId}`);
  invariant(statSync(ledgerPath).size === binding.ledger.bytes && sha256(readFileSync(ledgerPath)) === binding.ledger.sha256,
    `R4_SURFACE_BACKEND_LEDGER_DRIFT:${batchId}`);
  const backendCases = jsonl(ledgerPath) as BackendCase[];
  invariant(backendCases.length === binding.cases, `R4_SURFACE_BACKEND_DENOMINATOR_RED:${batchId}`);
  invariant(backendCases.every((item) => item.batch_id === batchId && item.release_id === binding.release_id),
    `R4_SURFACE_BACKEND_RELEASE_BINDING_RED:${batchId}`);
  return { aggregate, aggregateProof: fileProof(AGGREGATE), binding, backendCases };
}

async function retriedFetch(url: string, init: RequestInit, label: string): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`HTTP_${response.status}`);
      await response.arrayBuffer().catch(() => null);
    } catch (error) {
      lastError = error;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw new Error(`R4_SURFACE_TRANSIENT_RETRY_EXHAUSTED:${label}:${String(lastError)}`);
}

export async function api(apiRoot: string, path: string, init: RequestInit = {}): Promise<Json> {
  const response = await retriedFetch(`${apiRoot.replace(/\/+$/u, "")}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  }, path);
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`R4_SURFACE_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body ?? {};
}

export async function allRevisionRows(apiRoot: string, revisionId: string, maximumRows = 2_000): Promise<Json[]> {
  const rows: Json[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await api(apiRoot,
      `revisions/${encodeURIComponent(revisionId)}/rows?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    const pageRows = Array.isArray(page.rows) ? page.rows as Json[] : [];
    invariant(pageRows.length > 0 || !page.nextCursor, `R4_SURFACE_ROWS_EMPTY_PAGE:${revisionId}`);
    rows.push(...pageRows);
    invariant(rows.length <= maximumRows, `R4_SURFACE_ROWS_LIMIT_EXCEEDED:${revisionId}:${rows.length}`);
    const nextCursor = typeof page.nextCursor === "string" && page.nextCursor.length > 0
      ? page.nextCursor
      : null;
    if (nextCursor) {
      invariant(!seenCursors.has(nextCursor), `R4_SURFACE_ROWS_CURSOR_LOOP:${revisionId}`);
      seenCursors.add(nextCursor);
    }
    cursor = nextCursor;
  } while (cursor);
  return rows;
}

export async function waitJob(apiRoot: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(apiRoot, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (["failed", "cancelled"].includes(String(job.status))) {
      throw new Error(`R4_SURFACE_JOB_${job.status}:${jobId}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`R4_SURFACE_JOB_TIMEOUT:${jobId}`);
}

export async function ensureArtifact(
  apiRoot: string,
  revisionId: string,
  releaseId: string,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const readPath = `revisions/${revisionId}/artifacts/${kind}${kind === "pdf" ? "?documentProfile=professional_v1" : ""}`;
  const verifyReady = async (artifact: Json): Promise<Json> => {
    invariant(artifact.status === "ready" && artifact.revisionId === revisionId && artifact.releaseId === releaseId
      && /^[0-9a-f]{64}$/u.test(String(artifact.sha256)) && typeof artifact.signedUrl === "string",
    `R4_SURFACE_ARTIFACT_READY_IDENTITY_RED:${revisionId}:${kind}`);
    const response = await retriedFetch(String(artifact.signedUrl), {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }, `artifact-download:${revisionId}:${kind}`);
    invariant(response.ok, `R4_SURFACE_ARTIFACT_DOWNLOAD_RED:${revisionId}:${kind}:${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    invariant(bytes.length === Number(artifact.byteSize) && sha256(bytes) === artifact.sha256,
      `R4_SURFACE_ARTIFACT_BYTES_RED:${revisionId}:${kind}`);
    return { ...artifact, downloadedBytes: bytes.length, downloadedSha256: sha256(bytes) };
  };
  let current: Json | null = null;
  try {
    current = await api(apiRoot, readPath);
  } catch (error) {
    if (!String(error).includes("R4_SURFACE_API_404:")) throw error;
  }
  if (current?.status === "ready") return verifyReady(current);
  const accepted = await api(apiRoot, `revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r4-surface-${kind}-${sha256(`${revisionId}:${releaseId}`).slice(0, 48)}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (accepted.jobId) await waitJob(apiRoot, String(accepted.jobId));
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const artifact = await api(apiRoot, readPath);
    if (artifact.status === "ready") return verifyReady(artifact);
    if (artifact.status === "failed") throw new Error(`R4_SURFACE_ARTIFACT_FAILED:${revisionId}:${kind}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`R4_SURFACE_ARTIFACT_TIMEOUT:${revisionId}:${kind}`);
}

export function inspectPng(path: string): Json {
  const bytes = readFileSync(path);
  invariant(bytes.length > 1_000, `R4_SURFACE_SCREENSHOT_TOO_SMALL:${path}`);
  const png = PNG.sync.read(bytes);
  invariant(png.width >= 720 && png.height >= 720, `R4_SURFACE_SCREENSHOT_GEOMETRY_RED:${path}`);
  let sampled = 0;
  let nonWhite = 0;
  let distinctMask = 0;
  const stride = Math.max(1, Math.floor((png.width * png.height) / 50_000));
  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const offset = pixel * 4;
    const red = png.data[offset] ?? 255;
    const green = png.data[offset + 1] ?? 255;
    const blue = png.data[offset + 2] ?? 255;
    sampled += 1;
    if (red < 248 || green < 248 || blue < 248) nonWhite += 1;
    distinctMask |= 1 << (((red >> 6) ^ (green >> 6) ^ (blue >> 6)) & 15);
  }
  const nonWhiteRatio = nonWhite / Math.max(1, sampled);
  const colorBuckets = distinctMask.toString(2).replace(/0/gu, "").length;
  invariant(nonWhiteRatio > 0.01 && colorBuckets >= 2, `R4_SURFACE_SCREENSHOT_BLANK:${path}`);
  return {
    path: resolve(path).replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
    width: png.width,
    height: png.height,
    sampledPixels: sampled,
    nonWhiteRatio: Number(nonWhiteRatio.toFixed(6)),
    colorBuckets,
    pixelIntegrity: "GREEN",
  };
}

export function proofSession(): Json {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  const email = "r4-work-group-surface@example.invalid";
  const base64Url = (value: unknown): string => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return {
    access_token: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
      aud: "authenticated", exp: expiresAt, iat: issuedAt,
      sub: "11111111-1111-4111-8111-111111111111", role: "authenticated", email,
    })}.proof`,
    token_type: "bearer", expires_in: 86_400, expires_at: expiresAt,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email,
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(), phone: "",
      app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(), updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
  };
}

export async function mapConcurrent<T, U>(
  rows: readonly T[],
  concurrency: number,
  operation: (row: T, index: number) => Promise<U>,
): Promise<U[]> {
  const output = new Array<U>(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      output[index] = await operation(rows[index]!, index);
    }
  }));
  return output;
}

export function completedCaseIds(
  ledgerPath: string,
  identity?: { sourceSha: string; buildSha: string },
): Set<string> {
  const latest = new Map<string, Json>();
  for (const row of jsonl(ledgerPath)) {
    if (identity && (row.source_sha !== identity.sourceSha || row.build_sha !== identity.buildSha)) continue;
    latest.set(String(row.case_id), row);
  }
  return new Set([...latest.entries()]
    .filter(([, row]) => row.verdict === "GREEN")
    .map(([caseId]) => caseId));
}
