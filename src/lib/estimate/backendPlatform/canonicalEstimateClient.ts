import { fetchWithRequestTimeout } from "../../requestTimeoutPolicy";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../../supabaseClient";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateArtifactView,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateCreateRequest,
  type CanonicalEstimateJobAccepted,
  type CanonicalEstimateJobView,
  type CanonicalEstimateLegacyRevisionRequest,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionRowsPage,
  type CanonicalEstimateRevisionHistoryPage,
  type CanonicalEstimateRevisionView,
} from "./contracts";

function resolveFunctionUrl(): string {
  const configured = String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL ?? "").trim();
  const url = configured || `${SUPABASE_URL}/functions/v1/canonical-estimate`;
  const parsed = (() => { try { return new URL(url); } catch { return null; } })();
  const proofLoopbackHosts = new Set([["127", "0", "0", "1"].join("."), ["local", "host"].join(""), "10.0.2.2"]);
  const explicitlyAllowedProofLoopback = process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK === "true"
    && parsed?.protocol === "http:" && proofLoopbackHosts.has(parsed.hostname);
  if (!/^https:\/\//i.test(url) && !explicitlyAllowedProofLoopback) {
    throw new Error("CANONICAL_ESTIMATE_FUNCTION_URL_REQUIRES_HTTPS");
  }
  return url.replace(/\/+$/, "");
}

const TERMINAL_JOB_STATES = new Set(["succeeded", "failed", "cancelled"]);

type ApiErrorEnvelope = {
  error?: { code?: unknown; message?: unknown; retryable?: unknown };
  requestId?: unknown;
};

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  return data.session.access_token;
}

async function invoke<T>(path: string, options: {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal | null;
  requestClass?: "lightweight_lookup" | "ui_scope_load" | "mutation_request";
} = {}): Promise<T> {
  const token = await accessToken();
  const method = options.method ?? "GET";
  const response = await fetchWithRequestTimeout(
    `${resolveFunctionUrl()}/${path.replace(/^\/+/, "")}`,
    {
      method,
      headers: {
        Accept: "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        ...(options.body == null ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? undefined,
    },
    {
      requestClass: options.requestClass ?? (method === "POST" ? "mutation_request" : "ui_scope_load"),
      owner: "canonical_estimate_client",
      operation: path.split("?")[0],
      screen: "request",
      surface: "canonical_estimate_backend",
      sourceKind: "canonical_estimate_edge_function",
    },
  );
  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* normalized below */ }
  if (!response.ok) {
    const envelope = (payload ?? {}) as ApiErrorEnvelope;
    throw new CanonicalEstimateApiError(
      String(envelope.error?.message ?? "Backend сметы временно недоступен."),
      {
        code: String(envelope.error?.code ?? "BACKEND_OPERATION_FAILED"),
        httpStatus: response.status,
        retryable: envelope.error?.retryable === true,
      },
    );
  }
  return payload as T;
}

