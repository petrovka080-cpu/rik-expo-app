import {canonicalProfessionalArtifactPurposeMatchesV1} from './canonicalEstimateArtifactContract';
import {assertCanonicalCatalogPromptExtractionV1,assertCanonicalCatalogPromptBytesV1,
  MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1,readCanonicalCatalogPromptJsonV1} from "./canonicalCatalogPromptExtractionV1";
import type {CanonicalCatalogPromptExtractionV1} from "./contracts";
import type { CanonicalEstimateParameterSessionSnapshot } from "./canonicalEstimateParameterSessionSnapshot";
import {canonicalFormulaOutputBoundsPublicReasonRu} from './canonicalFormulaOutputBounds';
import { fetchWithRequestTimeout } from "../../requestTimeoutPolicy";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../supabaseClient";
import type { ConsumerEstimateHydrationTrace, ConsumerEstimateTransportPhase } from "../../consumerRequests/consumerEstimateHydrationTrace";
import {withCanonicalSourceProfileCalculationConsumersV1} from './canonicalDefinitionParameterConsumersR1';
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
  type CanonicalFusionQuantityClearPreviewS2758,
  type CanonicalEstimatePreliminaryNeedEvidence,
  type CanonicalEstimatePreliminaryNeedEvidenceReference,
  type CanonicalEstimateResourceSearchPage,
  type CanonicalEstimateSearchGroupPage,
  type CanonicalEstimateSearchPage,
  type CanonicalEstimateTypedRelation,
} from "./contracts";
import { canonicalProfessionalArtifactMetadataIdentityMatches } from "./canonicalEstimateArtifactContract";
import { canonicalPreliminaryNeedEvidenceIdentityMatches, isCanonicalPreliminaryNeedEvidence, isCanonicalPreliminaryNeedEvidenceReference } from "./canonicalEstimatePreliminaryNeedTransport";
import { cacheCanonicalPreliminaryNeedEvidence, readCachedCanonicalPreliminaryNeedEvidence } from "./canonicalEstimatePreliminaryNeedEvidenceCache";
import {
  readCanonicalEstimateSession,
  refreshCanonicalEstimateSession,
} from "./canonicalEstimateAuth.transport";

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
let runtimeCompatibilityInflight: Promise<void> | null = null;
let runtimeCompatibilityVerifiedAt = 0;
const RUNTIME_COMPATIBILITY_CACHE_MS = 30_000;

export function resetCanonicalEstimateRuntimeCompatibilityForTests(): void {
  runtimeCompatibilityInflight = null;
  runtimeCompatibilityVerifiedAt = 0;
}

type CanonicalEstimateRuntimeManifest = {
  runtimeRole?: string;
  authMode?: string;
  activeCompileJobCount?: number;
  capability?: { status?: string; ttlSeconds?: number } | null;
  compatibilityTuple?: Record<string, unknown>;
};

function localDeveloperRuntimeExpectedTuple(): Record<string, string> | null {
  // Runtime compatibility is independent of the developer-only auth broker.
  // The whole-app launcher keeps normal staging sessions and removes the
  // broker flag, but still requires this exact authenticated backend tuple.
  if (process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW !== "1"
    && process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY !== "true") return null;
  const expected = {
    definitionReleaseId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID ?? "").trim(),
    searchReleaseId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID ?? "").trim(),
    sourceHead: String(process.env.EXPO_PUBLIC_BUILD_COMMIT ?? "").trim(),
    sourceTree: String(process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH ?? "").trim(),
    frontendSourceTreeHash: String(process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH ?? "").trim(),
    frontendProductSourceHash: String(process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH ?? "").trim(),
    frontendJsBundleFingerprint: String(process.env.EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT ?? "").trim(),
    capabilityId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID ?? "").trim(),
  };
  if (Object.values(expected).some((value) => !value)) {
    throw new CanonicalEstimateApiError("Обновите страницу или перезапустите приложение, чтобы проверить его версию.", {
      code: "RUNTIME_COMPATIBILITY_CONFIG_MISSING",
      httpStatus: 503,
      retryable: true,
    });
  }
  return expected;
}

