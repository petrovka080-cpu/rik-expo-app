/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  assertCreateRequest,
  assertUuid,
} from "../../../src/lib/estimate/backendPlatform/contracts.ts";

const FUNCTION_NAME = "canonical-estimate";
const MAX_ROWS_PAGE = 500;
const MAX_LEGACY_ROWS = 5_000;
const MAX_LEGACY_PAYLOAD_BYTES = 8 * 1024 * 1024;
const ARTIFACT_SIGNED_URL_TTL_SECONDS = 15 * 60;
function corsHeaders(request: Request): Record<string, string> {
  const base = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  const origin = String(request.headers.get("Origin") ?? "").trim();
  if (!origin) return base;
  const allowed = new Set(env("ESTIMATE_ALLOWED_ORIGINS").split(",").map((entry) => entry.trim()).filter(Boolean));
  return allowed.has(origin) ? { ...base, "Access-Control-Allow-Origin": origin } : base;
}

const json = (status: number, body: Record<string, unknown>, requestId: string, request: Request) => new Response(
  JSON.stringify({ ...body, requestId }),
  {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Request-Id": requestId,
    },
  },
);

function env(name: string): string {
  return String(Deno.env.get(name) ?? "").trim();
}

function requireRequester(request: Request) {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const authorization = String(request.headers.get("Authorization") ?? "").trim();
  if (!supabaseUrl || !anonKey) {
    throw new CanonicalEstimateApiError("estimate backend is not configured", {
      code: "BACKEND_CONFIGURATION_ERROR",
      httpStatus: 503,
      retryable: true,
    });
  }
  if (!authorization) {
    throw new CanonicalEstimateApiError("authentication required", {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization, apikey: anonKey } },
  });
}

