/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  assertCreateRequest,
  assertUuid,
} from "../../../src/lib/estimate/backendPlatform/contracts.ts";
import {
  evaluateEstimateAdmission,
  type AdmissionDecision,
  type EstimateAdmissionIngress,
} from "../../../src/lib/estimate/backendPlatform/estimateAdmissionR3.ts";
import {
  buildCanonicalEstimateRegistryEntry,
  CanonicalEstimateDefinitionRegistry,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts";

const FUNCTION_NAME = "canonical-estimate";
const MAX_ROWS_PAGE = 500;
const MAX_LEGACY_ROWS = 5_000;
const MAX_LEGACY_PAYLOAD_BYTES = 8 * 1024 * 1024;
const ARTIFACT_SIGNED_URL_TTL_SECONDS = 15 * 60;
const PHOTO_SIGNED_URL_TTL_SECONDS = 15 * 60;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
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

function photoMimeFromBytes(bytes: Uint8Array): "image/jpeg" | "image/png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  return null;
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

type SearchCursor = {
  releaseId: string;
  snapshotSha256: string;
  orderKey: string;
  shown: number;
};

function base64UrlJson(value: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseSearchCursor(raw: string | null): SearchCursor | null {
  if (!raw) return null;
  try {
    const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    if (!decoded || typeof decoded.releaseId !== "string" || typeof decoded.snapshotSha256 !== "string"
      || typeof decoded.orderKey !== "string" || !Number.isSafeInteger(decoded.shown) || decoded.shown < 0) {
      throw new Error("invalid");
    }
    return decoded;
  } catch {
    throw new CanonicalEstimateApiError("invalid search cursor", {
      code: "INVALID_CURSOR",
      httpStatus: 400,
    });
  }
}

function normalizeSearchQuery(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function significantSearchLength(value: string): number {
  return (value.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

function parameterGuideView(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return undefined;
  const guide = source as Record<string, unknown>;
  return {
    guideKind: guide.guide_kind,
    guideShortRu: guide.guide_short_ru,
    guideMin: guide.guide_min,
    guideMax: guide.guide_max,
    guideTarget: guide.guide_target,
    minInclusive: guide.min_inclusive,
    maxInclusive: guide.max_inclusive,
    guideOptions: guide.guide_options,
    canonicalUnit: guide.canonical_unit,
    displayUnit: guide.display_unit,
    guideBasis: guide.guide_basis,
    precision: guide.precision,
    step: guide.step,
    guideCondition: guide.guide_condition,
    guideValidationPolicy: guide.guide_validation_policy,
    sourceRole: guide.source_role,
    sourceDocument: guide.source_document,
    sourceEditionStatus: guide.source_edition_status,
    sourceLocator: guide.source_locator,
    guideVersion: guide.guide_version,
    sourceSnapshotHash: guide.source_snapshot_hash,
    applicability: guide.applicability,
    exclusions: guide.exclusions,
    verifiedAt: guide.verified_at,
  };
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
  if (code === "40001") {
    throw new CanonicalEstimateApiError("draft was changed on another device", {
      code: "DRAFT_VERSION_CONFLICT",
      httpStatus: 409,
    });
  }
  if (code === "P0002") {
    throw new CanonicalEstimateApiError("draft not found", { code: "NOT_FOUND", httpStatus: 404 });
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

async function productionAdmissionDecisions(
  requester: ReturnType<typeof createClient>,
  catalogIds: readonly string[],
  ingress: EstimateAdmissionIngress,
  exactReleaseId?: string | null,
): Promise<Map<string, AdmissionDecision>> {
  const ids = [...new Set(catalogIds.map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();
  let releaseQuery = requester
    .from("estimate_definition_release")
    .select("id,status");
  releaseQuery = exactReleaseId
    ? releaseQuery.eq("id", exactReleaseId)
    : releaseQuery.eq("status", "active");
  const { data: release, error: releaseError } = await releaseQuery.maybeSingle();
  if (releaseError) normalizeDbError(releaseError);

  const { data: searchRelease, error: searchReleaseError } = await requester
    .from("estimate_search_index_release")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (searchReleaseError) normalizeDbError(searchReleaseError);

  const { data: manifests, error: manifestError } = release?.id
    ? await requester
      .from("estimate_cumulative_manifest_entry")
      .select("release_id,catalog_id,definition_version_id,runtime_publication_state,baseline_ready,scenario_ready")
      .eq("release_id", release.id)
      .in("catalog_id", ids)
    : { data: [], error: null };
  if (manifestError) normalizeDbError(manifestError);
  const manifestByCatalog = new Map((manifests ?? []).map((row) => [row.catalog_id, row]));
  const definitionIds = [...new Set((manifests ?? []).map((row) => row.definition_version_id).filter(Boolean))];
  const { data: definitions, error: definitionError } = definitionIds.length
    ? await requester
      .from("estimate_definition_version")
      .select("id,release_id,catalog_id,content_status,content_gate_status,source_metadata")
      .in("id", definitionIds)
    : { data: [], error: null };
  if (definitionError) normalizeDbError(definitionError);
  const definitionById = new Map((definitions ?? []).map((row) => [row.id, row]));

  const { data: searchDocuments, error: searchDocumentError } = searchRelease?.id
    ? await requester
      .from("estimate_search_document")
      .select("search_release_id,catalog_id,definition_version_id,definition_release_id,adjudication_class,selectable,canonical_target_catalog_id,replacement_catalog_id")
      .eq("search_release_id", searchRelease.id)
      .in("catalog_id", ids)
    : { data: [], error: null };
  if (searchDocumentError) normalizeDbError(searchDocumentError);
  const searchByCatalog = new Map((searchDocuments ?? []).map((row) => [row.catalog_id, row]));
  const registry = new CanonicalEstimateDefinitionRegistry(ids.map((catalogId) => {
    const manifest = manifestByCatalog.get(catalogId);
    const definition = manifest ? definitionById.get(manifest.definition_version_id) : null;
    const search = searchByCatalog.get(catalogId);
    return buildCanonicalEstimateRegistryEntry({
      catalogId,
      manifestPresent: Boolean(manifest),
      definitionPresent: Boolean(definition),
      searchDocumentPresent: Boolean(search),
      definitionVersionId: definition?.id ?? manifest?.definition_version_id ?? null,
      definitionReleaseId: manifest && release ? release.id : definition?.release_id ?? null,
      searchDefinitionVersionId: search?.definition_version_id ?? null,
      searchReleaseId: search?.search_release_id ?? null,
      adjudicationClass: search?.adjudication_class ?? null,
      selectable: search?.selectable,
      canonicalTargetCatalogId: search?.canonical_target_catalog_id ?? null,
      replacementCatalogId: search?.replacement_catalog_id ?? null,
      sourceMetadata: definition?.source_metadata,
    });
  }));

  return new Map(ids.map((catalogId) => {
    const manifest = manifestByCatalog.get(catalogId);
    const definition = manifest ? definitionById.get(manifest.definition_version_id) : null;
    const search = searchByCatalog.get(catalogId);
    const registryEntry = registry.get(catalogId)!;
    const decision = evaluateEstimateAdmission({
      mode: "production",
      ingress,
      releaseId: release?.id ?? exactReleaseId ?? null,
      definitionVersionId: definition?.id ?? manifest?.definition_version_id ?? null,
      catalogId,
      releaseStatus: release?.status ?? null,
      manifestPublicationState: manifest?.runtime_publication_state ?? null,
      baselineReady: manifest?.baseline_ready === true,
      scenarioReady: manifest?.scenario_ready === true,
      definitionContentStatus: definition?.content_status ?? null,
      contentGateStatus: definition?.content_gate_status ?? null,
      definitionReleaseId: manifest && release ? release.id : null,
      selectedSearchReleaseId: searchRelease?.id ?? null,
      definitionSearchReleaseId: search?.search_release_id ?? null,
      unresolvedDisposition: registryEntry.unresolvedDisposition,
      authorizationValid: true,
    });
    return [catalogId, decision];
  }));
}

async function assertProductionAdmission(
  requester: ReturnType<typeof createClient>,
  catalogId: string,
  ingress: EstimateAdmissionIngress,
  exactReleaseId?: string | null,
): Promise<AdmissionDecision> {
  const decision = (await productionAdmissionDecisions(requester, [catalogId], ingress, exactReleaseId)).get(catalogId);
  if (!decision?.allowed) {
    throw new CanonicalEstimateApiError(
      "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
      { code: decision?.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED", httpStatus: 409 },
    );
  }
  return decision;
}

async function createCompileJob(request: Request, requester: ReturnType<typeof createClient>, operation: "compile" | "recalculate") {
  const body = await request.json();
  assertCreateRequest(body);
  const parentRevisionId = operation === "recalculate" ? body.parentRevisionId : null;
  if (operation === "recalculate") assertUuid(parentRevisionId, "parentRevisionId");
  const sourceRequestText = String(body.sourceRequestText ?? "").trim();
  const primaryMeasureParameterId = String(body.primaryMeasureParameterId ?? "").trim();
  const suppliedRequestIdentity = Boolean(sourceRequestText || primaryMeasureParameterId);
  if ((operation === "compile" || suppliedRequestIdentity)
    && (!sourceRequestText || !primaryMeasureParameterId)) {
    throw new CanonicalEstimateApiError("source request identity is required", {
      code: "SOURCE_REQUEST_IDENTITY_REQUIRED",
      httpStatus: 400,
    });
  }
  if (operation === "compile" && (body.rowOverrides != null || body.customRows != null || body.releaseMigration != null)) {
    throw new CanonicalEstimateApiError("row amendments require a parent revision", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  await assertProductionAdmission(
    requester,
    body.catalogId,
    operation === "compile" ? "direct_catalog_compile" : "parameter_recalculation",
  );
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
      ...(operation === "compile" || suppliedRequestIdentity ? {
        requestIdentity: { sourceRequestText, primaryMeasureParameterId },
      } : {}),
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
  await assertProductionAdmission(requester, catalogId, "revision_replay_migration");
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
  await assertProductionAdmission(requester, catalogId, "revision_replay_migration");
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
  publicKind: "pdf" | "professional_pdf" | "procurement",
) {
  assertUuid(revisionId, "revisionId");
  const body = await request.json().catch(() => ({}));
  const documentProfile = String(body?.documentProfile ?? "").trim();
  if (documentProfile && documentProfile !== "professional_v1") {
    throw new CanonicalEstimateApiError("unsupported PDF document profile", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  if (documentProfile && publicKind !== "pdf") {
    throw new CanonicalEstimateApiError("documentProfile is only valid for PDF", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const kind = publicKind === "pdf" && documentProfile === "professional_v1"
    ? "professional_pdf"
    : publicKind;
  const idempotencyKey = String(body?.idempotencyKey ?? request.headers.get("x-idempotency-key") ?? "").trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new CanonicalEstimateApiError("idempotencyKey is required", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const { data: sourceRevision, error: sourceRevisionError } = await requester
    .from("estimate_revision")
    .select("id,release_id,catalog_id,definition_version_id")
    .eq("id", revisionId)
    .single();
  if (sourceRevisionError) normalizeDbError(sourceRevisionError);
  await assertProductionAdmission(
    requester,
    sourceRevision.catalog_id,
    kind === "procurement" ? "procurement_artifact_create" : "pdf_artifact_create",
    sourceRevision.release_id,
  );
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

async function createRevisionPhotoUpload(
  request: Request,
  requester: ReturnType<typeof createClient>,
  revisionId: string,
) {
  assertUuid(revisionId, "revisionId");
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = String(body?.idempotencyKey ?? request.headers.get("x-idempotency-key") ?? "").trim();
  const requestId = String(body?.requestId ?? "").trim();
  const catalogId = String(body?.catalogId ?? "").trim();
  const rowId = String(body?.rowId ?? "").trim();
  const contentSha256 = String(body?.contentSha256 ?? "").trim().toLowerCase();
  const mimeType = String(body?.mimeType ?? "").trim().toLowerCase();
  const sizeBytes = Number(body?.sizeBytes);
  const replacesAttachmentId = body?.replacesAttachmentId == null
    ? null
    : String(body.replacesAttachmentId).trim();
  if (!idempotencyKey || idempotencyKey.length > 200
    || !requestId || requestId.length > 240
    || !catalogId || catalogId.length > 240
    || !rowId || rowId.length > 240
    || !/^[0-9a-f]{64}$/.test(contentSha256)
    || !["image/jpeg", "image/png"].includes(mimeType)
    || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_PHOTO_BYTES) {
    throw new CanonicalEstimateApiError("invalid estimate photo upload request", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (replacesAttachmentId) assertUuid(replacesAttachmentId, "replacesAttachmentId");
  const { data, error } = await requester.rpc("estimate_create_row_photo_upload_r55", {
    p_idempotency_key: idempotencyKey,
    p_request_id: requestId,
    p_catalog_id: catalogId,
    p_parent_revision_id: revisionId,
    p_row_id: rowId,
    p_content_sha256: contentSha256,
    p_mime_type: mimeType,
    p_size_bytes: sizeBytes,
    p_replaces_attachment_id: replacesAttachmentId,
  });
  if (error) normalizeDbError(error);
  const upload = Array.isArray(data) ? data[0] : data;
  let uploadUrl: string | null = null;
  let uploadToken: string | null = null;
  if (upload.upload_status === "staged") {
    const { data: signed, error: signedError } = await requireAdmin().storage
      .from(upload.storage_bucket)
      .createSignedUploadUrl(upload.staging_storage_key, { upsert: false });
    if (signedError || !signed?.signedUrl || !signed?.token) {
      throw new CanonicalEstimateApiError("photo upload signing failed", {
        code: "PHOTO_UPLOAD_SIGNING_FAILED",
        httpStatus: 503,
        retryable: true,
      });
    }
    uploadUrl = signed.signedUrl;
    uploadToken = signed.token;
  }
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    uploadId: upload.upload_id,
    attachmentId: upload.attachment_id,
    status: upload.upload_status,
    storageBucket: upload.storage_bucket,
    storageObjectKey: upload.staging_storage_key,
    uploadUrl,
    uploadToken,
    expiresAt: upload.expires_at,
    created: upload.created,
  };
}

function photoAttachmentView(row: Record<string, unknown>) {
  return {
    attachmentId: row.attachment_id,
    attachmentEventId: row.attachment_event_id,
    tenantId: row.tenant_id,
    ownerUserId: row.owner_user_id,
    requestId: row.request_id,
    catalogId: row.catalog_id,
    rowId: row.row_id,
    parentRevisionId: row.parent_revision_id,
    childRevisionId: null,
    storageBucket: row.storage_bucket,
    storageObjectKey: row.storage_object_key,
    contentSha256: row.content_sha256,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.attachment_status,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
  };
}

async function listRevisionPhotoAttachments(
  requester: ReturnType<typeof createClient>,
  revisionId: string,
  includeDeleted = false,
) {
  assertUuid(revisionId, "revisionId");
  const { data, error } = await requester.rpc("estimate_list_revision_photo_attachments_r55", {
    p_revision_id: revisionId,
    p_include_deleted: includeDeleted,
  });
  if (error) normalizeDbError(error);
  const admin = requireAdmin();
  const expiresAt = new Date(Date.now() + PHOTO_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const attachments = await Promise.all((data ?? []).map(async (row) => {
    const view = photoAttachmentView(row);
    if (view.status !== "committed") return { ...view, signedUrl: null, signedUrlExpiresAt: null };
    const { data: signed, error: signError } = await admin.storage
      .from(String(view.storageBucket))
      .createSignedUrl(String(view.storageObjectKey), PHOTO_SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      throw new CanonicalEstimateApiError("photo signing failed", {
        code: "PHOTO_SIGNING_FAILED",
        httpStatus: 503,
        retryable: true,
      });
    }
    return { ...view, signedUrl: signed.signedUrl, signedUrlExpiresAt: expiresAt };
  }));
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId, attachments };
}

async function finalizeRevisionPhotoUpload(
  requester: ReturnType<typeof createClient>,
  userId: string,
  revisionId: string,
  uploadId: string,
) {
  assertUuid(revisionId, "revisionId");
  assertUuid(uploadId, "uploadId");
  const { data: reservation, error: reservationError } = await requester
    .from("estimate_revision_photo_upload")
    .select("id,attachment_id,parent_revision_id,status,staging_storage_bucket,staging_storage_key,committed_storage_key,expected_content_sha256,expected_mime_type,expected_size_bytes")
    .eq("id", uploadId)
    .eq("parent_revision_id", revisionId)
    .single();
  if (reservationError) normalizeDbError(reservationError);
  if (reservation.status === "committed") {
    const projection = await listRevisionPhotoAttachments(requester, revisionId, false);
    const attachment = projection.attachments.find((candidate) => candidate.attachmentId === reservation.attachment_id)
      ?? projection.attachments.find((candidate) => candidate.parentRevisionId === revisionId);
    if (!attachment) throw new CanonicalEstimateApiError("committed photo projection is missing", {
      code: "PHOTO_ATTACHMENT_PROJECTION_MISSING",
      httpStatus: 409,
    });
    return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, attachment, created: false };
  }
  if (reservation.status !== "staged") {
    throw new CanonicalEstimateApiError("photo upload is not finalizable", {
      code: "PHOTO_UPLOAD_NOT_FINALIZABLE",
      httpStatus: 409,
    });
  }
  const admin = requireAdmin();
  const bucket = admin.storage.from(reservation.staging_storage_bucket);
  const { data: blob, error: downloadError } = await bucket.download(reservation.staging_storage_key);
  if (downloadError || !blob) {
    throw new CanonicalEstimateApiError("uploaded photo object is unavailable", {
      code: "PHOTO_UPLOAD_OBJECT_MISSING",
      httpStatus: 409,
      retryable: true,
    });
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const verifiedMimeType = photoMimeFromBytes(bytes);
  const verifiedContentSha256 = await sha256Bytes(bytes);
  if (bytes.byteLength !== Number(reservation.expected_size_bytes)
    || verifiedContentSha256 !== reservation.expected_content_sha256
    || verifiedMimeType !== reservation.expected_mime_type) {
    await bucket.remove([reservation.staging_storage_key]).catch(() => undefined);
    throw new CanonicalEstimateApiError("uploaded photo integrity mismatch", {
      code: "PHOTO_UPLOAD_INTEGRITY_MISMATCH",
      httpStatus: 422,
    });
  }
  const { error: moveError } = await bucket.move(
    reservation.staging_storage_key,
    reservation.committed_storage_key,
  );
  if (moveError) {
    throw new CanonicalEstimateApiError("photo object commit failed", {
      code: "PHOTO_UPLOAD_OBJECT_COMMIT_FAILED",
      httpStatus: 503,
      retryable: true,
    });
  }
  try {
    const { data, error } = await admin.rpc("estimate_finalize_row_photo_upload_r55", {
      p_actor_user_id: userId,
      p_upload_id: uploadId,
      p_committed_storage_key: reservation.committed_storage_key,
      p_verified_content_sha256: verifiedContentSha256,
      p_verified_mime_type: verifiedMimeType,
      p_verified_size_bytes: bytes.byteLength,
    });
    if (error) normalizeDbError(error);
    const finalized = Array.isArray(data) ? data[0] : data;
    const attachment = photoAttachmentView(finalized);
    const { data: signed, error: signError } = await bucket.createSignedUrl(
      reservation.committed_storage_key,
      PHOTO_SIGNED_URL_TTL_SECONDS,
    );
    if (signError || !signed?.signedUrl) {
      throw new CanonicalEstimateApiError("photo signing failed", {
        code: "PHOTO_SIGNING_FAILED",
        httpStatus: 503,
        retryable: true,
      });
    }
    return {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      attachment: {
        ...attachment,
        signedUrl: signed.signedUrl,
        signedUrlExpiresAt: new Date(Date.now() + PHOTO_SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      },
      created: finalized.created,
    };
  } catch (error) {
    const { data: latest } = await admin
      .from("estimate_revision_photo_upload")
      .select("status")
      .eq("id", uploadId)
      .maybeSingle();
    if (latest?.status !== "committed") {
      await bucket.move(reservation.committed_storage_key, reservation.staging_storage_key).catch(() => undefined);
    }
    throw error;
  }
}

async function tombstoneRevisionPhotoAttachment(
  request: Request,
  requester: ReturnType<typeof createClient>,
  attachmentId: string,
) {
  assertUuid(attachmentId, "attachmentId");
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = String(body?.idempotencyKey ?? request.headers.get("x-idempotency-key") ?? "").trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new CanonicalEstimateApiError("idempotencyKey is required", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const { data, error } = await requester.rpc("estimate_tombstone_row_photo_attachment_r55", {
    p_attachment_id: attachmentId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) normalizeDbError(error);
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, attachmentId, attachmentEventId: data, status: "deleted" };
}

async function readArtifact(
  request: Request,
  requester: ReturnType<typeof createClient>,
  revisionId: string,
  publicKind: "pdf" | "professional_pdf" | "procurement",
) {
  assertUuid(revisionId, "revisionId");
  const documentProfile = String(new URL(request.url).searchParams.get("documentProfile") ?? "").trim();
  if (documentProfile && documentProfile !== "professional_v1") {
    throw new CanonicalEstimateApiError("unsupported PDF document profile", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  if (documentProfile && publicKind !== "pdf") {
    throw new CanonicalEstimateApiError("documentProfile is only valid for PDF", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const kind = publicKind === "pdf" && documentProfile === "professional_v1"
    ? "professional_pdf"
    : publicKind;
  const { data, error } = await requester
    .from("estimate_revision_artifact")
    .select("id,revision_id,artifact_kind,status,storage_bucket,storage_key,content_type,byte_size,sha256,metadata,error_code,expires_at,created_at,updated_at,ready_at")
    .eq("revision_id", revisionId)
    .eq("artifact_kind", kind)
    .single();
  if (error) normalizeDbError(error);
  const { data: revision, error: revisionError } = await requester
    .from("estimate_revision")
    .select("id,release_id,catalog_id,definition_version_id,row_count,checksum_sha256,owner_user_id,organization_id")
    .eq("id", revisionId)
    .single();
  if (revisionError) normalizeDbError(revisionError);
  const contentAdmission = legacyReadAdmission(revision, "artifact_read", true);
  if (!contentAdmission.allowed) {
    throw new CanonicalEstimateApiError("historical artifact is unavailable", {
      code: contentAdmission.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED",
      httpStatus: 409,
    });
  }
  const sourceMetadata = data.metadata ?? {};
  if (data.status === "ready" && (
    (sourceMetadata.sourceReleaseId != null && sourceMetadata.sourceReleaseId !== revision.release_id)
    || (sourceMetadata.sourceRevisionChecksumSha256 != null && sourceMetadata.sourceRevisionChecksumSha256 !== revision.checksum_sha256)
    || (sourceMetadata.sourceCatalogId != null && sourceMetadata.sourceCatalogId !== revision.catalog_id)
    || (sourceMetadata.sourceRowCount != null && Number(sourceMetadata.sourceRowCount) !== Number(revision.row_count))
    || (sourceMetadata.sourceOwnerUserId != null && sourceMetadata.sourceOwnerUserId !== revision.owner_user_id)
    || (sourceMetadata.sourceOrganizationId != null && sourceMetadata.sourceOrganizationId !== (revision.organization_id ?? null))
    || (kind === "professional_pdf" && !String(sourceMetadata.templateVersion ?? "").startsWith("professional-estimate-pdf:"))
  )) {
    throw new CanonicalEstimateApiError("artifact revision identity mismatch", {
      code: "ARTIFACT_REVISION_IDENTITY_MISMATCH",
      httpStatus: 409,
    });
  }
  const metadata = {
    ...sourceMetadata,
    ...(kind === "professional_pdf" ? { documentProfile: "professional_v1" } : {}),
    sourceCatalogId: revision.catalog_id,
    sourceRowCount: Number(revision.row_count),
    sourceReleaseId: revision.release_id,
    sourceRevisionChecksumSha256: revision.checksum_sha256,
    sourceOwnerUserId: revision.owner_user_id,
    sourceOrganizationId: revision.organization_id ?? null,
  };
  const artifactReleaseId = String(metadata.sourceReleaseId ?? "");
  const artifactRevisionChecksum = String(metadata.sourceRevisionChecksumSha256 ?? "");
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
    kind: publicKind,
    status: data.status,
    contentType: data.content_type,
    byteSize: data.byte_size == null ? null : Number(data.byte_size),
    sha256: data.sha256,
    metadata,
    contentAdmission,
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

function legacyReadAdmission(
  revision: Record<string, unknown>,
  ingress: "revision_read" | "artifact_read",
  existingExactArtifact = false,
): AdmissionDecision {
  return evaluateEstimateAdmission({
    mode: "legacy_read_only",
    ingress,
    releaseId: String(revision.release_id ?? "") || null,
    definitionVersionId: String(revision.definition_version_id ?? "") || null,
    catalogId: String(revision.catalog_id ?? "") || null,
    releaseStatus: null,
    manifestPublicationState: null,
    baselineReady: false,
    scenarioReady: false,
    definitionContentStatus: null,
    contentGateStatus: null,
    definitionReleaseId: null,
    selectedSearchReleaseId: null,
    definitionSearchReleaseId: null,
    unresolvedDisposition: null,
    authorizationValid: true,
    legacyRevisionImmutable: true,
    existingExactArtifact,
  });
}

async function readRevision(requester: ReturnType<typeof createClient>, revisionId: string) {
  assertUuid(revisionId, "revisionId");
  const { data, error } = await requester
    .from("estimate_revision")
    .select("id,parent_revision_id,release_id,catalog_id,definition_version_id,revision_number,status,input_parameters,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,definition_version,compiler_owner,parameter_schema_hash,input_hash,output_hash,created_at")
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
    definitionVersion: data.definition_version,
    compilerOwner: data.compiler_owner,
    parameterSchemaHash: data.parameter_schema_hash,
    inputHash: data.input_hash,
    outputHash: data.output_hash,
    contentAdmission: legacyReadAdmission(data, "revision_read"),
    legacyWarningRu: "Старая версия создана прежней моделью расчёта; для нового расчёта сформируйте исправленную версию.",
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
    definitionVersion: data.definition_version,
    compilerOwner: data.compiler_owner,
    parameterSchemaHash: data.parameter_schema_hash,
    inputHash: data.input_hash,
    outputHash: data.output_hash,
    contentAdmission: legacyReadAdmission(data, "revision_read"),
    legacyWarningRu: "Старая версия создана прежней моделью расчёта; для нового расчёта сформируйте исправленную версию.",
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
    .select("id,parent_revision_id,release_id,catalog_id,definition_version_id,revision_number,status,input_parameters,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,definition_version,compiler_owner,parameter_schema_hash,input_hash,output_hash,created_at")
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
  const { data: revision, error: revisionError } = await requester
    .from("estimate_revision")
    .select("id,release_id,catalog_id,definition_version_id")
    .eq("id", revisionId)
    .single();
  if (revisionError) normalizeDbError(revisionError);
  const contentAdmission = legacyReadAdmission(revision, "revision_read");
  if (!contentAdmission.allowed) {
    throw new CanonicalEstimateApiError("historical revision is unavailable", {
      code: contentAdmission.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED",
      httpStatus: 409,
    });
  }
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
    contentAdmission,
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

async function activeSearchRelease(requester: ReturnType<typeof createClient>) {
  const { data, error } = await requester
    .from("estimate_search_index_release")
    .select("id,snapshot_sha256,taxonomy_version,group_relation_version,ranking_contract_version,global_count,external_count,discovered_count")
    .eq("status", "active")
    .single();
  if (error) normalizeDbError(error);
  return data;
}

async function searchCatalog(request: Request, requester: ReturnType<typeof createClient>) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get("query") ?? "").trim().slice(0, 120);
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.replace(/\s/g, "").length < 2) {
    throw new CanonicalEstimateApiError("Введите не менее двух значимых символов.", {
      code: "SEARCH_MIN_SIGNIFICANT_CHARS",
      httpStatus: 400,
    });
  }
  const requestedLimit = Number(url.searchParams.get("pageSize") ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const filters = Object.fromEntries([
    ["domain_id", String(url.searchParams.get("domain") ?? "").trim()],
    ["group_id", String(url.searchParams.get("groupId") ?? "").trim()],
    ["operation_kind", String(url.searchParams.get("operationKind") ?? "").trim()],
  ].filter((entry) => entry[1]));
  const cursor = parseSearchCursor(url.searchParams.get("cursor"));
  const release = await activeSearchRelease(requester);
  if (cursor && (cursor.releaseId !== release.id || cursor.snapshotSha256 !== release.snapshot_sha256)) {
    throw new CanonicalEstimateApiError("Поисковый индекс обновился. Повторите запрос с первой страницы.", {
      code: "STALE_SEARCH_SNAPSHOT",
      httpStatus: 409,
      retryable: true,
    });
  }
  const { data, error } = await requester.rpc("estimate_search_catalog_r2", {
    p_query: query,
    p_filters: filters,
    p_after_order_key: cursor?.orderKey ?? null,
    p_limit: limit,
  });
  if (error) normalizeDbError(error);
  const rows = data ?? [];
  const admissions = await productionAdmissionDecisions(
    requester,
    rows.map((row) => row.catalog_id),
    "search_selectable",
  );
  const literalTotalCount = Number(rows[0]?.literal_total_count ?? 0);
  const globalLiteralTotalCount = Number(rows[0]?.global_literal_total_count ?? literalTotalCount);
  const externalLiteralTotalCount = Number(rows[0]?.external_literal_total_count ?? 0);
  const suggestionTotalCount = Number(rows[0]?.suggestion_total_count ?? 0);
  const shownCount = (cursor?.shown ?? 0) + rows.length;
  const completeCount = literalTotalCount + suggestionTotalCount;
  const last = rows[rows.length - 1];
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    searchIndexReleaseId: release.id,
    searchIndexSnapshotSha256: release.snapshot_sha256,
    taxonomyVersion: release.taxonomy_version,
    groupRelationVersion: release.group_relation_version,
    rankingContractVersion: release.ranking_contract_version,
    resultSetSha256: rows[0]?.result_set_sha256 ?? await sha256([]),
    normalizedQuery,
    filters,
    literalTotalCount,
    globalLiteralTotalCount,
    externalLiteralTotalCount,
    suggestionTotalCount,
    shownCount,
    items: rows.map((row) => {
      const contentAdmission = admissions.get(row.catalog_id) ?? null;
      const estimateReady = contentAdmission?.allowed === true;
      return {
      catalogId: row.catalog_id,
      canonicalNameRu: row.canonical_name_ru,
      groupId: row.group_id,
      groupNameRu: row.group_name_ru,
      domainId: row.domain_id,
      systemId: row.system_id,
      subsystemId: row.subsystem_id,
      assemblyId: row.assembly_id,
      workFamilyId: row.work_family_id,
      elementType: row.element_type,
      operationKind: row.operation_kind,
      technologyVariant: row.technology_variant,
      primaryUom: row.primary_uom,
      publicationState: row.publication_state,
      catalogOrigin: row.catalog_origin,
      shortScopeRu: row.short_scope_ru,
      keyDistinguishingParameters: row.key_distinguishing_parameters,
      requiredInputsCount: row.required_inputs_count,
      clarificationFields: row.clarification_fields,
      includedBoundaries: row.included_boundaries,
      excludedBoundaries: row.excluded_boundaries,
      replacementCatalogId: row.replacement_catalog_id,
      matchTier: row.match_tier,
      matchType: row.match_type,
      matchedTerm: row.matched_term,
      matchedField: row.matched_field,
      rankingReasonRu: row.ranking_reason_ru,
      estimateReady,
      contentAdmission,
      selectableMode: estimateReady ? "PROFESSIONAL"
        : row.publication_state === "PRELIMINARY_NOT_CANONICAL" ? "PRELIMINARY" : "NONE",
      nonselectableReasonRu: !estimateReady && row.publication_state === "ADMITTED_BACKEND"
        ? "Эта смета проходит обновление состава и временно недоступна для нового расчёта."
        : row.publication_state === "RETIRED"
        ? "Работа выведена из актуального каталога; используйте указанную замену."
        : null,
      };
    }),
    nextCursor: last && shownCount < completeCount ? base64UrlJson({
      releaseId: release.id,
      snapshotSha256: release.snapshot_sha256,
      orderKey: last.order_key,
      shown: shownCount,
    }) : null,
  };
}

async function listSearchGroup(request: Request, requester: ReturnType<typeof createClient>, rawGroupId: string) {
  const groupId = decodeURIComponent(rawGroupId);
  if (!groupId || groupId.length > 240) throw new CanonicalEstimateApiError("invalid groupId", {
    code: "INVALID_ARGUMENT",
    httpStatus: 400,
  });
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("pageSize") ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const cursor = parseSearchCursor(url.searchParams.get("cursor"));
  const release = await activeSearchRelease(requester);
  if (cursor && (cursor.releaseId !== release.id || cursor.snapshotSha256 !== release.snapshot_sha256)) {
    throw new CanonicalEstimateApiError("Поисковый индекс обновился. Откройте группу заново.", {
      code: "STALE_SEARCH_SNAPSHOT",
      httpStatus: 409,
      retryable: true,
    });
  }
  const afterOrdinal = cursor ? Number(cursor.orderKey) : null;
  if (afterOrdinal != null && !Number.isSafeInteger(afterOrdinal)) {
    throw new CanonicalEstimateApiError("invalid group cursor", { code: "INVALID_CURSOR", httpStatus: 400 });
  }
  const { data, error } = await requester.rpc("estimate_list_search_group_r2", {
    p_group_id: groupId,
    p_after_ordinal: afterOrdinal,
    p_limit: limit,
  });
  if (error) normalizeDbError(error);
  const rows = data ?? [];
  const admissions = await productionAdmissionDecisions(
    requester,
    rows.map((row) => row.catalog_id),
    "search_selectable",
  );
  if (rows.length === 0 && !cursor) throw new CanonicalEstimateApiError("search group not found", {
    code: "NOT_FOUND",
    httpStatus: 404,
  });
  const totalCount = Number(rows[0]?.member_count ?? 0);
  const shownCount = (cursor?.shown ?? 0) + rows.length;
  const last = rows[rows.length - 1];
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    searchIndexReleaseId: release.id,
    searchIndexSnapshotSha256: release.snapshot_sha256,
    taxonomyVersion: release.taxonomy_version,
    groupRelationVersion: release.group_relation_version,
    groupId,
    groupNameRu: rows[0]?.group_name_ru ?? "",
    totalCount,
    shownCount,
    items: rows.map((row) => ({
      catalogId: row.catalog_id,
      canonicalNameRu: row.canonical_name_ru,
      publicationState: row.publication_state,
      catalogOrigin: row.catalog_origin,
      operationKind: row.operation_kind,
      technologyVariant: row.technology_variant,
      estimateReady: admissions.get(row.catalog_id)?.allowed === true,
      contentAdmission: admissions.get(row.catalog_id) ?? null,
    })),
    nextCursor: last && shownCount < totalCount ? base64UrlJson({
      releaseId: release.id,
      snapshotSha256: release.snapshot_sha256,
      orderKey: String(last.ordinal),
      shown: shownCount,
    }) : null,
  };
}

async function listTypedRelations(requester: ReturnType<typeof createClient>, rawCatalogId: string) {
  const catalogId = decodeURIComponent(rawCatalogId);
  if (!catalogId || catalogId.length > 240) throw new CanonicalEstimateApiError("invalid catalogId", {
    code: "INVALID_ARGUMENT",
    httpStatus: 400,
  });
  const release = await activeSearchRelease(requester);
  const { data, error } = await requester
    .from("estimate_search_typed_relation")
    .select("source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256")
    .eq("search_release_id", release.id)
    .eq("source_catalog_id", catalogId)
    .order("relationship_type", { ascending: true })
    .order("target_catalog_id", { ascending: true });
  if (error) normalizeDbError(error);
  const targetIds = [...new Set((data ?? []).map((row) => row.target_catalog_id))];
  const { data: targets, error: targetError } = targetIds.length
    ? await requester
      .from("estimate_search_document")
      .select("catalog_id,canonical_name_ru")
      .eq("search_release_id", release.id)
      .in("catalog_id", targetIds)
    : { data: [], error: null };
  if (targetError) normalizeDbError(targetError);
  const targetNameById = new Map((targets ?? []).map((row) => [row.catalog_id, row.canonical_name_ru]));
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    searchIndexReleaseId: release.id,
    groupRelationVersion: release.group_relation_version,
    items: (data ?? []).map((row) => ({
      sourceCatalogId: row.source_catalog_id,
      targetCatalogId: row.target_catalog_id,
      targetCanonicalNameRu: targetNameById.get(row.target_catalog_id) ?? "",
      relationshipType: row.relationship_type,
      direction: row.direction,
      sourceLocator: row.source_locator,
      applicabilityPredicate: row.applicability_predicate,
      requiredWhen: row.required_when,
      mutuallyExclusiveWith: row.mutually_exclusive_with,
      explanationRu: row.explanation_ru,
      relationSha256: row.relation_sha256,
    })),
  };
}

function draftView(row: Record<string, unknown>) {
  return {
    draftId: row.id,
    status: row.status,
    title: row.title,
    originalQuery: row.original_query,
    normalizedQuery: row.normalized_query,
    searchIndexReleaseId: row.search_index_release_id,
    taxonomyVersion: row.taxonomy_version,
    groupRelationVersion: row.group_relation_version,
    searchResultSetHash: row.search_result_set_hash,
    candidateSetHash: row.candidate_set_hash,
    selectedResultHash: row.selected_result_hash,
    selectedCatalogIds: row.selected_catalog_ids,
    selectedWorkOrder: row.selected_work_order,
    parameterSchemaVersions: row.parameter_schema_versions,
    typedInputs: row.typed_inputs,
    unresolvedRequiredParameters: row.unresolved_required_parameters,
    conflicts: row.conflicts,
    latestRevisionId: row.latest_revision_id,
    optimisticVersion: Number(row.optimistic_version),
    lastDeviceId: row.last_device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertSearchSelection(
  requester: ReturnType<typeof createClient>,
  releaseId: string,
  selectedCatalogIds: unknown,
) {
  if (!Array.isArray(selectedCatalogIds) || selectedCatalogIds.some((value) => typeof value !== "string" || !value.trim())) {
    throw new CanonicalEstimateApiError("selectedCatalogIds must contain catalog IDs", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const uniqueIds = [...new Set(selectedCatalogIds.map((value) => String(value).trim()))];
  if (uniqueIds.length !== selectedCatalogIds.length || uniqueIds.length > 50) {
    throw new CanonicalEstimateApiError("selected catalog IDs must be unique and limited to 50", {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  if (uniqueIds.length === 0) return uniqueIds;
  const { data, error } = await requester
    .from("estimate_search_document")
    .select("catalog_id,publication_state")
    .eq("search_release_id", releaseId)
    .in("catalog_id", uniqueIds);
  if (error) normalizeDbError(error);
  if ((data ?? []).length !== uniqueIds.length || (data ?? []).some((row) => row.publication_state === "RETIRED")) {
    throw new CanonicalEstimateApiError("selection contains unknown or retired catalog IDs", {
      code: "INVALID_SEARCH_SELECTION",
      httpStatus: 409,
    });
  }
  const admissions = await productionAdmissionDecisions(requester, uniqueIds, "search_selectable");
  if (uniqueIds.some((catalogId) => admissions.get(catalogId)?.allowed !== true)) {
    throw new CanonicalEstimateApiError(
      "Эта смета проходит обновление состава и временно недоступна для нового расчёта.",
      { code: "ESTIMATE_ADMISSION_DENIED", httpStatus: 409 },
    );
  }
  return uniqueIds;
}

async function createDraft(request: Request, requester: ReturnType<typeof createClient>) {
  const body = await request.json();
  const originalQuery = String(body.originalQuery ?? "").trim().slice(0, 2_000);
  if (significantSearchLength(originalQuery) < 2) throw new CanonicalEstimateApiError("draft query requires two significant characters", {
    code: "SEARCH_MIN_SIGNIFICANT_CHARS",
    httpStatus: 400,
  });
  const release = await activeSearchRelease(requester);
  if (body.searchIndexReleaseId && body.searchIndexReleaseId !== release.id) {
    throw new CanonicalEstimateApiError("search result belongs to a stale index", {
      code: "STALE_SEARCH_SNAPSHOT",
      httpStatus: 409,
      retryable: true,
    });
  }
  const selectedCatalogIds = await assertSearchSelection(requester, release.id, body.selectedCatalogIds ?? []);
  const resultSetHash = body.searchResultSetHash == null ? null : String(body.searchResultSetHash);
  if (resultSetHash != null && !/^[0-9a-f]{64}$/u.test(resultSetHash)) {
    throw new CanonicalEstimateApiError("searchResultSetHash is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const { data, error } = await requester.from("estimate_draft").insert({
    status: selectedCatalogIds.length ? "DRAFT_INPUT_REQUIRED" : "SEARCHING",
    title: String(body.title ?? originalQuery).trim().slice(0, 500),
    original_query: originalQuery,
    normalized_query: normalizeSearchQuery(originalQuery),
    search_filters: body.searchFilters && typeof body.searchFilters === "object" ? body.searchFilters : {},
    search_index_release_id: release.id,
    taxonomy_version: release.taxonomy_version,
    group_relation_version: release.group_relation_version,
    search_result_set_hash: resultSetHash,
    candidate_set_hash: resultSetHash,
    selected_result_hash: selectedCatalogIds.length ? await sha256(selectedCatalogIds) : null,
    selected_catalog_ids: selectedCatalogIds,
    selected_work_order: selectedCatalogIds,
    last_device_id: body.deviceId == null ? null : String(body.deviceId).slice(0, 200),
  }).select("*").single();
  if (error) normalizeDbError(error);
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, draft: draftView(data) };
}

async function readDraft(requester: ReturnType<typeof createClient>, rawDraftId: string) {
  const draftId = decodeURIComponent(rawDraftId);
  assertUuid(draftId, "draftId");
  const { data, error } = await requester.from("estimate_draft").select("*").eq("id", draftId).single();
  if (error) normalizeDbError(error);
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, draft: draftView(data) };
}

async function applyDraftEvent(request: Request, requester: ReturnType<typeof createClient>, rawDraftId: string) {
  const draftId = decodeURIComponent(rawDraftId);
  assertUuid(draftId, "draftId");
  const body = await request.json();
  if (!Number.isSafeInteger(body.baseOptimisticVersion) || body.baseOptimisticVersion < 1
    || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()
    || typeof body.eventKind !== "string" || !body.eventKind.trim()
    || !body.patch || typeof body.patch !== "object" || Array.isArray(body.patch)) {
    throw new CanonicalEstimateApiError("invalid draft event", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  if (new TextEncoder().encode(JSON.stringify(body.patch)).byteLength > 1_048_576) {
    throw new CanonicalEstimateApiError("draft event is too large", { code: "PAYLOAD_TOO_LARGE", httpStatus: 413 });
  }
  const release = await activeSearchRelease(requester);
  const patch = { ...body.patch };
  if (Object.prototype.hasOwnProperty.call(patch, "selected_catalog_ids")) {
    const selectedIds = await assertSearchSelection(requester, release.id, patch.selected_catalog_ids);
    patch.selected_catalog_ids = selectedIds;
    patch.selected_work_order = selectedIds;
    patch.selected_result_hash = await sha256(selectedIds);
  }
  const { data, error } = await requester.rpc("estimate_apply_draft_event_r2", {
    p_draft_id: draftId,
    p_idempotency_key: body.idempotencyKey,
    p_base_optimistic_version: body.baseOptimisticVersion,
    p_event_kind: String(body.eventKind).slice(0, 120),
    p_patch: patch,
    p_device_id: body.deviceId == null ? null : String(body.deviceId).slice(0, 200),
  });
  if (error) normalizeDbError(error);
  return { apiVersion: ESTIMATE_PLATFORM_API_VERSION, draft: draftView(data) };
}

async function readCatalogItem(requester: ReturnType<typeof createClient>, rawCatalogId: string) {
  const catalogId = decodeURIComponent(rawCatalogId);
  if (!catalogId || catalogId.length > 240) throw new CanonicalEstimateApiError("invalid catalogId", {
    code: "INVALID_ARGUMENT",
    httpStatus: 400,
  });
  const contentAdmission = await assertProductionAdmission(requester, catalogId, "catalog_read");
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
    .select("parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json,truth_metadata")
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
      contentAdmission,
      parameterSchema: parameters.map((parameter) => {
        const truth = parameter.truth_metadata && typeof parameter.truth_metadata === "object"
          ? parameter.truth_metadata as Record<string, unknown>
          : {};
        return {
          parameterId: parameter.parameter_id,
          ordinal: parameter.ordinal,
          valueType: parameter.value_type,
          unitId: parameter.unit_id,
          titleRu: parameter.title_ru,
          required: parameter.required,
          defaultValue: parameter.default_value,
          constraints: parameter.constraints_json,
          semanticParameterKey: truth.semantic_parameter_key,
          visibilityRole: truth.visibility_role,
          descriptionRu: truth.description_ru,
          requiredWhen: truth.required_when,
          visibleWhen: truth.visible_when,
          allowedRangeOrOptions: truth.allowed_range_or_options,
          defaultPolicy: truth.default_policy,
          valueSourceRole: truth.value_source_role,
          guide: parameterGuideView(truth.guide),
          compositeItemSchema: truth.composite_item_schema && typeof truth.composite_item_schema === "object" ? {
            itemLabelRu: truth.composite_item_schema.item_label_ru,
            minimumItems: truth.composite_item_schema.minimum_items,
            maximumItems: truth.composite_item_schema.maximum_items,
            reorderable: truth.composite_item_schema.reorderable === true,
            subfields: Array.isArray(truth.composite_item_schema.subfields)
              ? truth.composite_item_schema.subfields.map((subfield: Record<string, unknown>) => ({
                subfieldId: subfield.subfield_id,
                labelRu: subfield.label_ru,
                valueType: subfield.value_type,
                unitId: subfield.unit_id,
                required: subfield.required === true,
                constraints: subfield.constraints ?? {},
                guide: parameterGuideView(subfield.guide),
                formulaConsumers: subfield.formula_consumers ?? [],
                resourceBranchConsumers: subfield.resource_branch_consumers ?? [],
              }))
              : [],
          } : undefined,
          sharedInputBindingPolicy: truth.shared_input_binding_policy,
          derivedFrom: truth.derived_from,
          normativeLinks: truth.normative_links,
          formulaConsumers: truth.formula_consumers,
          resourceBranchConsumers: truth.resource_branch_consumers,
          validationRules: truth.validation_rules,
          conflictsWith: truth.conflicts_with,
          provenance: truth.provenance,
        };
      }),
    },
  };
}

export async function handleCanonicalEstimateRequest(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  try {
    const requester = requireRequester(request);
    const user = await requireUser(requester);
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
    if (request.method === "POST" && path.length === 1 && path[0] === "drafts") {
      return json(201, await createDraft(request, requester), requestId, request);
    }
    if (request.method === "GET" && path.length === 2 && path[0] === "drafts") {
      return json(200, await readDraft(requester, path[1]), requestId, request);
    }
    if (request.method === "POST" && path.length === 3 && path[0] === "drafts" && path[2] === "events") {
      return json(200, await applyDraftEvent(request, requester, path[1]), requestId, request);
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
    if (request.method === "POST" && path.length === 5 && path[0] === "revisions"
      && path[2] === "attachments" && path[3] === "photo" && path[4] === "uploads") {
      return json(201, await createRevisionPhotoUpload(request, requester, path[1]), requestId, request);
    }
    if (request.method === "POST" && path.length === 7 && path[0] === "revisions"
      && path[2] === "attachments" && path[3] === "photo" && path[4] === "uploads" && path[6] === "finalize") {
      return json(200, await finalizeRevisionPhotoUpload(requester, user.id, path[1], path[5]), requestId, request);
    }
    if (request.method === "GET" && path.length === 3 && path[0] === "revisions" && path[2] === "attachments") {
      const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "true";
      return json(200, await listRevisionPhotoAttachments(requester, path[1], includeDeleted), requestId, request);
    }
    if (request.method === "POST" && path.length === 3 && path[0] === "attachments" && path[2] === "tombstone") {
      return json(200, await tombstoneRevisionPhotoAttachment(request, requester, path[1]), requestId, request);
    }
    if (path.length === 4 && path[0] === "revisions" && path[2] === "artifacts"
      && (path[3] === "pdf" || path[3] === "professional_pdf" || path[3] === "procurement")) {
      if (request.method === "POST") {
        return json(202, await createArtifactJob(request, requester, path[1], path[3]), requestId, request);
      }
      if (request.method === "GET") {
        return json(200, await readArtifact(request, requester, path[1], path[3]), requestId, request);
      }
    }
    if (request.method === "GET" && path.length === 2 && path[0] === "search" && path[1] === "catalog") {
      return json(200, await searchCatalog(request, requester), requestId, request);
    }
    if (request.method === "GET" && path.length === 3 && path[0] === "search" && path[1] === "groups") {
      return json(200, await listSearchGroup(request, requester, path[2]), requestId, request);
    }
    if (request.method === "GET" && path.length === 4 && path[0] === "search" && path[1] === "catalog" && path[3] === "relations") {
      return json(200, await listTypedRelations(requester, path[2]), requestId, request);
    }
    if (request.method === "GET" && path.length === 1 && path[0] === "catalog") {
      return json(410, { error: { code: "LEGACY_SEARCH_ROUTE_RETIRED", message: "use server-owned /search/catalog R2" } }, requestId, request);
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