async function ensureLocalDeveloperRuntimeCompatibility(token: string): Promise<void> {
  const expected = localDeveloperRuntimeExpectedTuple();
  if (!expected) return;
  if (Date.now() - runtimeCompatibilityVerifiedAt < RUNTIME_COMPATIBILITY_CACHE_MS) return;
  if (runtimeCompatibilityInflight) return runtimeCompatibilityInflight;
  runtimeCompatibilityInflight = (async () => {
    const response = await fetchWithRequestTimeout(
      `${resolveFunctionUrl()}/runtime-manifest`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
      {
        // This manifest joins the model release, search release, capability and
        // active-job state. Treating it as an 8 s scalar lookup caused valid
        // approval clicks to fail during a transient database slowdown.
        requestClass: "ui_scope_load",
        owner: "canonical_estimate_client",
        operation: "runtime-manifest",
        screen: "request",
        surface: "canonical_estimate_backend",
        sourceKind: "canonical_estimate_edge_function",
      },
    );
    // Preserve transport/auth failures before interpreting any manifest tuple.
    if (response.status === 401) {
      throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", { code: "AUTH_REQUIRED", httpStatus: 401 });
    }
    if (response.status === 403) {
      throw new CanonicalEstimateApiError("Недостаточно прав для расчёта сметы.", { code: "PERMISSION_DENIED", httpStatus: 403 });
    }
    if (!response.ok) {
      throw new CanonicalEstimateApiError("Проверка версии приложения временно недоступна. Повторите попытку.", {
        code: "RUNTIME_MANIFEST_UNAVAILABLE", httpStatus: response.status,
        retryable: response.status >= 500 || response.status === 408 || response.status === 429,
      });
    }
    const manifest = await response.json().catch(() => null) as CanonicalEstimateRuntimeManifest | null;
    const manifestHealthy =
      manifest?.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND" &&
      manifest?.authMode === "STRICT_SESSION_INTROSPECTION" &&
      manifest?.capability?.status === "ACTIVE" &&
      Number(manifest.capability.ttlSeconds ?? 0) >= 60 * 60;
    // Active compile jobs do not change this runtime's identity or authority.
    // Requiring global idleness here can block a job's own polling/cancellation.
    if (!manifestHealthy) {
      throw new CanonicalEstimateApiError("Не удалось подтвердить версию приложения. Повторите попытку.", {
        code: "RUNTIME_MANIFEST_NOT_READY", httpStatus: 503, retryable: true,
      });
    }
    const tuple = manifest?.compatibilityTuple ?? {};
    const mismatch = Object.entries(expected).find(([key, value]) => String(tuple[key] ?? "") !== value);
    if (mismatch) {
      throw new CanonicalEstimateApiError("Версия приложения устарела. Обновите страницу или перезапустите приложение.", {
        code: `RUNTIME_COMPATIBILITY_MISMATCH_${mismatch[0]}`, httpStatus: 503, retryable: true,
      });
    }
    runtimeCompatibilityVerifiedAt = Date.now();
  })();
  try {
    await runtimeCompatibilityInflight;
  } finally {
    runtimeCompatibilityInflight = null;
  }
}