function requireAdmin() {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new CanonicalEstimateApiError("estimate artifact backend is not configured", {
      code: "BACKEND_CONFIGURATION_ERROR",
      httpStatus: 503,
      retryable: true,
    });
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function routeSegments(request: Request): string[] {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf(FUNCTION_NAME);
  return index >= 0 ? parts.slice(index + 1) : parts;
}

function parseCursor(raw: string | null): number {
  if (!raw) return -1;
  try {
    const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    if (!Number.isSafeInteger(decoded?.ordinal) || decoded.ordinal < 0) throw new Error("invalid");
    return decoded.ordinal;
  } catch {
    throw new CanonicalEstimateApiError("invalid rows cursor", {
      code: "INVALID_CURSOR",
      httpStatus: 400,
    });
  }
}

function createCursor(ordinal: number): string {
  return btoa(JSON.stringify({ ordinal })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function normalizeDbError(error: { code?: string; message?: string } | null): never {
  const code = String(error?.code ?? "");
  if (code === "42501") {
    throw new CanonicalEstimateApiError("access denied", { code: "ACCESS_DENIED", httpStatus: 403 });
  }
  if (code === "PGRST116") {
    throw new CanonicalEstimateApiError("estimate resource not found", { code: "NOT_FOUND", httpStatus: 404 });
  }
  if (code === "22023") {
    throw new CanonicalEstimateApiError("estimate request is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  if (code === "23505") {
    throw new CanonicalEstimateApiError("idempotency key conflicts with another request", {
      code: "IDEMPOTENCY_CONFLICT",
      httpStatus: 409,
    });
  }
  throw new CanonicalEstimateApiError("estimate backend operation failed", {
    code: "BACKEND_OPERATION_FAILED",
    httpStatus: 503,
    retryable: true,
  });
}

async function requireUser(requester: ReturnType<typeof createClient>) {
  const { data, error } = await requester.auth.getUser();
  if (error || !data?.user) {
    throw new CanonicalEstimateApiError("authentication required", {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  return data.user;
}

async function createCompileJob(request: Request, requester: ReturnType<typeof createClient>, operation: "compile" | "recalculate") {
  const body = await request.json();
  assertCreateRequest(body);
  const parentRevisionId = operation === "recalculate" ? body.parentRevisionId : null;
  if (operation === "recalculate") assertUuid(parentRevisionId, "parentRevisionId");
  if (operation === "compile" && (body.rowOverrides != null || body.customRows != null || body.releaseMigration != null)) {
    throw new CanonicalEstimateApiError("row amendments require a parent revision", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const { data, error } = await requester.rpc("estimate_create_compile_job_v1", {
    p_idempotency_key: body.idempotencyKey,
    p_operation: operation,
    p_catalog_id: body.catalogId,
    p_parent_revision_id: parentRevisionId,
    p_organization_id: body.organizationId ?? null,
    p_input_payload: {
      parameters: body.parameters,
      currencyCode: body.currencyCode,
      priceSnapshotIds: body.priceSnapshotIds ?? [],
      ...(operation === "recalculate" ? {
        rowOverrides: body.rowOverrides ?? {},
        customRows: body.customRows ?? [],
        ...(body.releaseMigration == null ? {} : { releaseMigration: body.releaseMigration }),
      } : {}),
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    },
  });
  if (error) normalizeDbError(error);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    jobId: result.job_id,
    status: result.job_status,
    created: result.created,
    pollAfterMs: 750,
  };
}

async function createLegacyRevisionJob(request: Request, requester: ReturnType<typeof createClient>) {
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CanonicalEstimateApiError("legacy revision body must be an object", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const sourceEstimateId = String(body.sourceEstimateId ?? "").trim();
  const sourceRevisionId = String(body.sourceRevisionId ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (!sourceEstimateId || sourceEstimateId.length > 240 || !sourceRevisionId || sourceRevisionId.length > 240
    || !catalogId || catalogId.length > 240 || !idempotencyKey || idempotencyKey.length > 200) {
    throw new CanonicalEstimateApiError("legacy revision identity is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  if (body.organizationId != null) assertUuid(body.organizationId, "organizationId");
  if (body.parentCanonicalRevisionId != null) assertUuid(body.parentCanonicalRevisionId, "parentCanonicalRevisionId");
  if (!Array.isArray(body.rows) || body.rows.length > MAX_LEGACY_ROWS) {
    throw new CanonicalEstimateApiError("legacy revision rows exceed the bounded import limit", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const currencyCode = String(body.currencyCode ?? "");
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new CanonicalEstimateApiError("currencyCode must be an ISO-4217 code", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const rowIds = new Set<string>();
  for (let index = 0; index < body.rows.length; index += 1) {
    const row = body.rows[index];
    const rowId = String(row?.rowId ?? "").trim();
    if (!row || typeof row !== "object" || Array.isArray(row) || !rowId || rowId.length > 240 || rowIds.has(rowId)) {
      throw new CanonicalEstimateApiError(`legacy row ${index} is invalid`, { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    rowIds.add(rowId);
  }
  const sourceProjection = {
    sourceEstimateId,
    sourceRevisionId,
    catalogId,
    currencyCode,
    parameters: body.parameters ?? {},
    totals: body.totals ?? {},
    rows: body.rows,
  };
  const sourceChecksumSha256 = await sha256(sourceProjection);
  const inputPayload = {
    ...sourceProjection,
    sourceChecksumSha256,
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
  };
  if (new TextEncoder().encode(JSON.stringify(inputPayload)).byteLength > MAX_LEGACY_PAYLOAD_BYTES) {
    throw new CanonicalEstimateApiError("legacy revision payload exceeds 8 MiB", { code: "PAYLOAD_TOO_LARGE", httpStatus: 413 });
  }
  const { data, error } = await requester.rpc("estimate_create_legacy_revision_job_v1", {
    p_idempotency_key: idempotencyKey,
    p_catalog_id: catalogId,
    p_organization_id: body.organizationId ?? null,
    p_source_estimate_id: sourceEstimateId,
    p_source_revision_id: sourceRevisionId,
    p_source_checksum_sha256: sourceChecksumSha256,
    p_parent_revision_id: body.parentCanonicalRevisionId ?? null,
    p_input_payload: inputPayload,
  });
  if (error) normalizeDbError(error);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    jobId: result.job_id,
    status: result.job_status,
    created: result.created,
    sourceChecksumSha256,
    pollAfterMs: 750,
  };
}

async function createArtifactJob(
  request: Request,
  requester: ReturnType<typeof createClient>,
  revisionId: string,
  kind: "pdf" | "procurement",
) {
  assertUuid(revisionId, "revisionId");
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = String(body?.idempotencyKey ?? request.headers.get("x-idempotency-key") ?? "").trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new CanonicalEstimateApiError("idempotencyKey is required", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const { data, error } = await requester.rpc("estimate_create_artifact_job_v1", {
    p_idempotency_key: idempotencyKey,
    p_revision_id: revisionId,
    p_artifact_kind: kind,
  });
  if (error) normalizeDbError(error);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    jobId: result.job_id,
    artifactId: result.artifact_id,
    status: result.job_status,
    artifactStatus: result.artifact_status,
    created: result.created,
    pollAfterMs: 1_000,
  };
}

async function readArtifact(
  requester: ReturnType<typeof createClient>,
  revisionId: string,
  kind: "pdf" | "procurement",
) {
  assertUuid(revisionId, "revisionId");
  const { data, error } = await requester
    .from("estimate_revision_artifact")
    .select("id,revision_id,artifact_kind,status,storage_bucket,storage_key,content_type,byte_size,sha256,metadata,error_code,expires_at,created_at,updated_at,ready_at")
    .eq("revision_id", revisionId)
    .eq("artifact_kind", kind)
    .single();
  if (error) normalizeDbError(error);
  const { data: revision, error: revisionError } = await requester
    .from("estimate_revision")
    .select("id,release_id,checksum_sha256")
    .eq("id", revisionId)
    .single();
  if (revisionError) normalizeDbError(revisionError);
  const artifactReleaseId = String(data.metadata?.sourceReleaseId ?? "");
  const artifactRevisionChecksum = String(data.metadata?.sourceRevisionChecksumSha256 ?? "");
  if (data.status === "ready" && (
    artifactReleaseId !== revision.release_id || artifactRevisionChecksum !== revision.checksum_sha256
  )) {
    throw new CanonicalEstimateApiError("artifact revision identity mismatch", {
      code: "ARTIFACT_REVISION_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
  }
  let signedUrl: string | null = null;
  let signedUrlExpiresAt: string | null = null;
  if (data.status === "ready" && data.storage_bucket && data.storage_key) {
    const { data: signed, error: signError } = await requireAdmin().storage
      .from(data.storage_bucket)
      .createSignedUrl(data.storage_key, ARTIFACT_SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      throw new CanonicalEstimateApiError("artifact signing failed", { code: "ARTIFACT_SIGNING_FAILED", httpStatus: 503, retryable: true });
    }
    signedUrl = signed.signedUrl;
    signedUrlExpiresAt = new Date(Date.now() + ARTIFACT_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  }
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    artifactId: data.id,
    revisionId: data.revision_id,
    releaseId: artifactReleaseId || revision.release_id,
    kind: data.artifact_kind,
    status: data.status,
    contentType: data.content_type,
    byteSize: data.byte_size == null ? null : Number(data.byte_size),
    sha256: data.sha256,
    metadata: data.metadata,
    errorCode: data.error_code,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    readyAt: data.ready_at,
    signedUrl,
    signedUrlExpiresAt,
  };
}

async function readJob(requester: ReturnType<typeof createClient>, jobId: string) {
  assertUuid(jobId, "jobId");
  const { data, error } = await requester
    .from("estimate_compile_job")
    .select("id,operation,status,stage,progress,attempt,result_revision_id,error_code,created_at,updated_at")
    .eq("id", jobId)
    .single();
  if (error) normalizeDbError(error);
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    jobId: data.id,
    operation: data.operation,
    status: data.status,
    stage: data.stage,
    progress: data.progress,
    attempt: data.attempt,
    resultRevisionId: data.result_revision_id,
    errorCode: data.error_code,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function cancelJob(requester: ReturnType<typeof createClient>, jobId: string) {
  assertUuid(jobId, "jobId");
  const { data, error } = await requester.rpc("estimate_cancel_compile_job_v1", { p_job_id: jobId });
  if (error) normalizeDbError(error);
  if (!data) throw new CanonicalEstimateApiError("only queued jobs can be cancelled", {
    code: "JOB_NOT_CANCELLABLE",
    httpStatus: 409,
  });
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, jobId, status: "cancelled" };
}

async function readRevision(requester: ReturnType<typeof createClient>, revisionId: string) {
  assertUuid(revisionId, "revisionId");
  const { data, error } = await requester
    .from("estimate_revision")
    .select("id,parent_revision_id,release_id,catalog_id,revision_number,status,input_parameters,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,created_at")
    .eq("id", revisionId)
    .single();
  if (error) normalizeDbError(error);
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: data.id,
    parentRevisionId: data.parent_revision_id,
    releaseId: data.release_id,
    catalogId: data.catalog_id,
    revisionNumber: data.revision_number,
    status: data.status,
    parameters: data.input_parameters,
    amendmentContract: data.amendment_contract,
    currencyCode: data.currency_code,
    totals: data.totals,
    rowCount: data.row_count,
    checksumSha256: data.checksum_sha256,
    compilerVersion: data.compiler_version,
    createdAt: data.created_at,
  };
}

function revisionView(data: Record<string, unknown>) {
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId: data.id,
    parentRevisionId: data.parent_revision_id,
    releaseId: data.release_id,
    catalogId: data.catalog_id,
    revisionNumber: data.revision_number,
    status: data.status,
    parameters: data.input_parameters,
    amendmentContract: data.amendment_contract,
    currencyCode: data.currency_code,
    totals: data.totals,
    rowCount: data.row_count,
    checksumSha256: data.checksum_sha256,
    compilerVersion: data.compiler_version,
    createdAt: data.created_at,
  };
}

async function readRevisionHistory(request: Request, requester: ReturnType<typeof createClient>) {
  const url = new URL(request.url);
  const catalogId = String(url.searchParams.get("catalogId") ?? "").trim();
  const requestedLimit = Number(url.searchParams.get("limit") ?? 30);
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 30;
  const cursor = url.searchParams.get("cursor");
  const beforeRevisionNumber = cursor == null ? null : Number(cursor);
  if (!catalogId || catalogId.length > 240
    || (beforeRevisionNumber != null && (!Number.isSafeInteger(beforeRevisionNumber) || beforeRevisionNumber <= 0))) {
    throw new CanonicalEstimateApiError("invalid revision history query", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  let query = requester
    .from("estimate_revision")
    .select("id,parent_revision_id,release_id,catalog_id,revision_number,status,input_parameters,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,created_at")
    .eq("catalog_id", catalogId)
    .order("revision_number", { ascending: false })
    .limit(limit + 1);
  if (beforeRevisionNumber != null) query = query.lt("revision_number", beforeRevisionNumber);
  const { data, error } = await query;
  if (error) normalizeDbError(error);
  const hasMore = data.length > limit;
  const page = hasMore ? data.slice(0, limit) : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisions: page.map(revisionView),
    nextCursor: hasMore ? String(page[page.length - 1].revision_number) : null,
  };
}

async function readRevisionRows(request: Request, requester: ReturnType<typeof createClient>, revisionId: string) {
  assertUuid(revisionId, "revisionId");
  const url = new URL(request.url);
  const afterOrdinal = parseCursor(url.searchParams.get("cursor"));
  const requestedLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(requestedLimit) ? Math.min(MAX_ROWS_PAGE, Math.max(1, requestedLimit)) : 100;
  const { data, error } = await requester
    .from("estimate_revision_row")
    .select("row_id,ordinal,section,category,title_ru,unit_id,quantity,unit_price,amount,currency_code,procurement_eligible,included_in_estimate,included_in_procurement,ownership_status,calculation_trace,normative_trace,row_sha256")
    .eq("revision_id", revisionId)
    .gt("ordinal", afterOrdinal)
    .order("ordinal", { ascending: true })
    .limit(limit + 1);
  if (error) normalizeDbError(error);
  const hasMore = data.length > limit;
  const page = hasMore ? data.slice(0, limit) : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    revisionId,
    rows: page.map((row) => ({
      rowId: row.row_id,
      ordinal: row.ordinal,
      section: row.section,
      category: row.category,
      titleRu: row.title_ru,
      unitId: row.unit_id,
      quantity: row.quantity == null ? null : String(row.quantity),
      unitPrice: row.unit_price == null ? null : String(row.unit_price),
      amount: row.amount == null ? null : String(row.amount),
      currencyCode: row.currency_code,
      procurementEligible: row.procurement_eligible,
      includedInEstimate: row.included_in_estimate,
      includedInProcurement: row.included_in_procurement,
      ownershipStatus: row.ownership_status,
      calculationTrace: row.calculation_trace,
      normativeTrace: row.normative_trace,
      rowSha256: row.row_sha256,
    })),
    nextCursor: hasMore ? createCursor(page[page.length - 1].ordinal) : null,
  };
}

async function searchCatalog(request: Request, requester: ReturnType<typeof createClient>) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("query") ?? "").trim().slice(0, 120);
  const domain = String(url.searchParams.get("domain") ?? "").trim();
  const requestedLimit = Number(url.searchParams.get("limit") ?? 30);
  const limit = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 30;
  let selection = requester
    .from("estimate_work_identity")
    .select("catalog_id,namespace,domain,work_key,title_ru")
    .is("retired_at", null)
    .order("catalog_id", { ascending: true })
    .limit(limit);
  if (domain) selection = selection.eq("domain", domain);
  if (query) selection = selection.ilike("title_ru", `%${query.replace(/[%_]/g, "\\$&")}%`);
  const { data, error } = await selection;
  if (error) normalizeDbError(error);
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    items: data.map((row) => ({
      catalogId: row.catalog_id,
      namespace: row.namespace,
      domain: row.domain,
      workKey: row.work_key,
      titleRu: row.title_ru,
    })),
  };
}

async function readCatalogItem(requester: ReturnType<typeof createClient>, rawCatalogId: string) {
  const catalogId = decodeURIComponent(rawCatalogId);
  if (!catalogId || catalogId.length > 240) throw new CanonicalEstimateApiError("invalid catalogId", {
    code: "INVALID_ARGUMENT",
    httpStatus: 400,
  });
  const { data: identity, error: identityError } = await requester
    .from("estimate_work_identity")
    .select("catalog_id,namespace,domain,work_key,title_ru")
    .eq("catalog_id", catalogId)
    .is("retired_at", null)
    .single();
  if (identityError) normalizeDbError(identityError);
  const { data: release, error: releaseError } = await requester
    .from("estimate_definition_release")
    .select("id")
    .eq("status", "active")
    .single();
  if (releaseError) normalizeDbError(releaseError);
  const { data: definition, error: definitionError } = await requester
    .from("estimate_definition_version")
    .select("id,definition_version,applicability,source_metadata")
    .eq("release_id", release.id)
    .eq("catalog_id", catalogId)
    .single();
  if (definitionError) normalizeDbError(definitionError);
  const { data: parameters, error: parameterError } = await requester
    .from("estimate_parameter_definition")
    .select("parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json")
    .eq("definition_version_id", definition.id)
    .order("ordinal", { ascending: true });
  if (parameterError) normalizeDbError(parameterError);
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    item: {
      catalogId: identity.catalog_id,
      releaseId: release.id,
      namespace: identity.namespace,
      domain: identity.domain,
      workKey: identity.work_key,
      titleRu: identity.title_ru,
      definitionVersion: definition.definition_version,
      applicability: definition.applicability,
      professionalMetadata: definition.source_metadata,
      parameterSchema: parameters.map((parameter) => ({
        parameterId: parameter.parameter_id,
        ordinal: parameter.ordinal,
        valueType: parameter.value_type,
        unitId: parameter.unit_id,
        titleRu: parameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json,
      })),
    },
  };
}

export async function handleCanonicalEstimateRequest(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  try {
    const requester = requireRequester(request);
    await requireUser(requester);
    const path = routeSegments(request);
    if (request.method === "POST" && path.join("/") === "jobs/compile") {
      return json(202, await createCompileJob(request, requester, "compile"), requestId, request);
    }
    if (request.method === "POST" && path.join("/") === "jobs/recalculate") {
      return json(202, await createCompileJob(request, requester, "recalculate"), requestId, request);
    }
    if (request.method === "POST" && path.join("/") === "migrations/legacy-revisions") {
      return json(202, await createLegacyRevisionJob(request, requester), requestId, request);
    }
    if (request.method === "GET" && path.length === 2 && path[0] === "jobs") {
      return json(200, await readJob(requester, path[1]), requestId, request);
    }
    if (request.method === "POST" && path.length === 3 && path[0] === "jobs" && path[2] === "cancel") {
      return json(200, await cancelJob(requester, path[1]), requestId, request);
    }
    if (request.method === "GET" && path.length === 2 && path[0] === "revisions") {
      return json(200, await readRevision(requester, path[1]), requestId, request);
    }
    if (request.method === "GET" && path.length === 1 && path[0] === "revisions") {
      return json(200, await readRevisionHistory(request, requester), requestId, request);
    }
    if (request.method === "GET" && path.length === 3 && path[0] === "revisions" && path[2] === "rows") {
      return json(200, await readRevisionRows(request, requester, path[1]), requestId, request);
    }
    if (path.length === 4 && path[0] === "revisions" && path[2] === "artifacts"
      && (path[3] === "pdf" || path[3] === "procurement")) {
      if (request.method === "POST") {
        return json(202, await createArtifactJob(request, requester, path[1], path[3]), requestId, request);
      }
      if (request.method === "GET") {
        return json(200, await readArtifact(requester, path[1], path[3]), requestId, request);
      }
    }
    if (request.method === "GET" && path.length === 1 && path[0] === "catalog") {
      return json(200, await searchCatalog(request, requester), requestId, request);
    }
    if (request.method === "GET" && path.length === 2 && path[0] === "catalog") {
      return json(200, await readCatalogItem(requester, path[1]), requestId, request);
    }
    return json(404, { error: { code: "ROUTE_NOT_FOUND", message: "canonical estimate route not found" } }, requestId, request);
  } catch (error) {
    const known = error instanceof CanonicalEstimateApiError;
    if (!known) console.error(`[${FUNCTION_NAME}] unhandled`, { requestId, error });
    const status = known ? error.httpStatus : 500;
    return json(status, {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "canonical estimate backend failed",
        retryable: known ? error.retryable : false,
      },
    }, requestId, request);
  }
}

Deno.serve(handleCanonicalEstimateRequest);
