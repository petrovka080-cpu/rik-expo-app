import { fetchWithRequestTimeout } from "../../requestTimeoutPolicy";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "../../supabaseClient";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateArtifactView,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateCreateRequest,
  type CanonicalEstimateDraftView,
  type CanonicalEstimateJobAccepted,
  type CanonicalEstimateJobView,
  type CanonicalEstimateLegacyRevisionRequest,
  type CanonicalEstimatePhotoAttachmentView,
  type CanonicalEstimatePhotoUploadIntent,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionRowsPage,
  type CanonicalEstimateRevisionHistoryPage,
  type CanonicalEstimateRevisionView,
  type CanonicalEstimateSearchGroupPage,
  type CanonicalEstimateSearchPage,
  type CanonicalEstimateTypedRelation,
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

const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 10;
let accessTokenRefreshInflight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (accessTokenRefreshInflight) return accessTokenRefreshInflight;
  accessTokenRefreshInflight = (async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", {
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    }
    return data.session.access_token;
  })();
  try {
    return await accessTokenRefreshInflight;
  } finally {
    accessTokenRefreshInflight = null;
  }
}

async function accessToken(forceRefresh = false): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  const expiresAt = Number(data.session.expires_at);
  if (
    forceRefresh ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1_000) + ACCESS_TOKEN_REFRESH_SKEW_SECONDS
  ) return refreshAccessToken();
  return data.session.access_token;
}

async function invoke<T>(path: string, options: {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal | null;
  requestClass?: "lightweight_lookup" | "ui_scope_load" | "mutation_request";
} = {}): Promise<T> {
  const method = options.method ?? "GET";
  const execute = (token: string) => fetchWithRequestTimeout(
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
  let response = await execute(await accessToken());
  if (response.status === 401) {
    response = await execute(await accessToken(true));
  }
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
  mode?: "ANY" | "ALL" | "PHRASE" | null;
  tokens?: string[];
  scope?: "WORKS" | "REFERENCES";
  domain?: string | null;
  groupId?: string | null;
  operationKind?: string | null;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({ query: input.query, pageSize: String(input.pageSize ?? 50) });
  if (input.mode) params.set("mode",input.mode);
  for (const token of input.tokens ?? []) params.append("token",token);
  if (input.scope) params.set("scope",input.scope);
  if (input.domain) params.set("domain", input.domain);
  if (input.groupId) params.set("groupId", input.groupId);
  if (input.operationKind) params.set("operationKind", input.operationKind);
  if (input.cursor) params.set("cursor", input.cursor);
  return invoke<CanonicalEstimateSearchPage>(
    `search/catalog?${params.toString()}`,
    { signal: input.signal, requestClass: "lightweight_lookup" },
  );
}

export function listCanonicalEstimateSearchGroup(input: {
  groupId: string;
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({ pageSize: String(input.pageSize ?? 50) });
  if (input.cursor) params.set("cursor", input.cursor);
  return invoke<CanonicalEstimateSearchGroupPage>(
    `search/groups/${encodeURIComponent(input.groupId)}?${params.toString()}`,
    { signal: input.signal, requestClass: "lightweight_lookup" },
  );
}

export function listCanonicalEstimateTypedRelations(catalogId: string, signal?: AbortSignal | null) {
  return invoke<{
    apiVersion: string;
    searchIndexReleaseId: string;
    groupRelationVersion: string;
    items: CanonicalEstimateTypedRelation[];
  }>(`search/catalog/${encodeURIComponent(catalogId)}/relations`, {
    signal,
    requestClass: "lightweight_lookup",
  });
}

export async function createCanonicalEstimateDraft(input: {
  originalQuery: string;
  title?: string;
  searchIndexReleaseId: string;
  searchResultSetHash: string;
  searchFilters?: Record<string, string>;
  selectedCatalogIds?: string[];
  deviceId?: string | null;
  signal?: AbortSignal | null;
}) {
  const result = await invoke<{ apiVersion: string; draft: CanonicalEstimateDraftView }>("drafts", {
    method: "POST",
    body: {
      originalQuery: input.originalQuery,
      title: input.title,
      searchIndexReleaseId: input.searchIndexReleaseId,
      searchResultSetHash: input.searchResultSetHash,
      searchFilters: input.searchFilters ?? {},
      selectedCatalogIds: input.selectedCatalogIds ?? [],
      deviceId: input.deviceId ?? null,
    },
    signal: input.signal,
    requestClass: "mutation_request",
  });
  return result.draft;
}

export async function getCanonicalEstimateDraft(draftId: string, signal?: AbortSignal | null) {
  const result = await invoke<{ apiVersion: string; draft: CanonicalEstimateDraftView }>(
    `drafts/${encodeURIComponent(draftId)}`,
    { signal, requestClass: "ui_scope_load" },
  );
  return result.draft;
}

export async function applyCanonicalEstimateDraftEvent(input: {
  draftId: string;
  idempotencyKey: string;
  baseOptimisticVersion: number;
  eventKind: string;
  patch: Record<string, unknown>;
  deviceId?: string | null;
  signal?: AbortSignal | null;
}) {
  const result = await invoke<{ apiVersion: string; draft: CanonicalEstimateDraftView }>(
    `drafts/${encodeURIComponent(input.draftId)}/events`,
    {
      method: "POST",
      body: {
        idempotencyKey: input.idempotencyKey,
        baseOptimisticVersion: input.baseOptimisticVersion,
        eventKind: input.eventKind,
        patch: input.patch,
        deviceId: input.deviceId ?? null,
      },
      signal: input.signal,
      requestClass: "mutation_request",
    },
  );
  return result.draft;
}

export async function getCanonicalEstimateCatalogItem(
  catalogId: string,
  signal?: AbortSignal | null,
  releaseId?: string | null,
) {
  const releaseQuery = releaseId?.trim()
    ? `?releaseId=${encodeURIComponent(releaseId.trim())}`
    : "";
  const result = await invoke<{ item: CanonicalEstimateCatalogItem }>(
    `catalog/${encodeURIComponent(catalogId)}${releaseQuery}`,
    { signal, requestClass: "ui_scope_load" },
  );
  if (result.item.contentAdmission?.allowed !== true
    || result.item.contentAdmission.contractVersion !== "estimate-admission-r3") {
    throw new CanonicalEstimateApiError(
      "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
      { code: "ESTIMATE_ADMISSION_DENIED", httpStatus: 409 },
    );
  }
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
  documentProfile?: "professional_v1";
  idempotencyKey: string;
  signal?: AbortSignal | null;
}) {
  return invoke<CanonicalEstimateJobAccepted & { artifactId: string; artifactStatus: string }>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}`,
    {
      method: "POST",
      body: {
        idempotencyKey: input.idempotencyKey,
        ...(input.documentProfile ? { documentProfile: input.documentProfile } : {}),
      },
      signal: input.signal,
      requestClass: "mutation_request",
    },
  );
}

export function getCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  documentProfile?: "professional_v1";
  signal?: AbortSignal | null;
}) {
  const profileQuery = input.documentProfile
    ? `?documentProfile=${encodeURIComponent(input.documentProfile)}`
    : "";
  return invoke<CanonicalEstimateArtifactView>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}${profileQuery}`,
    { signal: input.signal, requestClass: "ui_scope_load" },
  );
}