async function refreshAccessToken(): Promise<string> {
  if (accessTokenRefreshInflight) return accessTokenRefreshInflight;
  accessTokenRefreshInflight = (async () => {
    const { data, error } = await refreshCanonicalEstimateSession();
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

async function accessToken(forceRefresh = false, refreshBudget?: { used: boolean }): Promise<string> {
  const { data, error } = await readCanonicalEstimateSession();
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
  ) {
    if (refreshBudget?.used) {
      throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", { code: "AUTH_REQUIRED", httpStatus: 401 });
    }
    if (refreshBudget) refreshBudget.used = true;
    return refreshAccessToken();
  }
  return data.session.access_token;
}

async function invoke<T>(path: string, options: {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal | null;
  requestClass?: "lightweight_lookup" | "ui_scope_load" | "mutation_request";
  hydrationTrace?: ConsumerEstimateHydrationTrace;
  boundedCatalogPromptResponse?: boolean;
} = {}): Promise<T> {
  const method = options.method ?? "GET";
  // Optional fixed-phase diagnostics for snapshot hydration only. No token,
  // path, request/response body or error text enters the trace; transport,
  // compatibility, cancellation and the single 401 retry remain unchanged.
  const measureTransport = <Result>(phase: ConsumerEstimateTransportPhase, operation: () => Promise<Result>): Promise<Result> =>
    options.hydrationTrace ? options.hydrationTrace.measureAsync(phase, operation) : operation();
  const execute = (token: string) => measureTransport("PARAMETER_TRANSPORT_HTTP", () => fetchWithRequestTimeout(
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
  ));
  // One budget covers proactive expiry refresh, manifest 401 and operation 401.
  // Existing refresh singleflight is shared; each request can consume it once.
  const refreshBudget = { used: false };
  let token = await measureTransport("PARAMETER_TRANSPORT_AUTH", () => accessToken(false, refreshBudget));
  const executeCompatible = async () => {
    await measureTransport("PARAMETER_TRANSPORT_COMPATIBILITY", () => ensureLocalDeveloperRuntimeCompatibility(token));
    const result = await execute(token);
    if (result.status === 401) {
      throw new CanonicalEstimateApiError("Для расчёта сметы требуется авторизация.", { code: "AUTH_REQUIRED", httpStatus: 401 });
    }
    return result;
  };
  let response: Response;
  try {
    response = await executeCompatible();
  } catch (error) {
    if (!(error instanceof CanonicalEstimateApiError) || error.httpStatus !== 401 || refreshBudget.used) throw error;
    token = await measureTransport("PARAMETER_TRANSPORT_AUTH", () => accessToken(true, refreshBudget));
    runtimeCompatibilityVerifiedAt = 0;
    // This single second attempt is outside the catch: no retry loop or second
    // budget, and the refreshed token must pass the unchanged expected tuple.
    response = await executeCompatible();
  }
  let payload: unknown = null;
  if(options.boundedCatalogPromptResponse){
    payload=await measureTransport("PARAMETER_TRANSPORT_DECODE",()=>readCanonicalCatalogPromptJsonV1(response,"response"));
  }else{
    try { payload = await measureTransport("PARAMETER_TRANSPORT_DECODE", () => response.json()); } catch { /* normalized below */ }
  }
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

export function searchCanonicalEstimateResources(input: {
  query: string;
  kind?: "all" | "material" | "labor" | "equipment" | "service";
  pageSize?: number;
  signal?: AbortSignal | null;
}) {
  const params = new URLSearchParams({
    query: input.query,
    kind: input.kind ?? "all",
    pageSize: String(input.pageSize ?? 50),
  });
  return invoke<CanonicalEstimateResourceSearchPage>(
    `search/resources?${params.toString()}`,
    { signal: input.signal, requestClass: "ui_scope_load" },
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
  return admittedCanonicalCatalogItem(result.item);
}

function admittedCanonicalCatalogItem(item:CanonicalEstimateCatalogItem){
  if (item.contentAdmission?.allowed !== true
    || item.contentAdmission.contractVersion !== "estimate-admission-r3") {
    throw new CanonicalEstimateApiError(
      "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
      { code: "ESTIMATE_ADMISSION_DENIED", httpStatus: 409 },
    );
  }
  const parameterSchema=withCanonicalSourceProfileCalculationConsumersV1(
    item.parameterSchema,item.applicability.sourceProfileSelectionV1);
  return parameterSchema===item.parameterSchema?item:{...item,parameterSchema};
}

export async function getCanonicalEstimateCatalogItemForPrompt(catalogId:string,prompt:string,
  signal?:AbortSignal|null,releaseId?:string|null){
  const body={prompt,...(releaseId?.trim()?{releaseId:releaseId.trim()}:{})};
  assertCanonicalCatalogPromptBytesV1(JSON.stringify(body),MAX_CANONICAL_CATALOG_PROMPT_REQUEST_BYTES_V1,"request");
  const result=await invoke<{item:CanonicalEstimateCatalogItem;promptExtraction:CanonicalCatalogPromptExtractionV1}>(
    `catalog/${encodeURIComponent(catalogId)}`,{method:"POST",body,
      signal,requestClass:"ui_scope_load",boundedCatalogPromptResponse:true});
  const item=admittedCanonicalCatalogItem(result.item);
  if(item.catalogId!==catalogId||(releaseId?.trim()&&item.releaseId!==releaseId.trim())){
    throw new CanonicalEstimateApiError("Ответ не соответствует выбранной версии работы.",
      {code:"CATALOG_PROMPT_BINDING_INVALID",httpStatus:409});
  }
  assertCanonicalCatalogPromptExtractionV1(result.promptExtraction,item,prompt);
  return{item,promptExtraction:result.promptExtraction};
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
  const maxPollingAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs) + 1);
  for (let attempt = 0; attempt < maxPollingAttempts; attempt += 1) {
    if (input.signal?.aborted) throw input.signal.reason ?? new Error("estimate job wait aborted");
    const job = await getCanonicalEstimateJob(input.jobId, input.signal);
    input.onProgress?.(job);
    if (TERMINAL_JOB_STATES.has(job.status)) {
      if (job.status !== "succeeded" || (input.requireRevisionResult !== false && !job.resultRevisionId)) {
        const boundsReason=canonicalFormulaOutputBoundsPublicReasonRu(job.errorCode,job.errorUserMessageRu);
        const message = job.errorCode === 'EMPTY_ESTIMATE_COMPOSITION'
          ? 'В смете нет позиций. Укажите объём работ больше нуля и проверьте выбранный состав. Введённые данные сохранены.'
          : job.errorCode === 'FORMULA_OUTPUT_BOUNDS_FAILED'
          ? boundsReason ? `Расчёт не выполнен: ${boundsReason} Введённые данные сохранены.`
            : 'Расчёт не выполнен. Проверьте согласованность введённых количеств. Введённые данные сохранены.'
          : job.errorCode === 'PROJECT_GEOMETRY_PARAMETER_CONFLICT'
          ? 'Выбранная схема трассы противоречит введённым количествам. Выберите проектную раскладку или уточните количества фитингов. Ввод сохранён.'
          : job.errorCode === 'COMPOSITION_SELECTION_INVALID'
            ? 'Изменение состава не выполнено. Для выбранной подработы нужно проверить общие ресурсы и применимость состава. Исходная смета и ручные данные сохранены.'
          : `Расчёт не завершён: ${job.errorCode ?? job.status}`;
        throw new CanonicalEstimateApiError(message, {
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
  throw new CanonicalEstimateApiError("Р Р°СЃС‡С‘С‚ РїСЂРѕРґРѕР»Р¶Р°РµС‚СЃСЏ РЅР° СЃРµСЂРІРµСЂРµ. Р•РіРѕ РјРѕР¶РЅРѕ РѕС‚РєСЂС‹С‚СЊ РёР· РёСЃС‚РѕСЂРёРё.", {
    code: "JOB_WAIT_TIMEOUT",
    httpStatus: 202,
    retryable: true,
  });
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

function assertArtifactPurposeInputV1(input:{kind:string;documentProfile?:string;issuancePurpose?:unknown}):void {
  if(input.issuancePurpose!==undefined&&input.issuancePurpose!=='STANDARD'&&input.issuancePurpose!=='PRELIMINARY_REVIEW'
    ||input.issuancePurpose==='PRELIMINARY_REVIEW'&&(input.kind!=='pdf'||input.documentProfile!=='professional_v1'))
    throw new CanonicalEstimateApiError('Некорректный режим PDF.',{code:'ARTIFACT_PURPOSE_INVALID',httpStatus:400});
}
export function createCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  documentProfile?: "professional_v1";
  issuancePurpose?:import('./contracts').CanonicalProfessionalPdfIssuancePurpose;
  reviewRequest?:import('./contracts').CanonicalProfessionalPdfReviewRequestV1;
  idempotencyKey: string;
  signal?: AbortSignal | null;
}) {
  assertArtifactPurposeInputV1(input);
  return invoke<CanonicalEstimateJobAccepted & { artifactId: string; artifactStatus: string }>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}`,
    {
      method: "POST",
      body: {
        idempotencyKey: input.idempotencyKey,
        ...(input.documentProfile ? { documentProfile: input.documentProfile } : {}),
        ...(input.issuancePurpose?{issuancePurpose:input.issuancePurpose}:{}),
        ...(input.reviewRequest?{reviewRequest:input.reviewRequest}:{}),
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
  issuancePurpose?:import('./contracts').CanonicalProfessionalPdfIssuancePurpose;
  reviewRequest?:import('./contracts').CanonicalProfessionalPdfReviewRequestV1;
  signal?: AbortSignal | null;
}) {
  assertArtifactPurposeInputV1(input);
  const profileQuery = input.documentProfile
    ? `?documentProfile=${encodeURIComponent(input.documentProfile)}`
    : "";
  const purposeQuery=input.issuancePurpose?`${profileQuery?'&':'?'}issuancePurpose=${encodeURIComponent(input.issuancePurpose)}`:'';
  return invoke<CanonicalEstimateArtifactView>(
    `revisions/${encodeURIComponent(input.revisionId)}/artifacts/${input.kind}${profileQuery}${purposeQuery}`,
    { signal: input.signal, requestClass: "ui_scope_load" },
  );
}

export async function buildCanonicalEstimateArtifact(input: {
  revisionId: string;
  kind: "pdf" | "procurement";
  documentProfile?: "professional_v1";
  issuancePurpose?:import('./contracts').CanonicalProfessionalPdfIssuancePurpose;
  reviewRequest?:import('./contracts').CanonicalProfessionalPdfReviewRequestV1;
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
  expectedIssuancePurpose?:import('./contracts').CanonicalProfessionalPdfIssuancePurpose;
  expectedCatalogId?: string | null;
  expectedRowCount?: number | null;
}): void {
  if(!canonicalProfessionalArtifactPurposeMatchesV1(input.artifact.metadata,input.expectedIssuancePurpose))
    throw new CanonicalEstimateApiError('Документ сформирован для другого режима проверки.',{code:'ARTIFACT_PURPOSE_CONFLICT',httpStatus:409});
  const metadataCatalogId = String(input.artifact.metadata?.sourceCatalogId ?? "").trim();
  const metadataRowCount = Number(input.artifact.metadata?.sourceRowCount);
  const metadataChecksum = String(
    input.artifact.metadata?.sourceRevisionChecksumSha256 ?? "",
  ).trim();
  const metadataTemplateVersion = String(input.artifact.metadata?.templateVersion ?? "").trim();
  const metadataDocumentProfile = String(input.artifact.metadata?.documentProfile ?? "").trim();
  const metadataOwnerUserId = String(input.artifact.metadata?.sourceOwnerUserId ?? "").trim();
  const professionalIdentityMatches = canonicalProfessionalArtifactMetadataIdentityMatches({
    metadata: input.artifact.metadata,
    revision: {
      ...input.revision,
      id: input.revision.revisionId,
      release_id: input.revision.releaseId,
      catalog_id: input.revision.catalogId,
      checksum_sha256: input.revision.checksumSha256,
      row_count: input.revision.rowCount,
    },
  });
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
      metadataOwnerUserId.length > 0 &&
      professionalIdentityMatches
    ));
  if (matches) return;
  throw new CanonicalEstimateApiError(
    "PDF не открыт: документ не принадлежит выбранной версии сметы.",
    { code: "ARTIFACT_REVISION_IDENTITY_MISMATCH", httpStatus: 409 },
  );
}

export function getCanonicalEstimateRevision(revisionId: string, options?: AbortSignal | null | {
  issuancePurpose: 'PRELIMINARY_REVIEW'; signal?: AbortSignal | null;
}) {
  const reportOptions = options != null && 'issuancePurpose' in options ? options : null;
  if (reportOptions && reportOptions.issuancePurpose !== 'PRELIMINARY_REVIEW') {
    throw new CanonicalEstimateApiError('Invalid revision read purpose', {code:'ARTIFACT_PURPOSE_INVALID',httpStatus:400});
  }
  const signal = options != null && 'issuancePurpose' in options ? options.signal : options;
  const query = reportOptions ? '?issuancePurpose=PRELIMINARY_REVIEW' : '';
  return invoke<CanonicalEstimateRevisionView>(`revisions/${encodeURIComponent(revisionId)}${query}`, {
    signal,
    requestClass: "ui_scope_load",
  });
}

export function listCanonicalRoofPrimerPrerequisiteCandidatesV1(revisionId:string,signal?:AbortSignal|null){
  return invoke<{apiVersion:string;revisionId:string;items:import('./canonicalRoofPrimerPrerequisiteV1').RoofPrimerPrerequisiteCandidateV1[]}>(
    `revisions/${encodeURIComponent(revisionId)}/primer-prerequisite-candidates`,{signal,requestClass:'ui_scope_load'});
}

export function getCanonicalFusionQuantityClearPreviewS2758(revisionId: string, signal?: AbortSignal | null) {
  return invoke<{ apiVersion: string; preview: CanonicalFusionQuantityClearPreviewS2758 | null }>(
    `revisions/${encodeURIComponent(revisionId)}/fusion-quantity-clear-preview`, { signal, requestClass: 'ui_scope_load' });
}

export async function getCanonicalEstimatePreliminaryNeedEvidence(
  reference: CanonicalEstimatePreliminaryNeedEvidenceReference,
  signal?: AbortSignal | null,
): Promise<CanonicalEstimatePreliminaryNeedEvidence> {
  if (!isCanonicalPreliminaryNeedEvidenceReference(reference)) throw new CanonicalEstimateApiError("Некорректная ссылка на доказательства строки.", {
    code: "PRELIMINARY_NEED_EVIDENCE_IDENTITY_MISMATCH", httpStatus: 409,
  });
  const { data } = await readCanonicalEstimateSession();
  const ownerUserId = data.session?.user?.id;
  if (!ownerUserId) throw new CanonicalEstimateApiError("Для чтения доказательств требуется авторизация.", {
    code: "AUTH_REQUIRED", httpStatus: 401,
  });
  const cached = await readCachedCanonicalPreliminaryNeedEvidence(ownerUserId, reference);
  if (cached) return cached;
  const evidence = await invoke<CanonicalEstimatePreliminaryNeedEvidence>(
    `revisions/${encodeURIComponent(reference.revisionId)}/preliminary-needs/${encodeURIComponent(reference.rowId)}/evidence`,
    { signal, requestClass: "ui_scope_load" },
  );
  if (!isCanonicalPreliminaryNeedEvidence(evidence) || !canonicalPreliminaryNeedEvidenceIdentityMatches(reference, evidence.reference)) {
    throw new CanonicalEstimateApiError("Доказательства не относятся к выбранной версии строки.", {
      code: "PRELIMINARY_NEED_EVIDENCE_IDENTITY_MISMATCH", httpStatus: 409,
    });
  }
  // Cache failure cannot prevent an authorized evidence read. Offline access is
  // available only for entries actually retained by the separate bounded cache.
  await cacheCanonicalPreliminaryNeedEvidence(ownerUserId, evidence).catch(() => undefined);
  return evidence;
}

export function getCanonicalEstimateParameterSessionSnapshot(
  revisionId: string,
  signal?: AbortSignal | null,
  hydrationTrace?: ConsumerEstimateHydrationTrace,
) {
  return invoke<CanonicalEstimateParameterSessionSnapshot>(`revisions/${encodeURIComponent(revisionId)}/parameter-session`, {
    signal,
    requestClass: "ui_scope_load",
    hydrationTrace,
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
  consumerIntent?: boolean;
  signal?: AbortSignal | null;
  onProgress?: (job: CanonicalEstimateJobView) => void;
}) {
  const accepted = await createCanonicalEstimate(input.consumerIntent ? { ...input.request,
    commandIntentV1: { contractVersion: 'canonical-user-command-intent:v1', key: input.request.idempotencyKey } } : input.request, input.signal);
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
  consumerIntent?: boolean;
  signal?: AbortSignal | null;
  onProgress?: (job: CanonicalEstimateJobView) => void;
}) {
  const accepted = await recalculateCanonicalEstimate(input.consumerIntent ? { ...input.request,
    commandIntentV1: { contractVersion: 'canonical-user-command-intent:v1', key: input.request.idempotencyKey } } : input.request, input.signal);
  const job = await waitForCanonicalEstimateJob({ jobId: accepted.jobId, signal: input.signal, onProgress: input.onProgress });
  const revisionId = job.resultRevisionId!;
  const [revision, rows] = await Promise.all([
    getCanonicalEstimateRevision(revisionId, input.signal),
    getAllCanonicalEstimateRevisionRows({ revisionId, signal: input.signal }),
  ]);
  return { accepted, job, revision, rows };
}