export function searchCanonicalEstimateCatalog(input: {
  query: string;
  domain?: string | null;
  limit?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({ query: input.query, limit: String(input.limit ?? 30) });
  if (input.domain) params.set("domain", input.domain);
  return invoke<{ items: Array<Omit<CanonicalEstimateCatalogItem, "definitionVersion" | "parameterSchema">> }>(
    `catalog?${params.toString()}`,
    { signal: input.signal, requestClass: "lightweight_lookup" },
  );
}

export async function getCanonicalEstimateCatalogItem(catalogId: string, signal?: AbortSignal | null) {
  const result = await invoke<{ item: CanonicalEstimateCatalogItem }>(
    `catalog/${encodeURIComponent(catalogId)}`,
    { signal, requestClass: "ui_scope_load" },
  );
  return result.item;
}

export function createCanonicalEstimate(request: CanonicalEstimateCreateRequest, signal?: AbortSignal | null) {
  return invoke<CanonicalEstimateJobAccepted>("jobs/compile", {
    method: "POST",
    body: request,
    signal,
    requestClass: "mutation_request",
  });
}

export function recalculateCanonicalEstimate(request: CanonicalEstimateRecalculateRequest, signal?: AbortSignal | null) {
  return invoke<CanonicalEstimateJobAccepted>("jobs/recalculate", {
    method: "POST",
    body: request,
    signal,
    requestClass: "mutation_request",
  });
}

export function getCanonicalEstimateJob(jobId: string, signal?: AbortSignal | null) {
  return invoke<CanonicalEstimateJobView>(`jobs/${encodeURIComponent(jobId)}`, {
    signal,
    requestClass: "lightweight_lookup",
  });
}

export function cancelCanonicalEstimateJob(jobId: string, signal?: AbortSignal | null) {
  return invoke<{ jobId: string; status: "cancelled" }>(`jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
    signal,
    requestClass: "mutation_request",
  });
}

export async function waitForCanonicalEstimateJob(input: {
  jobId: string;
  signal?: AbortSignal | null;
  timeoutMs?: number;
  pollIntervalMs?: number;
  requireRevisionResult?: boolean;
  onProgress?: (job: CanonicalEstimateJobView) => void;
}): Promise<CanonicalEstimateJobView> {
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 60_000;
  const pollIntervalMs = Math.max(250, input.pollIntervalMs ?? 750);
  while (true) {
    if (input.signal?.aborted) throw input.signal.reason ?? new Error("estimate job wait aborted");
    const job = await getCanonicalEstimateJob(input.jobId, input.signal);
    input.onProgress?.(job);
    if (TERMINAL_JOB_STATES.has(job.status)) {
      if (job.status !== "succeeded" || (input.requireRevisionResult !== false && !job.resultRevisionId)) {
        throw new CanonicalEstimateApiError(`Расчёт не завершён: ${job.errorCode ?? job.status}`, {
          code: job.errorCode ?? `JOB_${job.status.toUpperCase()}`,
          httpStatus: job.status === "failed" ? 422 : 409,
          retryable: false,
        });
      }
      return job;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new CanonicalEstimateApiError("Расчёт продолжается на сервере. Его можно открыть из истории.", {
        code: "JOB_WAIT_TIMEOUT",
        httpStatus: 202,
        retryable: true,
      });
    }
    await new Promise<void>((accept, reject) => {
      const cleanup = () => input.signal?.removeEventListener("abort", abort);
      const timer = setTimeout(() => { cleanup(); accept(); }, pollIntervalMs);
      const abort = () => {
        clearTimeout(timer);
        cleanup();
        reject(input.signal?.reason ?? new Error("estimate job wait aborted"));
      };
      input.signal?.addEventListener("abort", abort, { once: true });
    });
  }
}

export function migrateCanonicalEstimateLegacyRevision(
  request: CanonicalEstimateLegacyRevisionRequest,
  signal?: AbortSignal | null,
) {
  return invoke<CanonicalEstimateJobAccepted & { sourceChecksumSha256: string }>("migrations/legacy-revisions", {
    method: "POST",
    body: request,
    signal,
    requestClass: "mutation_request",
  });
}

export function createCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  idempotencyKey: string;
  signal?: AbortSignal | null;
}) {
  return invoke<CanonicalEstimateJobAccepted & { artifactId: string; artifactStatus: string }>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}`,
    {
      method: "POST",
      body: { idempotencyKey: input.idempotencyKey },
      signal: input.signal,
      requestClass: "mutation_request",
    },
  );
}

export function getCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  signal?: AbortSignal | null;
}) {
  return invoke<CanonicalEstimateArtifactView>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}`,
    { signal: input.signal, requestClass: "ui_scope_load" },
  );
}

export async function buildCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  idempotencyKey: string;
  signal?: AbortSignal | null;
}) {
  const accepted = await createCanonicalEstimateArtifact(input);
  if (accepted.jobId) {
    await waitForCanonicalEstimateJob({
      jobId: accepted.jobId,
      signal: input.signal,
      timeoutMs: 120_000,
      pollIntervalMs: accepted.pollAfterMs,
      requireRevisionResult: false,
    });
  }
  return getCanonicalEstimateArtifact(input);
}

export function getCanonicalEstimateRevision(revisionId: string, signal?: AbortSignal | null) {
  return invoke<CanonicalEstimateRevisionView>(`revisions/${encodeURIComponent(revisionId)}`, {
    signal,
    requestClass: "ui_scope_load",
  });
}

export function getCanonicalEstimateRevisionHistory(input: {
  catalogId: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({
    catalogId: input.catalogId,
    limit: String(input.limit ?? 30),
  });
  if (input.cursor) params.set("cursor", input.cursor);
  return invoke<CanonicalEstimateRevisionHistoryPage>(`revisions?${params.toString()}`, {
    signal: input.signal,
    requestClass: "ui_scope_load",
  });
}

export function getCanonicalEstimateRevisionRows(input: {
  revisionId: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({ limit: String(input.limit ?? 100) });
  if (input.cursor) params.set("cursor", input.cursor);
  return invoke<CanonicalEstimateRevisionRowsPage>(
    `revisions/${encodeURIComponent(input.revisionId)}/rows?${params.toString()}`,
    { signal: input.signal, requestClass: "ui_scope_load" },
  );
}

export async function getAllCanonicalEstimateRevisionRows(input: {
  revisionId: string;
  signal?: AbortSignal | null;
  maximumRows?: number;
}) {
  const rows: CanonicalEstimateRevisionRowsPage["rows"] = [];
  let cursor: string | null = null;
  const maximumRows = input.maximumRows ?? 2_000;
  do {
    const page = await getCanonicalEstimateRevisionRows({
      revisionId: input.revisionId,
      cursor,
      limit: 200,
      signal: input.signal,
    });
    rows.push(...page.rows);
    if (rows.length > maximumRows) {
      throw new CanonicalEstimateApiError("Смета превышает безопасный UI-лимит; используйте постраничный просмотр.", {
        code: "CLIENT_VIEW_LIMIT_EXCEEDED",
        httpStatus: 413,
      });
    }
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}

export async function compileCanonicalEstimateAndLoad(input: {
  request: CanonicalEstimateCreateRequest;
  signal?: AbortSignal | null;
  onProgress?: (job: CanonicalEstimateJobView) => void;
}) {
  const accepted = await createCanonicalEstimate(input.request, input.signal);
  const job = await waitForCanonicalEstimateJob({ jobId: accepted.jobId, signal: input.signal, onProgress: input.onProgress });
  const revisionId = job.resultRevisionId!;
  const [revision, rows] = await Promise.all([
    getCanonicalEstimateRevision(revisionId, input.signal),
    getAllCanonicalEstimateRevisionRows({ revisionId, signal: input.signal }),
  ]);
  return { accepted, job, revision, rows };
}

export async function recalculateCanonicalEstimateAndLoad(input: {
  request: CanonicalEstimateRecalculateRequest;
  signal?: AbortSignal | null;
  onProgress?: (job: CanonicalEstimateJobView) => void;
}) {
  const accepted = await recalculateCanonicalEstimate(input.request, input.signal);
  const job = await waitForCanonicalEstimateJob({ jobId: accepted.jobId, signal: input.signal, onProgress: input.onProgress });
  const revisionId = job.resultRevisionId!;
  const [revision, rows] = await Promise.all([
    getCanonicalEstimateRevision(revisionId, input.signal),
    getAllCanonicalEstimateRevisionRows({ revisionId, signal: input.signal }),
  ]);
  return { accepted, job, revision, rows };
}
