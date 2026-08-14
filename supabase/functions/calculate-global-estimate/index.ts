/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  assertCreateRequest,
} from "../../../src/lib/estimate/backendPlatform/contracts.ts";

function corsHeaders(request: Request): Record<string, string> {
  const base = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const origin = String(request.headers.get("Origin") ?? "").trim();
  if (!origin) return base;
  const allowed = new Set(String(Deno.env.get("ESTIMATE_ALLOWED_ORIGINS") ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
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
      ...(status === 202 ? { "Retry-After": "1" } : {}),
    },
  },
);

function requester(request: Request) {
  const url = String(Deno.env.get("SUPABASE_URL") ?? "").trim();
  const anonKey = String(Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  const authorization = String(request.headers.get("Authorization") ?? "").trim();
  if (!url || !anonKey) {
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
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization, apikey: anonKey } },
  });
}

async function requireUser(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new CanonicalEstimateApiError("authentication required", {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  return data.user;
}

function normalizeDbError(error: { code?: string } | null): never {
  const code = String(error?.code ?? "");
  if (code === "42501") throw new CanonicalEstimateApiError("access denied", { code: "ACCESS_DENIED", httpStatus: 403 });
  if (code === "22023") throw new CanonicalEstimateApiError("estimate request is invalid", { code: "INVALID_ARGUMENT", httpStatus: 400 });
  if (code === "23505") throw new CanonicalEstimateApiError("idempotency conflict", { code: "IDEMPOTENCY_CONFLICT", httpStatus: 409 });
  throw new CanonicalEstimateApiError("estimate backend operation failed", {
    code: "BACKEND_OPERATION_FAILED",
    httpStatus: 503,
    retryable: true,
  });
}

/**
 * Compatibility ingress for callers that historically used
 * `calculate-global-estimate`. It no longer owns a compiler: the result is a
 * canonical backend job tied to the active immutable definition release.
 */
export async function calculateEstimateForRequest(
  raw: Record<string, unknown>,
  client: ReturnType<typeof createClient>,
) {
  const catalogId = String(raw.catalogId ?? raw.explicitTemplateId ?? "").trim();
  if (!catalogId) {
    throw new CanonicalEstimateApiError(
      "Select an exact canonical catalog_id before calculation; work-key inference is not a revision contract.",
      { code: "CANONICAL_CATALOG_ID_REQUIRED", httpStatus: 422 },
    );
  }
  const request = {
    idempotencyKey: String(raw.idempotencyKey ?? "").trim(),
    catalogId,
    organizationId: raw.organizationId ?? null,
    parameters: raw.parameters ?? {},
    currencyCode: String(raw.currencyCode ?? raw.currency ?? "KGS").toUpperCase(),
    priceSnapshotIds: raw.priceSnapshotIds ?? [],
  };
  assertCreateRequest(request);
  const { data, error } = await client.rpc("estimate_create_compile_job_v1", {
    p_idempotency_key: request.idempotencyKey,
    p_operation: "compile",
    p_catalog_id: request.catalogId,
    p_parent_revision_id: null,
    p_organization_id: request.organizationId,
    p_input_payload: {
      parameters: request.parameters,
      currencyCode: request.currencyCode,
      priceSnapshotIds: request.priceSnapshotIds,
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      ingress: "calculate-global-estimate-canonical-r2",
    },
  });
  if (error) normalizeDbError(error);
  const job = Array.isArray(data) ? data[0] : data;
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    backendCanonical: true,
    catalogId,
    jobId: job.job_id,
    status: job.job_status,
    created: job.created,
    pollAfterMs: 750,
  };
}

async function handler(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(405, { error: { code: "METHOD_NOT_ALLOWED" } }, requestId, request);
  try {
    const client = requester(request);
    await requireUser(client);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new CanonicalEstimateApiError("request body must be an object", { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    return json(202, await calculateEstimateForRequest(body, client), requestId, request);
  } catch (error) {
    if (error instanceof CanonicalEstimateApiError) {
      return json(error.httpStatus, { error: { code: error.code, message: error.message, retryable: error.retryable } }, requestId, request);
    }
    return json(500, { error: { code: "INTERNAL_ERROR", message: "estimate request failed" } }, requestId, request);
  }
}

Deno.serve(handler);