export async function buildCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  documentProfile?: "professional_v1";
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

export function assertCanonicalEstimateArtifactIdentity(input: {
  artifact: CanonicalEstimateArtifactView;
  revision: CanonicalEstimateRevisionView;
  expectedKind: "pdf" | "procurement";
  expectedDocumentProfile?: "professional_v1";
  expectedCatalogId?: string | null;
  expectedRowCount?: number | null;
}): void {
  const metadataCatalogId = String(input.artifact.metadata?.sourceCatalogId ?? "").trim();
  const metadataRowCount = Number(input.artifact.metadata?.sourceRowCount);
  const metadataChecksum = String(
    input.artifact.metadata?.sourceRevisionChecksumSha256 ?? "",
  ).trim();
  const metadataTemplateVersion = String(input.artifact.metadata?.templateVersion ?? "").trim();
  const metadataDocumentProfile = String(input.artifact.metadata?.documentProfile ?? "").trim();
  const metadataOwnerUserId = String(input.artifact.metadata?.sourceOwnerUserId ?? "").trim();
  const expectedCatalogId = input.expectedCatalogId?.trim() || input.revision.catalogId;
  const expectedRowCount = input.expectedRowCount ?? input.revision.rowCount;
  const matches =
    input.artifact.status === "ready" &&
    input.artifact.kind === input.expectedKind &&
    input.artifact.revisionId === input.revision.revisionId &&
    input.artifact.releaseId === input.revision.releaseId &&
    metadataCatalogId === expectedCatalogId &&
    metadataRowCount === expectedRowCount &&
    metadataChecksum === input.revision.checksumSha256 &&
    (!input.expectedDocumentProfile || metadataDocumentProfile === input.expectedDocumentProfile) &&
    (input.expectedDocumentProfile !== "professional_v1" || (
      metadataTemplateVersion.startsWith("professional-estimate-pdf:") &&
      metadataOwnerUserId.length > 0
    ));
  if (matches) return;
  throw new CanonicalEstimateApiError(
    "PDF не открыт: документ не принадлежит выбранной версии сметы.",
    { code: "ARTIFACT_REVISION_IDENTITY_MISMATCH", httpStatus: 409 },
  );
}

export function getCanonicalEstimateRevision(revisionId: string, signal?: AbortSignal | null) {
  return invoke<CanonicalEstimateRevisionView>(`revisions/${encodeURIComponent(revisionId)}`, {
    signal,
    requestClass: "ui_scope_load",
  });
}

export function getCanonicalEstimateParameterSessionSnapshot(
  revisionId: string,
  signal?: AbortSignal | null,
) {
  return invoke<{
    apiVersion: string;
    revision: CanonicalEstimateRevisionView;
    parent: CanonicalEstimateRevisionView | null;
    catalog: CanonicalEstimateCatalogItem;
  }>(`revisions/${encodeURIComponent(revisionId)}/parameter-session`, {
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

export function createCanonicalEstimatePhotoUpload(input: {
  revisionId: string;
  idempotencyKey: string;
  requestId: string;
  catalogId: string;
  rowId: string;
  contentSha256: string;
  mimeType: "image/jpeg" | "image/png";
  sizeBytes: number;
  replacesAttachmentId?: string | null;
  signal?: AbortSignal | null;
}) {
  return invoke<CanonicalEstimatePhotoUploadIntent>(
    `revisions/${encodeURIComponent(input.revisionId)}/attachments/photo/uploads`,
    {
      method: "POST",
      body: {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        catalogId: input.catalogId,
        rowId: input.rowId,
        contentSha256: input.contentSha256,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        replacesAttachmentId: input.replacesAttachmentId ?? null,
      },
      signal: input.signal,
      requestClass: "mutation_request",
    },
  );
}

export async function uploadCanonicalEstimatePhotoObject(input: {
  uploadUrl: string;
  uploadToken?: string | null;
  body: ArrayBuffer;
  mimeType: "image/jpeg" | "image/png";
  signal?: AbortSignal | null;
}): Promise<void> {
  const uploadUrl = new URL(input.uploadUrl, SUPABASE_URL);
  if (input.uploadToken && !uploadUrl.searchParams.has("token")) {
    uploadUrl.searchParams.set("token", input.uploadToken);
  }
  const response = await fetchWithRequestTimeout(
    uploadUrl.toString(),
    {
      method: "PUT",
      headers: {
        "Content-Type": input.mimeType,
        "x-upsert": "false",
      },
      body: input.body,
      signal: input.signal ?? undefined,
    },
    {
      requestClass: "mutation_request",
      owner: "canonical_estimate_client",
      operation: "photo_signed_upload",
      screen: "request",
      surface: "canonical_estimate_backend",
      sourceKind: "canonical_estimate_photo_upload",
    },
  );
  if (!response.ok) {
    throw new CanonicalEstimateApiError("Не удалось загрузить снимок.", {
      code: "PHOTO_UPLOAD_FAILED",
      httpStatus: response.status,
      retryable: response.status >= 500 || response.status === 408 || response.status === 429,
    });
  }
}

export async function finalizeCanonicalEstimatePhotoUpload(input: {
  revisionId: string;
  uploadId: string;
  signal?: AbortSignal | null;
}) {
  return invoke<{
    apiVersion: string;
    attachment: CanonicalEstimatePhotoAttachmentView;
    created: boolean;
  }>(
    `revisions/${encodeURIComponent(input.revisionId)}/attachments/photo/uploads/${encodeURIComponent(input.uploadId)}/finalize`,
    { method: "POST", body: {}, signal: input.signal, requestClass: "mutation_request" },
  );
}

export async function listCanonicalEstimatePhotoAttachments(input: {
  revisionId: string;
  includeDeleted?: boolean;
  signal?: AbortSignal | null;
}) {
  const query = input.includeDeleted ? "?includeDeleted=true" : "";
  return invoke<{
    apiVersion: string;
    revisionId: string;
    attachments: CanonicalEstimatePhotoAttachmentView[];
  }>(`revisions/${encodeURIComponent(input.revisionId)}/attachments${query}`, {
    signal: input.signal,
    requestClass: "ui_scope_load",
  });
}

export async function tombstoneCanonicalEstimatePhotoAttachment(input: {
  attachmentId: string;
  idempotencyKey: string;
  signal?: AbortSignal | null;
}) {
  return invoke<{
    apiVersion: string;
    attachmentId: string;
    attachmentEventId: string;
    status: "deleted";
  }>(`attachments/${encodeURIComponent(input.attachmentId)}/tombstone`, {
    method: "POST",
    body: { idempotencyKey: input.idempotencyKey },
    signal: input.signal,
    requestClass: "mutation_request",
  });
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
