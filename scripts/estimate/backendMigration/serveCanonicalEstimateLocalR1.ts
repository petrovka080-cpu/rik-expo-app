import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { dirname, resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { chromium, type Browser } from "playwright";

import { evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  bindCanonicalEstimateResourcePriceKeys,
  canonicalRoundDecimal,
  compileCanonicalEstimateCore,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION,
  CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION,
  buildCanonicalRevisionCommitPayload,
  buildCanonicalRevisionIdentity,
  canonicalDefinitionTitleRu,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter";
import {
  buildCanonicalArtifactMetadata,
  buildCanonicalProcurementProjection,
  canonicalProfessionalArtifactMetadataIdentityMatches,
  selectCanonicalArtifactRows,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import {
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  buildCanonicalProfessionalPdfProjection,
} from "../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";
import {
  buildCanonicalEstimateRegistryEntry,
  CanonicalEstimateDefinitionRegistry,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry";
import {
  evaluateEstimateAdmission,
  persistedAdmissionDecision,
  type AdmissionDecision,
  type EstimateAdmissionIngress,
  type EstimateAdmissionMode,
  type IsolatedCandidateCapability,
} from "../../../src/lib/estimate/backendPlatform/estimateAdmissionR3";
import { canonicalEstimateCandidateAdmissionIdempotencyKey } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCommandIdentity";
import { normalizePublicBoqNameRu } from "../../../src/lib/estimate/publicBoqNaming";
import {
  isGenericPublicBoqResourceName,
  isPublicBoqNameStructurallyValid,
} from "../../../src/lib/estimate/semanticBoqGate";

const API_VERSION = "2026-08-14.r2";
const COMPILER_VERSION = "canonical-estimate-local-runtime.r6";
type LocalAuthMode = "DETERMINISTIC_FIXTURE" | "STRICT_SESSION_INTROSPECTION";
const LOCAL_AUTH_MODE_INPUT = String(
  process.env.CANONICAL_ESTIMATE_LOCAL_AUTH_MODE ?? "",
)
  .trim()
  .toUpperCase();
if (
  LOCAL_AUTH_MODE_INPUT !== "DETERMINISTIC_FIXTURE" &&
  LOCAL_AUTH_MODE_INPUT !== "STRICT_SESSION_INTROSPECTION"
) {
  throw new Error("CANONICAL_ESTIMATE_LOCAL_AUTH_MODE_INVALID");
}
const LOCAL_AUTH_MODE = LOCAL_AUTH_MODE_INPUT as LocalAuthMode;
const FIXTURE_CONFIG =
  LOCAL_AUTH_MODE === "DETERMINISTIC_FIXTURE"
    ? {
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        tenantId:
          process.env.CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID ??
          "22222222-2222-4222-8222-222222222222",
        membershipId: "33333333-3333-4333-8333-333333333333",
        role: "fixture",
        bearerTokens: new Set([
          "local-dev-runtime-token",
          "local-r45-proof",
          "local-r45-web-manifest",
          "local-r54-exact15-proof",
          "local-r58-cumulative-proof",
        ]),
      }
    : null;
const SUPABASE_AUTH_URL = String(
  process.env.CANONICAL_ESTIMATE_SUPABASE_AUTH_URL ?? "",
)
  .trim()
  .replace(/\/$/u, "");
const SUPABASE_AUTH_API_KEY = String(
  process.env.CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY ?? "",
).trim();
const SUPABASE_PRINCIPAL_RPC = String(
  process.env.CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC ?? "",
).trim();
const SUPABASE_PRINCIPAL_RPC_RE = /^[a-z][a-z0-9_]{0,62}$/u;
if (
  LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION" &&
  (!SUPABASE_AUTH_URL ||
    !SUPABASE_AUTH_API_KEY ||
    !SUPABASE_PRINCIPAL_RPC_RE.test(SUPABASE_PRINCIPAL_RPC))
) {
  throw new Error("CANONICAL_ESTIMATE_SUPABASE_INTROSPECTION_CONFIG_REQUIRED");
}
const TARGET_RELEASE_ID = String(
  process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID ?? "",
).trim();
const CONTENT_ADMISSION_RELEASE_ID = String(
  process.env.CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID ??
    TARGET_RELEASE_ID,
).trim();
const ALLOW_PREPARED_RELEASE_COMPILE =
  String(
    process.env.CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE ?? "false",
  )
    .trim()
    .toLowerCase() === "true";
const R3_RUNTIME_ENVIRONMENT = String(
  process.env.CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT ?? "local",
).trim();
const R3_CAPABILITY_ENVIRONMENT = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT ?? "",
).trim();
const R3_CAPABILITY_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID ?? "",
).trim();
const R3_CAPABILITY_TENANT_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID ?? "",
).trim();
const R3_CAPABILITY_TENANT_BINDING = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING ?? "fixed",
)
  .trim()
  .toLowerCase();
if (
  !new Set(["fixed", "request-principal"]).has(R3_CAPABILITY_TENANT_BINDING) ||
  (R3_CAPABILITY_TENANT_BINDING === "request-principal" &&
    LOCAL_AUTH_MODE !== "STRICT_SESSION_INTROSPECTION")
) {
  throw new Error(
    "CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING_INVALID",
  );
}
const R3_CAPABILITY_RELEASE_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID ?? "",
).trim();
const R3_CAPABILITY_SEARCH_RELEASE_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID ?? "",
).trim();
const R3_CAPABILITY_EXPIRES_AT = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT ?? "",
).trim();
const R3_CAPABILITY_PURPOSE = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE ?? "",
).trim();
const R3_CAPABILITY_SOURCE_HEAD = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD ?? "",
).trim();
const R3_CAPABILITY_SOURCE_TREE = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE ?? "",
).trim();
const ADMISSION_RUN_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID ?? "",
).trim();
const ADMISSION_DOMAIN_ID = String(
  process.env.CANONICAL_ESTIMATE_ADMISSION_DOMAIN_ID ?? "",
).trim();
const CUMULATIVE_MANIFEST_MODE =
  String(process.env.CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST ?? "").trim() ===
  "true";
const PORT = Number(process.env.CANONICAL_ESTIMATE_LOCAL_PORT ?? 8765);
const DATABASE_URL =
  process.env.ESTIMATE_MIGRATION_DATABASE_URL ??
  "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const SEARCH_DATABASE_URL =
  process.env.CANONICAL_ESTIMATE_SEARCH_DATABASE_URL ?? DATABASE_URL;
const TARGET_SEARCH_RELEASE_ID = String(
  process.env.CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID ?? "",
).trim();
const MODEL_DATABASE_URLS = [...new Set([DATABASE_URL, SEARCH_DATABASE_URL])];
const LOCAL_DATABASE_POOL_MAX = Number(
  process.env.CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX ?? 8,
);
if (
  !Number.isInteger(LOCAL_DATABASE_POOL_MAX) ||
  LOCAL_DATABASE_POOL_MAX < 1 ||
  LOCAL_DATABASE_POOL_MAX > 16
) {
  throw new Error("CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX_INVALID");
}
const databasePools = new Map<string, Pool>();
const databaseConnectionAudit = {
  totalCheckouts: 0,
  activeCheckouts: 0,
  maximumActiveCheckouts: 0,
};
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 2_000;
const ARTIFACT_ROOT = resolve(
  ".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts",
);
const PHOTO_OBJECT_ROOT = resolve(
  ".release-runtime/master11610-backend-canonical-r1/05-runtime/local-photo-objects",
);
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const REQUEST_AUDIT_LOG = String(
  process.env.CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG ?? "",
).trim();
const R45_RUNTIME_STARTED_AT = new Date().toISOString();
const R45_RUNTIME_SOURCE_HEAD = String(
  process.env.R45_RUNTIME_SOURCE_HEAD ?? "UNSET",
).trim();
const R45_RUNTIME_SOURCE_TREE = String(
  process.env.R45_RUNTIME_SOURCE_TREE ?? "UNSET",
).trim();
const R45_RUNTIME_SPEC_SHA256 = String(
  process.env.R45_RUNTIME_SPEC_SHA256 ??
    "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa",
).trim();
const R568_FRONTEND_SOURCE_TREE_HASH = String(
  process.env.R568_FRONTEND_SOURCE_TREE_HASH ?? R45_RUNTIME_SOURCE_TREE,
).trim();
const R568_FRONTEND_PRODUCT_SOURCE_HASH = String(
  process.env.R568_FRONTEND_PRODUCT_SOURCE_HASH ?? "UNSET",
).trim();
const R568_FRONTEND_JS_BUNDLE_FINGERPRINT = String(
  process.env.R568_FRONTEND_JS_BUNDLE_FINGERPRINT ?? "UNSET",
).trim();
const R568_FRONTEND_BUILD_COMMIT = String(
  process.env.R568_FRONTEND_BUILD_COMMIT ?? R45_RUNTIME_SOURCE_HEAD,
).trim();
const CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256 = String(
  process.env.CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256 ?? "UNSET",
).trim();
const CONFIGURED_ARTIFACT_TOKEN_SECRET = String(
  process.env.CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET ?? "",
).trim();
if (
  LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION" &&
  !CONFIGURED_ARTIFACT_TOKEN_SECRET
) {
  throw new Error("CANONICAL_ESTIMATE_STRICT_ARTIFACT_SECRET_REQUIRED");
}
const ARTIFACT_TOKEN_SECRET =
  CONFIGURED_ARTIFACT_TOKEN_SECRET ||
  `local-artifact:${R45_RUNTIME_SOURCE_HEAD}:${FIXTURE_CONFIG!.ownerUserId}`;
const LOCAL_AUTHENTICATED_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LOCAL_AUTHENTICATED_ROLE_RE = /^[a-z][a-z0-9_-]{0,63}$/u;
let artifactBrowserPromise: Promise<Browser> | null = null;
let artifactBrowserInstance: Browser | null = null;

type JsonRecord = Record<string, unknown>;
type LocalPrincipal = {
  ownerUserId: string;
  tenantId: string;
  membershipId: string;
  role: string;
  sessionReference: string;
  correlationId: string;
  authMode: LocalAuthMode;
};

const requestPrincipalStorage = new AsyncLocalStorage<LocalPrincipal>();

function currentPrincipal(): LocalPrincipal {
  const principal = requestPrincipalStorage.getStore();
  if (principal) return principal;
  if (LOCAL_AUTH_MODE === "DETERMINISTIC_FIXTURE") {
    return fixturePrincipal("fixture-request-context");
  }
  throw Object.assign(new Error("request principal is unavailable"), {
    code: "AUTH_REQUIRED",
    httpStatus: 401,
  });
}

function currentOwnerId(): string {
  return currentPrincipal().ownerUserId;
}

function currentTenantId(): string {
  return currentPrincipal().tenantId;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalEstimateStableJson(value))
    .digest("hex");
}

function fixturePrincipal(sessionCredential: string): LocalPrincipal {
  if (!FIXTURE_CONFIG)
    throw new Error("CANONICAL_ESTIMATE_FIXTURE_CONFIG_UNAVAILABLE");
  return {
    ownerUserId: FIXTURE_CONFIG.ownerUserId,
    tenantId: FIXTURE_CONFIG.tenantId,
    membershipId: FIXTURE_CONFIG.membershipId,
    role: FIXTURE_CONFIG.role,
    sessionReference: sha256({ fixtureSession: sessionCredential }),
    correlationId: randomUUID(),
    authMode: "DETERMINISTIC_FIXTURE",
  };
}

function resolveRequestOrganizationId(value: unknown): string | null {
  const supplied = value == null ? "" : String(value).trim();
  if (LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION") {
    if (supplied && supplied !== currentTenantId()) {
      throw Object.assign(
        new Error(
          "organization identity does not match the authenticated tenant",
        ),
        {
          code: "AUTH_FORBIDDEN",
          httpStatus: 403,
        },
      );
    }
    return currentTenantId();
  }
  return supplied || null;
}

function send(
  response: ServerResponse,
  status: number,
  body: JsonRecord,
): void {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-idempotency-key,x-upsert",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify({ ...body, requestId: randomUUID() }));
}

async function requireLocalPrincipal(
  request: IncomingMessage,
): Promise<LocalPrincipal> {
  const authorizationValues: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (
      String(request.rawHeaders[index] ?? "").toLowerCase() === "authorization"
    ) {
      authorizationValues.push(
        String(request.rawHeaders[index + 1] ?? "").trim(),
      );
    }
  }
  if (authorizationValues.length !== 1) {
    throw Object.assign(
      new Error("exactly one authorization credential is required"),
      {
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      },
    );
  }
  const authorization = authorizationValues[0];
  const match = /^Bearer\s+([^\s,]+)$/iu.exec(authorization);
  if (!match) {
    throw Object.assign(new Error("authentication required"), {
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  }
  const token = match[1].trim();
  if (
    LOCAL_AUTH_MODE === "DETERMINISTIC_FIXTURE" &&
    FIXTURE_CONFIG!.bearerTokens.has(token)
  ) {
    return fixturePrincipal(token);
  }
  if (LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION") {
    let introspection: Response;
    try {
      introspection = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/user`, {
        method: "GET",
        headers: {
          Authorization: authorization,
          apikey: SUPABASE_AUTH_API_KEY,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw Object.assign(
        new Error("Supabase session provider is unavailable"),
        {
          code: "AUTH_PROVIDER_UNAVAILABLE",
          httpStatus: 503,
        },
      );
    }
    if (!introspection.ok) {
      const credentialRejected =
        introspection.status >= 400 &&
        introspection.status < 500 &&
        introspection.status !== 429;
      throw Object.assign(
        new Error("Supabase session is unauthorized or revoked"),
        {
          code: credentialRejected
            ? "AUTH_REQUIRED"
            : "AUTH_PROVIDER_UNAVAILABLE",
          httpStatus: credentialRejected ? 401 : 503,
        },
      );
    }
    const user = (await introspection.json()) as JsonRecord;
    const appMetadata =
      user.app_metadata && typeof user.app_metadata === "object"
        ? (user.app_metadata as JsonRecord)
        : {};
    const ownerUserId = String(user.id ?? "").trim();
    const tenantId = String(
      appMetadata.tenant_id ?? appMetadata.organization_id ?? "",
    ).trim();
    const membershipId = String(appMetadata.membership_id ?? "").trim();
    const role = String(appMetadata.role ?? "")
      .trim()
      .toLowerCase();
    if (
      !LOCAL_AUTHENTICATED_USER_ID_RE.test(ownerUserId) ||
      !LOCAL_AUTHENTICATED_USER_ID_RE.test(tenantId) ||
      !LOCAL_AUTHENTICATED_USER_ID_RE.test(membershipId) ||
      !LOCAL_AUTHENTICATED_ROLE_RE.test(role)
    ) {
      throw Object.assign(
        new Error(
          "Supabase session has no valid owner, tenant, membership, and role identity",
        ),
        {
          code: "AUTH_FORBIDDEN",
          httpStatus: 403,
        },
      );
    }
    let principalResolution: Response;
    try {
      principalResolution = await fetch(
        `${SUPABASE_AUTH_URL}/rest/v1/rpc/${SUPABASE_PRINCIPAL_RPC}`,
        {
          method: "POST",
          headers: {
            Authorization: authorization,
            apikey: SUPABASE_AUTH_API_KEY,
            "Content-Type": "application/json",
          },
          body: "{}",
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw Object.assign(
        new Error("Supabase principal provider is unavailable"),
        {
          code: "AUTH_PROVIDER_UNAVAILABLE",
          httpStatus: 503,
        },
      );
    }
    if (!principalResolution.ok) {
      const forbidden =
        principalResolution.status === 401 ||
        principalResolution.status === 403;
      throw Object.assign(
        new Error(
          forbidden
            ? "Supabase principal is unauthorized or inactive"
            : "Supabase principal provider is unavailable",
        ),
        {
          code: forbidden ? "AUTH_FORBIDDEN" : "AUTH_PROVIDER_UNAVAILABLE",
          httpStatus: forbidden ? 403 : 503,
        },
      );
    }
    let resolvedPrincipals: unknown;
    try {
      resolvedPrincipals = await principalResolution.json();
    } catch {
      throw Object.assign(
        new Error("Supabase principal provider returned invalid data"),
        {
          code: "AUTH_PROVIDER_UNAVAILABLE",
          httpStatus: 503,
        },
      );
    }
    const resolvedPrincipal =
      Array.isArray(resolvedPrincipals) && resolvedPrincipals.length === 1
        ? (resolvedPrincipals[0] as JsonRecord)
        : null;
    if (
      !resolvedPrincipal ||
      String(resolvedPrincipal.membership_id ?? "").trim() !== membershipId ||
      String(resolvedPrincipal.tenant_id ?? "").trim() !== tenantId ||
      String(resolvedPrincipal.resolved_role ?? "")
        .trim()
        .toLowerCase() !== role
    ) {
      throw Object.assign(
        new Error("Supabase principal is inactive or has stale claims"),
        {
          code: "AUTH_FORBIDDEN",
          httpStatus: 403,
        },
      );
    }
    return {
      ownerUserId,
      tenantId,
      membershipId,
      role,
      sessionReference: sha256({ supabaseSessionCredential: token }),
      correlationId: randomUUID(),
      authMode: "STRICT_SESSION_INTROSPECTION",
    };
  }
  const parts = token.split(".");
  try {
    const claims =
      parts.length === 3
        ? (JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8"),
          ) as JsonRecord)
        : null;
    // Corpus runners are intentionally isolated from production auth. Their
    // fixture mode may decode a UUID-shaped proof JWT, but always projects it
    // through the explicit fixture principal. A7 uses supabase-introspection.
    if (LOCAL_AUTHENTICATED_USER_ID_RE.test(String(claims?.sub ?? ""))) {
      return fixturePrincipal(token);
    }
  } catch {
    // A malformed or foreign JWT is denied below without exposing token details.
  }
  throw Object.assign(
    new Error(
      "authenticated identity is invalid for the local estimate harness",
    ),
    {
      code: "AUTH_FORBIDDEN",
      httpStatus: 403,
    },
  );
}

async function readBinaryBody(
  request: IncomingMessage,
  maximumBytes = MAX_PHOTO_BYTES,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBytes) {
      throw Object.assign(new Error("photo body is too large"), {
        httpStatus: 413,
        code: "PHOTO_TOO_LARGE",
      });
    }
    chunks.push(buffer);
  }
  if (size < 1)
    throw Object.assign(new Error("photo body is empty"), {
      httpStatus: 422,
      code: "PHOTO_ZERO_BYTES",
    });
  return Buffer.concat(chunks);
}

async function readBody(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES)
      throw Object.assign(new Error("request body is too large"), {
        httpStatus: 413,
        code: "REQUEST_TOO_LARGE",
      });
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("request body must be an object");
  return parsed as JsonRecord;
}

async function withDatabaseClient<T>(
  connectionString: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let pool = databasePools.get(connectionString);
  if (!pool) {
    pool = new Pool({
      connectionString,
      application_name: "canonical-estimate-local-runtime-r1",
      max: LOCAL_DATABASE_POOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    databasePools.set(connectionString, pool);
  }
  const client = await pool.connect();
  databaseConnectionAudit.totalCheckouts += 1;
  databaseConnectionAudit.activeCheckouts += 1;
  databaseConnectionAudit.maximumActiveCheckouts = Math.max(
    databaseConnectionAudit.maximumActiveCheckouts,
    databaseConnectionAudit.activeCheckouts,
  );
  try {
    return await operation(client);
  } finally {
    databaseConnectionAudit.activeCheckouts -= 1;
    client.release();
  }
}

async function withClient<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withDatabaseClient(DATABASE_URL, operation);
}

async function withSearchClient<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withDatabaseClient(SEARCH_DATABASE_URL, operation);
}

type CatalogContentAdmission = {
  status: "PROFESSIONAL_READY" | "QUARANTINED" | "LEGACY_READ_ONLY";
  assessedReleaseId: string | null;
  assessedReleaseStatus: string | null;
  definitionVersionId: string | null;
  baselineReady: boolean;
  scenarioReady: boolean;
  reasonCode: string | null;
  decision: AdmissionDecision;
};

function isolatedCandidateCapability(): IsolatedCandidateCapability | null {
  const complete =
    [
      R3_CAPABILITY_ENVIRONMENT,
      R3_CAPABILITY_RELEASE_ID,
      R3_CAPABILITY_SEARCH_RELEASE_ID,
      R3_CAPABILITY_EXPIRES_AT,
      R3_CAPABILITY_PURPOSE,
      R3_CAPABILITY_SOURCE_HEAD,
      R3_CAPABILITY_SOURCE_TREE,
    ].every(Boolean) &&
    (R3_CAPABILITY_TENANT_BINDING === "request-principal" ||
      Boolean(R3_CAPABILITY_ID && R3_CAPABILITY_TENANT_ID));
  if (!complete) return null;
  return {
    serverIssued: true,
    environment: R3_CAPABILITY_ENVIRONMENT,
    tenantId:
      R3_CAPABILITY_TENANT_BINDING === "request-principal"
        ? currentTenantId()
        : R3_CAPABILITY_TENANT_ID,
    releaseId: R3_CAPABILITY_RELEASE_ID,
    searchReleaseId: R3_CAPABILITY_SEARCH_RELEASE_ID,
    expiresAt: R3_CAPABILITY_EXPIRES_AT,
    purpose: R3_CAPABILITY_PURPOSE,
    sourceHead: R3_CAPABILITY_SOURCE_HEAD,
    sourceTree: R3_CAPABILITY_SOURCE_TREE,
  };
}

async function resolveCandidateCapabilityId(
  client: PoolClient,
): Promise<string> {
  if (R3_CAPABILITY_TENANT_BINDING === "fixed") return R3_CAPABILITY_ID;
  const result = await client.query(
    `select capability.id::text
       from public.estimate_candidate_capability_r3 capability
      where capability.environment=$1
        and capability.tenant_id=$2
        and capability.release_id=$3
        and capability.search_release_id=$4
        and capability.expires_at>clock_timestamp()
        and capability.purpose='estimate_candidate_admission_r3'
        and capability.source_head=$5
        and capability.source_tree=$6
        and capability.revoked_at is null
      order by capability.created_at desc,capability.id
      limit 2`,
    [
      R3_CAPABILITY_ENVIRONMENT,
      currentTenantId(),
      R3_CAPABILITY_RELEASE_ID,
      R3_CAPABILITY_SEARCH_RELEASE_ID,
      R3_CAPABILITY_SOURCE_HEAD,
      R3_CAPABILITY_SOURCE_TREE,
    ],
  );
  if (result.rows.length !== 1) {
    throw Object.assign(
      new Error(
        result.rows.length === 0
          ? "request principal has no active candidate capability"
          : "request principal candidate capability is ambiguous",
      ),
      { code: "AUTH_FORBIDDEN", httpStatus: 403 },
    );
  }
  return String(result.rows[0].id);
}

async function readContentAdmissions(
  catalogIds: readonly string[],
  ingress: EstimateAdmissionIngress = "search_selectable",
  releaseIdOverride: string | null = CONTENT_ADMISSION_RELEASE_ID || null,
): Promise<Map<string, CatalogContentAdmission>> {
  const uniqueCatalogIds = [...new Set(catalogIds.map(String).filter(Boolean))];
  if (uniqueCatalogIds.length === 0) return new Map();
  const rows = await withClient(
    async (client) =>
      (
        await client.query(
          `
    with selected_release as (
      select release.id,release.status,
        exists(select 1 from public.estimate_cumulative_manifest_entry any_manifest
          where any_manifest.release_id=release.id) manifest_mode
      from public.estimate_definition_release release
      where (($1::uuid is not null and release.id=$1)
        or ($1::uuid is null and release.status='active'))
      order by case when release.id=$1 then 0 else 1 end,
        release.activated_at desc nulls last,release.created_at desc
      limit 1
    ), requested as (
      select unnest($2::text[]) catalog_id
    )
    select requested.catalog_id,selected_release.id::text assessed_release_id,
      selected_release.status assessed_release_status,selected_release.manifest_mode,
      manifest.definition_version_id::text manifest_definition_version_id,
      manifest.runtime_publication_state manifest_publication_state,
      coalesce(manifest.baseline_ready,false) baseline_ready,
      coalesce(manifest.scenario_ready,false) scenario_ready,
      definition.id::text definition_version_id,
      case when manifest.definition_version_id is not null then selected_release.id::text
        else definition.release_id::text end effective_definition_release_id,
      definition.release_id::text source_definition_release_id,
      definition.source_metadata,definition.content_status,definition.content_gate_status,
      exists(select 1 from public.estimate_definition_version direct
        where direct.release_id=selected_release.id and direct.catalog_id=requested.catalog_id) direct_definition
    from requested left join selected_release on true
    left join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=selected_release.id and manifest.catalog_id=requested.catalog_id
    left join lateral (
      select candidate.id,candidate.release_id,candidate.source_metadata,
        candidate.content_status,candidate.content_gate_status
      from public.estimate_definition_version candidate
      where candidate.id=manifest.definition_version_id
        or (manifest.definition_version_id is null
          and candidate.release_id=selected_release.id and candidate.catalog_id=requested.catalog_id)
      order by (candidate.id=manifest.definition_version_id) desc
      limit 1
    ) definition on true
  `,
          [releaseIdOverride, uniqueCatalogIds],
        )
      ).rows as JsonRecord[],
  );
  const searchRows = await withSearchClient(
    async (client) =>
      (
        await client.query(
          `
    with selected_search_release as (
      select release.id
      from public.estimate_search_index_release release
      where (($1::uuid is not null and release.id=$1)
        or ($1::uuid is null and release.status='active'))
      order by case when release.id=$1 then 0 else 1 end,
        release.activated_at desc nulls last,release.created_at desc
      limit 1
    ), requested as (select unnest($2::text[]) catalog_id)
    select requested.catalog_id,selected_search_release.id::text search_release_id,
      document.definition_version_id::text search_definition_version_id,
      document.definition_release_id::text search_definition_release_id,
      document.adjudication_class,document.selectable,
      document.canonical_target_catalog_id,document.replacement_catalog_id
    from requested left join selected_search_release on true
    left join public.estimate_search_document document
      on document.search_release_id=selected_search_release.id
      and document.catalog_id=requested.catalog_id
  `,
          [TARGET_SEARCH_RELEASE_ID || null, uniqueCatalogIds],
        )
      ).rows as JsonRecord[],
  );
  const searchByCatalog = new Map(
    searchRows.map((row) => [String(row.catalog_id), row]),
  );
  const capability = isolatedCandidateCapability();
  const registry = new CanonicalEstimateDefinitionRegistry(
    rows.map((row) => {
      const search = searchByCatalog.get(String(row.catalog_id));
      return buildCanonicalEstimateRegistryEntry({
        catalogId: row.catalog_id,
        manifestPresent: row.manifest_definition_version_id != null,
        definitionPresent: row.definition_version_id != null,
        searchDocumentPresent: Boolean(search),
        definitionVersionId: row.definition_version_id,
        definitionReleaseId: row.effective_definition_release_id,
        searchDefinitionVersionId: search?.search_definition_version_id,
        searchReleaseId: search?.search_release_id,
        adjudicationClass: search?.adjudication_class,
        selectable: search?.selectable,
        canonicalTargetCatalogId: search?.canonical_target_catalog_id,
        replacementCatalogId: search?.replacement_catalog_id,
        sourceMetadata: row.source_metadata,
      });
    }),
  );
  return new Map(
    rows.map((row) => {
      const search = searchByCatalog.get(String(row.catalog_id));
      const registryEntry = registry.get(String(row.catalog_id))!;
      const releaseStatus =
        row.assessed_release_status == null
          ? null
          : String(row.assessed_release_status);
      const mode: EstimateAdmissionMode =
        releaseStatus === "prepared" ? "isolated_candidate_test" : "production";
      const baselineReady = row.baseline_ready === true;
      const scenarioReady = row.scenario_ready === true;
      const decision = evaluateEstimateAdmission({
        mode,
        ingress,
        releaseId:
          row.assessed_release_id == null
            ? null
            : String(row.assessed_release_id),
        definitionVersionId:
          row.definition_version_id == null
            ? null
            : String(row.definition_version_id),
        catalogId: String(row.catalog_id),
        releaseStatus,
        manifestPublicationState:
          row.manifest_publication_state == null
            ? null
            : String(row.manifest_publication_state),
        baselineReady,
        scenarioReady,
        definitionContentStatus:
          row.content_status == null ? null : String(row.content_status),
        contentGateStatus:
          row.content_gate_status == null
            ? null
            : String(row.content_gate_status),
        definitionReleaseId:
          row.effective_definition_release_id == null
            ? null
            : String(row.effective_definition_release_id),
        selectedSearchReleaseId:
          search?.search_release_id == null
            ? null
            : String(search.search_release_id),
        definitionSearchReleaseId:
          search?.search_release_id == null
            ? null
            : String(search.search_release_id),
        unresolvedDisposition: registryEntry.unresolvedDisposition,
        authorizationValid: true,
        runtimeEnvironment: R3_RUNTIME_ENVIRONMENT,
        tenantId: currentTenantId(),
        sourceHead: R45_RUNTIME_SOURCE_HEAD,
        sourceTree: R45_RUNTIME_SOURCE_TREE,
        capability,
      });
      const ready = decision.allowed;
      return [
        String(row.catalog_id),
        {
          status: ready ? "PROFESSIONAL_READY" : "QUARANTINED",
          assessedReleaseId:
            row.assessed_release_id == null
              ? null
              : String(row.assessed_release_id),
          assessedReleaseStatus: releaseStatus,
          definitionVersionId:
            row.definition_version_id == null
              ? null
              : String(row.definition_version_id),
          baselineReady,
          scenarioReady,
          reasonCode: ready
            ? null
            : (decision.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED"),
          decision,
        } satisfies CatalogContentAdmission,
      ];
    }),
  );
}

async function readRuntimeTargetState(client: PoolClient): Promise<{
  releaseId: string | null;
  status: string | null;
  userCompileAllowed: boolean;
}> {
  if (!TARGET_RELEASE_ID)
    return { releaseId: null, status: "active", userCompileAllowed: true };
  const release = (
    await client.query(
      "select id::text,status from public.estimate_definition_release where id=$1",
      [TARGET_RELEASE_ID],
    )
  ).rows[0] as JsonRecord | undefined;
  if (!release)
    return {
      releaseId: TARGET_RELEASE_ID,
      status: null,
      userCompileAllowed: false,
    };
  return {
    releaseId: String(release.id),
    status: String(release.status),
    userCompileAllowed:
      release.status === "active" ||
      (release.status === "prepared" && ALLOW_PREPARED_RELEASE_COMPILE),
  };
}

async function resolveDefaultPriceSnapshotIds(
  client: PoolClient,
  releaseId: string | null,
  catalogId: string,
): Promise<string[]> {
  if (!releaseId) return [];
  const result = await client.query(
    `select distinct latest.id::text snapshot_id
     from public.estimate_cumulative_manifest_entry manifest
     join public.estimate_resource_spec resource
       on resource.definition_version_id=manifest.definition_version_id
     join public.estimate_resource_price_route_binding binding
       on binding.resource_spec_id=resource.id
     join public.estimate_price_route route
       on route.id=binding.route_id and route.active
     cross join lateral (
       select snapshot.id
       from public.estimate_price_snapshot snapshot
       where snapshot.route_id=route.id
         and snapshot.currency_code=route.currency_code
         and (snapshot.valid_until is null or snapshot.valid_until>=now())
       order by snapshot.captured_at desc,snapshot.id
       limit 1
     ) latest
     where manifest.release_id=$1 and manifest.catalog_id=$2
       and manifest.baseline_ready and manifest.scenario_ready
     order by latest.id::text
     limit 100`,
    [releaseId, catalogId],
  );
  return result.rows.map((row) => String(row.snapshot_id));
}

async function assertUserCompilationAdmission(
  client: PoolClient,
  catalogId: string,
  ingress: EstimateAdmissionIngress,
): Promise<{
  targetReleaseStatus: string | null;
  decision: AdmissionDecision;
}> {
  const target = await readRuntimeTargetState(client);
  if (!target.userCompileAllowed) {
    throw Object.assign(
      new Error(
        target.status === "prepared"
          ? "prepared definition release is isolated from the user runtime"
          : "definition release is unavailable to the user runtime",
      ),
      {
        code:
          target.status === "prepared"
            ? "PREPARED_RELEASE_USER_RUNTIME_BLOCKED"
            : "DEFINITION_RELEASE_NOT_AVAILABLE",
        httpStatus: 409,
      },
    );
  }
  const admission = (await readContentAdmissions([catalogId], ingress)).get(
    catalogId,
  );
  if (!admission || admission.status !== "PROFESSIONAL_READY") {
    throw Object.assign(
      new Error("estimate definition content is quarantined"),
      {
        code: "DEFINITION_CONTENT_NOT_ADMITTED",
        httpStatus: 409,
        contentAdmission: admission ?? null,
      },
    );
  }
  return { targetReleaseStatus: target.status, decision: admission.decision };
}

async function assertArtifactContentAdmission(
  catalogId: string,
  ingress: "pdf_artifact_create" | "procurement_artifact_create",
  revisionReleaseId: string,
): Promise<CatalogContentAdmission> {
  const admission = (
    await readContentAdmissions([catalogId], ingress, revisionReleaseId)
  ).get(catalogId);
  if (!admission || admission.status !== "PROFESSIONAL_READY") {
    throw Object.assign(
      new Error("quarantined legacy revision cannot create a new artifact"),
      {
        code: "REVISION_CONTENT_QUARANTINED",
        httpStatus: 409,
        contentAdmission: admission ?? null,
      },
    );
  }
  return admission;
}

function legacyReadContentAdmission(
  revision: JsonRecord,
  ingress: "revision_read" | "artifact_read",
  existingExactArtifact = false,
): CatalogContentAdmission {
  const decision = evaluateEstimateAdmission({
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
  return {
    status: decision.allowed ? "LEGACY_READ_ONLY" : "QUARANTINED",
    assessedReleaseId: decision.releaseId || null,
    assessedReleaseStatus: null,
    definitionVersionId: decision.definitionVersionId || null,
    baselineReady: false,
    scenarioReady: false,
    reasonCode: decision.allowed
      ? null
      : (decision.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED"),
    decision,
  };
}

async function modelDatabaseUrlForCatalog(catalogId: string): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) =>
      Boolean(
        (
          await client.query(
            `
      select 1 from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id
      where r.status='active' and v.catalog_id=$1 limit 1
    `,
            [catalogId],
          )
        ).rowCount,
      ),
    );
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function findAcrossModelDatabases<T>(
  operation: (client: PoolClient) => Promise<T | null | undefined>,
): Promise<T | null> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const value = await withDatabaseClient(connectionString, operation);
    if (value != null) return value;
  }
  return null;
}

async function modelDatabaseUrlForJob(jobId: string): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) =>
      Boolean(
        (
          await client.query(
            "select 1 from public.estimate_compile_job where id=$1 and owner_user_id=$2",
            [jobId, currentOwnerId()],
          )
        ).rowCount,
      ),
    );
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function modelDatabaseUrlForRevision(
  revisionId: string,
): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) =>
      Boolean(
        (
          await client.query(
            "select 1 from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
            [revisionId, currentOwnerId(), currentTenantId()],
          )
        ).rowCount,
      ),
    );
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function modelDatabaseUrlForPhotoAttachment(
  attachmentId: string,
): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) =>
      Boolean(
        (
          await client.query(
            "select 1 from public.estimate_revision_photo_attachment where attachment_id=$1 and (owner_user_id=$2 or tenant_id=$3)",
            [attachmentId, currentOwnerId(), currentTenantId()],
          )
        ).rowCount,
      ),
    );
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function createJob(
  body: JsonRecord,
  operation: "compile" | "recalculate",
) {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const currencyCode = String(body.currencyCode ?? "").trim();
  const organizationId = resolveRequestOrganizationId(body.organizationId);
  if (
    !idempotencyKey ||
    idempotencyKey.length > 200 ||
    !catalogId ||
    !/^[A-Z]{3}$/.test(currencyCode)
  ) {
    throw Object.assign(new Error("invalid compile request"), {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const parameters = body.parameters;
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  )
    throw Object.assign(new Error("parameters must be an object"), {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  const sourceRequestText = String(body.sourceRequestText ?? "").trim();
  const primaryMeasureParameterId = String(
    body.primaryMeasureParameterId ?? "",
  ).trim();
  const suppliedRequestIdentity = Boolean(
    sourceRequestText || primaryMeasureParameterId,
  );
  if (
    (operation === "compile" || suppliedRequestIdentity) &&
    (!sourceRequestText ||
      sourceRequestText.length > 4_000 ||
      !/^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/.test(primaryMeasureParameterId))
  ) {
    throw Object.assign(new Error("source request identity is required"), {
      code: "SOURCE_REQUEST_IDENTITY_REQUIRED",
      httpStatus: 400,
    });
  }
  const parentRevisionId =
    operation === "recalculate" ? String(body.parentRevisionId ?? "") : null;
  const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
  const result = await withDatabaseClient(modelDatabaseUrl, async (client) => {
    await client.query("begin");
    try {
      if (operation === "recalculate") {
        const parentInPrincipalScope = Boolean(
          (
            await client.query(
              `select 1 from public.estimate_revision
               where id=$1 and catalog_id=$2
                 and (owner_user_id=$3 or organization_id=$4)`,
              [
                parentRevisionId,
                catalogId,
                currentOwnerId(),
                currentTenantId(),
              ],
            )
          ).rowCount,
        );
        if (!parentInPrincipalScope) {
          throw Object.assign(new Error("parent revision not found"), {
            code: "NOT_FOUND",
            httpStatus: 404,
          });
        }
      }
      const compilationAdmission = await assertUserCompilationAdmission(
        client,
        catalogId,
        operation === "compile"
          ? "direct_catalog_compile"
          : "parameter_recalculation",
      );
      const candidateCapabilityId =
        compilationAdmission.decision.mode === "isolated_candidate_test"
          ? await resolveCandidateCapabilityId(client)
          : null;
      const requestedPriceSnapshotIds = Array.isArray(body.priceSnapshotIds)
        ? body.priceSnapshotIds.filter((value): value is string =>
            typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
        : [];
      const priceSnapshotIds = requestedPriceSnapshotIds.length > 0
        ? requestedPriceSnapshotIds
        : await resolveDefaultPriceSnapshotIds(
            client,
            compilationAdmission.decision.releaseId,
            catalogId,
          );
      const inputPayload = {
        parameters,
        currencyCode,
        priceSnapshotIds,
        ...(operation === "compile"
          ? {
              requestIdentity: { sourceRequestText, primaryMeasureParameterId },
            }
          : {}),
        ...(operation === "recalculate"
          ? {
              ...(suppliedRequestIdentity
                ? {
                    requestIdentity: {
                      sourceRequestText,
                      primaryMeasureParameterId,
                    },
                  }
                : {}),
              rowOverrides: body.rowOverrides ?? {},
              customRows: body.customRows ?? [],
              ...(body.releaseMigration == null
                ? {}
                : { releaseMigration: body.releaseMigration }),
            }
          : {}),
        apiVersion: API_VERSION,
        ...(compilationAdmission.decision.mode === "isolated_candidate_test"
          ? {
              estimateAdmission: {
                capabilityId: candidateCapabilityId,
                environment: R3_RUNTIME_ENVIRONMENT,
                sourceHead: R45_RUNTIME_SOURCE_HEAD,
                sourceTree: R45_RUNTIME_SOURCE_TREE,
                contractVersion: compilationAdmission.decision.contractVersion,
                decision: persistedAdmissionDecision(
                  compilationAdmission.decision,
                ),
              },
            }
          : {}),
      };
      const persistenceIdempotencyKey =
        canonicalEstimateCandidateAdmissionIdempotencyKey({
          clientIdempotencyKey: idempotencyKey,
          candidateSourceTree: R45_RUNTIME_SOURCE_TREE,
          isolatedCandidateTest:
            compilationAdmission.decision.mode === "isolated_candidate_test",
        });
      let created;
      if (
        TARGET_RELEASE_ID &&
        compilationAdmission.targetReleaseStatus === "prepared"
      ) {
        if (!ADMISSION_RUN_ID)
          throw new Error("CANONICAL_ESTIMATE_ADMISSION_RUN_ID_REQUIRED");
        if (CUMULATIVE_MANIFEST_MODE) {
          created = await client.query(
            `select * from public.estimate_create_cumulative_admission_job_r54($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
            [
              TARGET_RELEASE_ID,
              ADMISSION_RUN_ID,
              currentOwnerId(),
              currentTenantId(),
              persistenceIdempotencyKey,
              operation,
              catalogId,
              parentRevisionId || null,
              JSON.stringify(inputPayload),
            ],
          );
        } else if (ADMISSION_DOMAIN_ID) {
          created = await client.query(
            `select * from public.estimate_create_release_admission_job_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
            [
              TARGET_RELEASE_ID,
              ADMISSION_DOMAIN_ID,
              ADMISSION_RUN_ID,
              currentOwnerId(),
              currentTenantId(),
              persistenceIdempotencyKey,
              operation,
              catalogId,
              parentRevisionId || null,
              JSON.stringify(inputPayload),
            ],
          );
        } else {
          created = await client.query(
            `select * from public.estimate_create_release_admission_job_v2($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
            [
              TARGET_RELEASE_ID,
              ADMISSION_RUN_ID,
              currentOwnerId(),
              currentTenantId(),
              persistenceIdempotencyKey,
              operation,
              catalogId,
              parentRevisionId || null,
              JSON.stringify(inputPayload),
            ],
          );
        }
      } else {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,true)",
          [currentOwnerId()],
        );
        const createFunction = CUMULATIVE_MANIFEST_MODE
          ? "estimate_create_compile_job_r58"
          : "estimate_create_compile_job_v1";
        created = await client.query(
          `select * from public.${createFunction}($1,$2,$3,$4,$5,$6::jsonb)`,
          [
            persistenceIdempotencyKey,
            operation,
            catalogId,
            parentRevisionId || null,
            organizationId,
            JSON.stringify(inputPayload),
          ],
        );
      }
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  setImmediate(() => {
    void drainJobs(modelDatabaseUrl).catch((error) =>
      process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
    );
  });
  return {
    apiVersion: API_VERSION,
    jobId: result.job_id,
    status: result.job_status,
    created: result.created,
    pollAfterMs: 250,
  };
}

async function createLegacyJob(body: JsonRecord) {
  const sourceEstimateId = String(body.sourceEstimateId ?? "").trim();
  const sourceRevisionId = String(body.sourceRevisionId ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const currencyCode = String(body.currencyCode ?? "").trim();
  const organizationId = resolveRequestOrganizationId(body.organizationId);
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (
    !sourceEstimateId ||
    !sourceRevisionId ||
    !catalogId ||
    !idempotencyKey ||
    !/^[A-Z]{3}$/.test(currencyCode) ||
    !rows ||
    rows.length > 5_000
  ) {
    throw Object.assign(new Error("invalid legacy revision request"), {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const sourceProjection = {
    sourceEstimateId,
    sourceRevisionId,
    catalogId,
    currencyCode,
    parameters: body.parameters ?? {},
    totals: body.totals ?? {},
    rows,
  };
  const sourceChecksumSha256 = sha256(sourceProjection);
  const payload = {
    ...sourceProjection,
    sourceChecksumSha256,
    apiVersion: API_VERSION,
  };
  const result = await withClient(async (client) => {
    await client.query("begin");
    try {
      await assertUserCompilationAdmission(
        client,
        catalogId,
        "revision_replay_migration",
      );
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
        currentOwnerId(),
      ]);
      const created = await client.query(
        `
        select * from public.estimate_create_legacy_revision_job_v1($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      `,
        [
          idempotencyKey,
          catalogId,
          organizationId,
          sourceEstimateId,
          sourceRevisionId,
          sourceChecksumSha256,
          body.parentCanonicalRevisionId ?? null,
          JSON.stringify(payload),
        ],
      );
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  setImmediate(() => {
    void drainJobs().catch((error) =>
      process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
    );
  });
  return {
    apiVersion: API_VERSION,
    jobId: result.job_id,
    status: result.job_status,
    created: result.created,
    sourceChecksumSha256,
    pollAfterMs: 250,
  };
}

async function createArtifactJob(
  body: JsonRecord,
  revisionId: string,
  kind: "pdf" | "professional_pdf" | "procurement",
) {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (!idempotencyKey)
    throw Object.assign(new Error("idempotencyKey is required"), {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  const modelDatabaseUrl = await modelDatabaseUrlForRevision(revisionId);
  const sourceRevision = await withDatabaseClient(
    modelDatabaseUrl,
    async (client) =>
      (
        await client.query(
          "select catalog_id,release_id::text,definition_version_id::text from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
          [revisionId, currentOwnerId(), currentTenantId()],
        )
      ).rows[0] as JsonRecord | undefined,
  );
  if (!sourceRevision)
    throw Object.assign(new Error("revision not found"), {
      code: "NOT_FOUND",
      httpStatus: 404,
    });
  const contentAdmission = await assertArtifactContentAdmission(
    String(sourceRevision.catalog_id),
    kind === "procurement"
      ? "procurement_artifact_create"
      : "pdf_artifact_create",
    String(sourceRevision.release_id),
  );
  const result = await withDatabaseClient(modelDatabaseUrl, async (client) => {
    await client.query("begin");
    try {
      const candidateCapabilityId =
        contentAdmission.decision.mode === "isolated_candidate_test"
          ? await resolveCandidateCapabilityId(client)
          : null;
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
        currentOwnerId(),
      ]);
      await client.query(
        "select set_config('request.estimate_tenant_id_r541',$1,true)",
        [currentTenantId()],
      );
      await client.query(
        "select set_config('request.estimate_admission_r3',$1,true)",
        [
          JSON.stringify({
            capabilityId: candidateCapabilityId,
            environment: R3_RUNTIME_ENVIRONMENT,
            sourceHead: R45_RUNTIME_SOURCE_HEAD,
            sourceTree: R45_RUNTIME_SOURCE_TREE,
            contractVersion: contentAdmission.decision.contractVersion,
            // Evaluation time is audit metadata, not artifact request identity.
            // Keeping it in the durable job payload makes an otherwise identical
            // approval retry collide with its first idempotency key.
            decision: persistedAdmissionDecision(contentAdmission.decision),
          }),
        ],
      );
      const created = await client.query(
        "select * from public.estimate_create_artifact_job_v1($1,$2,$3)",
        [idempotencyKey, revisionId, kind],
      );
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  if (result.job_id)
    setImmediate(() => {
      void drainJobs(modelDatabaseUrl).catch((error) =>
        process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
      );
    });
  return {
    apiVersion: API_VERSION,
    jobId: result.job_id,
    artifactId: result.artifact_id,
    status: result.job_status,
    artifactStatus: result.artifact_status,
    created: result.created,
    pollAfterMs: 250,
  };
}

type DrainState = {
  draining: boolean;
  drainRequested: boolean;
  retryDrainTimer: ReturnType<typeof setTimeout> | null;
};

const drainStates = new Map<string, DrainState>();

function drainState(connectionString: string): DrainState {
  const existing = drainStates.get(connectionString);
  if (existing) return existing;
  const created: DrainState = {
    draining: false,
    drainRequested: false,
    retryDrainTimer: null,
  };
  drainStates.set(connectionString, created);
  return created;
}

function scheduleRetryDrain(
  delayMs: number,
  connectionString = DATABASE_URL,
): void {
  const state = drainState(connectionString);
  if (state.retryDrainTimer != null) return;
  state.retryDrainTimer = setTimeout(
    () => {
      state.retryDrainTimer = null;
      void drainJobs(connectionString).catch((error) =>
        process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
      );
    },
    Math.max(100, delayMs),
  );
}

async function drainJobs(connectionString = DATABASE_URL): Promise<void> {
  const state = drainState(connectionString);
  if (state.draining) {
    state.drainRequested = true;
    return;
  }
  state.draining = true;
  try {
    do {
      state.drainRequested = false;
      await withDatabaseClient(connectionString, async (client) => {
        while (true) {
          const workerId = `local-runtime:${randomUUID()}`;
          const claimed = await client.query(
            "select * from public.estimate_claim_compile_jobs_v1($1,4,120)",
            [workerId],
          );
          if (claimed.rows.length === 0) break;
          for (const job of claimed.rows) {
            try {
              if (job.operation === "legacy_revision_migration")
                await migrateLegacyClaimedJob(
                  client,
                  workerId,
                  job as JsonRecord,
                );
              else if (
                job.operation === "pdf" ||
                job.operation === "professional_pdf" ||
                job.operation === "procurement"
              )
                await buildArtifactClaimedJob(
                  client,
                  workerId,
                  job as JsonRecord,
                );
              else await compileClaimedJob(client, workerId, job as JsonRecord);
            } catch (error) {
              const code =
                typeof error === "object" && error && "code" in error
                  ? String((error as { code: unknown }).code)
                  : /timed?\s*out|timeout/iu.test(
                        error instanceof Error ? error.message : String(error),
                      )
                    ? "ARTIFACT_RENDER_TIMEOUT"
                    : "COMPILER_FAILED";
              const message =
                error instanceof Error ? error.message : String(error);
              const expectedOptimisticLoser =
                code === "40001" &&
                message.startsWith("optimistic revision conflict:");
              if (!expectedOptimisticLoser) {
                process.stderr.write(
                  `[canonical-local-worker-job-error] ${JSON.stringify({
                    jobId: job.id,
                    catalogId: job.catalog_id,
                    operation: job.operation,
                    code,
                    message,
                  })}\n`,
                );
              }
              const retryable =
                (code === "40001" && !expectedOptimisticLoser) ||
                ["40P01", "55P03"].includes(code) ||
                code.endsWith("_LOAD_FAILED") ||
                code.endsWith("_STORAGE_FAILED") ||
                code === "ARTIFACT_RENDER_TIMEOUT" ||
                code === "ARTIFACT_BROWSER_DISCONNECTED" ||
                code === "REVISION_COMMIT_RETRYABLE";
              const retryDelaySeconds = Math.min(
                300,
                2 ** Math.min(Number(job.attempt ?? 1), 8),
              );
              await client.query(
                "select public.estimate_fail_compile_job_v2($1,$2,$3,$4::jsonb,$5,$6)",
                [
                  job.id,
                  workerId,
                  code.slice(0, 100),
                  JSON.stringify({
                    compilerVersion: COMPILER_VERSION,
                    retryable,
                  }),
                  retryable,
                  retryDelaySeconds,
                ],
              );
            }
          }
        }
        const retry = await client.query(`
          select ceil(extract(epoch from (min(available_at) - now())) * 1000)::integer delay_ms
            from public.estimate_compile_job where status='retry_wait'
        `);
        const rawRetryDelayMs = retry.rows[0]?.delay_ms;
        if (rawRetryDelayMs != null) {
          const retryDelayMs = Number(rawRetryDelayMs);
          if (Number.isFinite(retryDelayMs))
            scheduleRetryDrain(retryDelayMs + 100, connectionString);
        }
      });
    } while (state.drainRequested);
  } finally {
    state.draining = false;
    if (state.drainRequested) {
      state.drainRequested = false;
      setImmediate(() => {
        void drainJobs(connectionString).catch((error) =>
          process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
        );
      });
    }
  }
}

async function compileClaimedJob(
  client: PoolClient,
  workerId: string,
  job: JsonRecord,
): Promise<void> {
  const definition = (
    await client.query(
      `
    select effective.id,effective.cumulative_manifest,effective.approved_template_baseline_id,
      resolved.definition_version,resolved.passport,identity.title_ru,identity.domain,
      coalesce(baseline.input_values,'{}'::jsonb) baseline_input_values
    from public.estimate_definition_release release
    cross join lateral (
      select inherited.id,true cumulative_manifest,manifest.approved_template_baseline_id,0 priority
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version inherited on inherited.id=manifest.definition_version_id
      where manifest.release_id=release.id and manifest.catalog_id=$1
        and manifest.baseline_ready and manifest.scenario_ready
      union all
      select direct.id,false cumulative_manifest,null::uuid approved_template_baseline_id,1 priority
      from public.estimate_definition_version direct
      where direct.release_id=release.id and direct.catalog_id=$1
        and not exists(
          select 1 from public.estimate_cumulative_manifest_entry manifest
          where manifest.release_id=release.id and manifest.catalog_id=$1
            and manifest.baseline_ready and manifest.scenario_ready
        )
    ) effective
    left join public.estimate_approved_template_baseline baseline
      on baseline.id=effective.approved_template_baseline_id
    join public.estimate_definition_version resolved on resolved.id=effective.id
    join public.estimate_work_identity identity on identity.catalog_id=resolved.catalog_id
      where release.id=$2
      and (release.status='active' or (release.status='prepared' and $3::boolean))
    order by effective.priority
    limit 1
  `,
      [
        job.catalog_id,
        job.target_release_id,
        ALLOW_PREPARED_RELEASE_COMPILE &&
          (job.input_payload as JsonRecord)?.releaseAdmission === true,
      ],
    )
  ).rows[0];
  if (!definition)
    throw Object.assign(new Error("definition content is not admitted"), {
      code: "DEFINITION_CONTENT_NOT_ADMITTED",
    });
  const parameterDefinitions = (
    await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [definition.id],
    )
  ).rows;
  const payload = (job.input_payload ?? {}) as JsonRecord;
  const baselineParameters = (definition.baseline_input_values ??
    {}) as JsonRecord;
  const submittedParameters = (payload.parameters ?? {}) as JsonRecord;
  let confirmedParameters: JsonRecord = { ...baselineParameters };
  let inheritedUserParameters: JsonRecord = {};
  let parentRevision: JsonRecord | null = null;
  if (job.operation === "recalculate") {
    const parent = (
      await client.query(
        `select release_id,catalog_id,input_parameters,amendment_contract,
        source_request_text,source_request_hash,primary_measure_parameter_id,
        revision_contract_version
       from public.estimate_revision where id=$1`,
        [job.parent_revision_id],
      )
    ).rows[0];
    if (!parent || parent.catalog_id !== job.catalog_id) {
      throw Object.assign(
        new Error("parent revision parameter source unavailable"),
        { code: "PARENT_REVISION_INVALID" },
      );
    }
    if (parent.release_id === job.target_release_id) {
      confirmedParameters = {
        ...baselineParameters,
        ...(parent.input_parameters ?? {}),
      };
      inheritedUserParameters =
        parent.amendment_contract?.parameterSources?.userParameters ?? {};
    }
    parentRevision = parent;
  }
  const effectiveUserParameters = {
    ...inheritedUserParameters,
    ...submittedParameters,
  };
  const formulas = (
    await client.query(
      "select formula_id,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1",
      [definition.id],
    )
  ).rows;
  const resourceRows = (
    await client.query(
      `select resource.*,
        coalesce(binding.price_keys,'{}'::text[]) _binding_price_keys
       from public.estimate_resource_spec resource
       left join lateral (
         select array_agg(distinct route_binding.price_key order by route_binding.price_key) price_keys
         from public.estimate_resource_price_route_binding route_binding
         where route_binding.resource_spec_id=resource.id
       ) binding on true
       where resource.definition_version_id=$1
       order by resource.ordinal
       limit $2`,
      [definition.id, MAX_ROWS + 1],
    )
  ).rows;
  const resources = bindCanonicalEstimateResourcePriceKeys(
    resourceRows,
    resourceRows.flatMap((resource) => (resource._binding_price_keys as string[]).map((priceKey) => ({
      resource_spec_id: String(resource.id),
      price_key: String(priceKey),
    }))),
  );
  const currencyCode = String(payload.currencyCode ?? "");
  const priceSnapshotIds = Array.isArray(payload.priceSnapshotIds)
    ? payload.priceSnapshotIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const priceItems = priceSnapshotIds.length === 0
    ? []
    : (
        await client.query(
          `select item.snapshot_id::text,item.price_key,item.unit_id,item.unit_price::text,
            item.currency_code,jsonb_build_object('route_id',snapshot.route_id::text) estimate_price_snapshot
           from public.estimate_price_snapshot_item item
           join public.estimate_price_snapshot snapshot on snapshot.id=item.snapshot_id
           where item.snapshot_id=any($1::uuid[])
           order by snapshot.captured_at desc,item.price_key,item.unit_id
           limit 20000`,
          [priceSnapshotIds],
        )
      ).rows.filter((row, index, rows) => rows.findIndex((candidate) =>
        candidate.price_key === row.price_key && candidate.unit_id === row.unit_id) === index);
  const compiled = await compileCanonicalEstimateCore({
    operation: String(job.operation) as "compile" | "recalculate",
    compilerVersion: COMPILER_VERSION,
    catalogId: String(job.catalog_id),
    primaryMeasureParameterId: String(
      (parentRevision?.revision_contract_version === CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION
        ? parentRevision.primary_measure_parameter_id
        : (payload.requestIdentity as JsonRecord | undefined)?.primaryMeasureParameterId) ?? "",
    ).trim() || null,
    parameterDefinitions,
    formulaDefinitions: formulas,
    resourceDefinitions: resources,
    submittedParameters,
    confirmedParameters,
    currencyCode,
    priceSnapshotIds,
    priceItems,
    rowOverrides: (payload.rowOverrides ?? {}) as Record<
      string,
      Record<string, unknown>
    >,
    customRows: Array.isArray(payload.customRows)
      ? (payload.customRows as JsonRecord[])
      : [],
    maximumResourceRows: MAX_ROWS,
    hashJson: sha256,
  });
  const { parameters, rows, totals } = compiled;
  const baselineAssumptions = Object.fromEntries(
    Object.entries(baselineParameters).filter(
      ([parameterId, value]) =>
        !(parameterId in effectiveUserParameters) &&
        canonicalEstimateStableJson(parameters[parameterId]) ===
          canonicalEstimateStableJson(value),
    ),
  );
  const identityContract = await buildCanonicalRevisionIdentity({
    catalogId: String(job.catalog_id),
    parentRevisionId:
      job.parent_revision_id == null ? null : String(job.parent_revision_id),
    requestIdentity: (payload.requestIdentity ?? {}) as JsonRecord,
    definition,
    parameterDefinitions,
    parameters,
    effectiveUserParameters,
    baselineAssumptions,
    parent: parentRevision,
    searchReleaseId: TARGET_SEARCH_RELEASE_ID || null,
    compilerVersion: COMPILER_VERSION,
    hashText: (value) =>
      createHash("sha256").update(value, "utf8").digest("hex"),
  });
  const revisionProjection = {
    ...compiled.revisionProjection,
    identity: identityContract,
  };
  const commitPayload = buildCanonicalRevisionCommitPayload({
    rowCount: rows.length,
    currencyCode,
    totals,
    checksumSha256: sha256(revisionProjection),
    compilerVersion: COMPILER_VERSION,
    parameters,
    approvedTemplateBaselineId:
      definition.approved_template_baseline_id ?? null,
    baselineAssumptions,
    effectiveUserParameters,
    parentRevisionId:
      job.parent_revision_id == null ? null : String(job.parent_revision_id),
    identityContract,
  });
  await client.query(
    `select public.${CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION}($1,$2,$3::jsonb,$4::jsonb)`,
    [job.id, workerId, JSON.stringify(commitPayload), JSON.stringify(rows)],
  );
}

function numericValue(value: unknown, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized))
    throw Object.assign(new Error("invalid legacy numeric value"), {
      code: "LEGACY_REVISION_INVALID",
    });
  return normalized;
}

async function migrateLegacyClaimedJob(
  client: PoolClient,
  workerId: string,
  job: JsonRecord,
): Promise<void> {
  const payload = job.input_payload as JsonRecord;
  const rows = Array.isArray(payload.rows)
    ? (payload.rows as JsonRecord[])
    : [];
  const sourceProjection = {
    sourceEstimateId: payload.sourceEstimateId,
    sourceRevisionId: payload.sourceRevisionId,
    catalogId: job.catalog_id,
    currencyCode: payload.currencyCode,
    parameters: payload.parameters ?? {},
    totals: payload.totals ?? {},
    rows,
  };
  const sourceChecksumSha256 = sha256(sourceProjection);
  if (sourceChecksumSha256 !== payload.sourceChecksumSha256)
    throw Object.assign(new Error("legacy checksum mismatch"), {
      code: "LEGACY_CHECKSUM_MISMATCH",
    });
  const definition = (
    await client.query(
      `select v.id from public.estimate_definition_version v join public.estimate_definition_release r on r.id=v.release_id where r.status='active' and v.catalog_id=$1`,
      [job.catalog_id],
    )
  ).rows[0];
  if (!definition)
    throw Object.assign(new Error("definition missing"), {
      code: "DEFINITION_LOAD_FAILED",
    });
  const resourceRows = (
    await client.query(
      "select id,row_id from public.estimate_resource_spec where definition_version_id=$1",
      [definition.id],
    )
  ).rows;
  const resourceMap = new Map(resourceRows.map((row) => [row.row_id, row.id]));
  const seen = new Set<string>();
  let totalAmount = "0";
  let matchedRows = 0;
  let unmatchedRows = 0;
  const migrated = rows.map((source, ordinal) => {
    const rowId = String(source.rowId ?? "").trim();
    if (!rowId || seen.has(rowId))
      throw Object.assign(new Error("duplicate or empty legacy row id"), {
        code: "LEGACY_REVISION_INVALID",
      });
    seen.add(rowId);
    const sourcePayload =
      source.sourcePayload &&
      typeof source.sourcePayload === "object" &&
      !Array.isArray(source.sourcePayload)
        ? (source.sourcePayload as JsonRecord)
        : source;
    const resourceSpecId = resourceMap.get(rowId) ?? null;
    const sourceQuantity = numericValue(source.quantity, true);
    const sourceUnitPrice = numericValue(source.unitPrice, true);
    const sourceAmount = numericValue(source.amount, true);
    const quantity =
      sourceQuantity == null ? null : canonicalRoundDecimal(sourceQuantity, 9);
    const unitPrice =
      sourceUnitPrice == null
        ? null
        : canonicalRoundDecimal(sourceUnitPrice, 6);
    const amount =
      sourceAmount == null ? null : canonicalRoundDecimal(sourceAmount, 2);
    const includedInEstimate = resourceSpecId != null;
    const procurementEligible = source.procurementEligible === true;
    if (includedInEstimate) {
      matchedRows += 1;
      if (amount != null)
        totalAmount = evaluateFormulaGraph(
          {
            kind: "binary",
            operator: "+",
            left: { kind: "literal", value: totalAmount },
            right: { kind: "literal", value: amount },
          },
          {},
        );
    } else unmatchedRows += 1;
    const row = {
      row_id: rowId,
      ordinal,
      resource_spec_id: resourceSpecId,
      section: String(source.section ?? "legacy"),
      category: String(source.category ?? "legacy"),
      title_ru: String(source.titleRu ?? "").trim(),
      unit_id: String(source.unitId ?? "unit"),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code:
        source.unitPrice == null && source.amount == null
          ? null
          : String(payload.currencyCode),
      procurement_eligible: procurementEligible,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInEstimate && procurementEligible,
      ownership_status: includedInEstimate
        ? "OWNED"
        : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      calculation_trace: {
        ...((source.calculationTrace as JsonRecord) ?? {}),
        migration: { sourceOrdinal: ordinal },
      },
      normative_trace: Array.isArray(source.normativeTrace)
        ? source.normativeTrace
        : [],
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: {
        migrated: true,
        sourcePricePreserved: sourceUnitPrice != null,
        ownershipDisposition: includedInEstimate
          ? "OWNED"
          : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    } as JsonRecord;
    row.row_sha256 = sha256(row);
    return row;
  });
  const sourceTotals =
    payload.totals && typeof payload.totals === "object"
      ? (payload.totals as JsonRecord)
      : {};
  const totals = {
    ...sourceTotals,
    amount: totalAmount,
    includedRowCount: matchedRows,
    excludedRowCount: unmatchedRows,
    pricedRowCount: migrated.filter(
      (row) => row.included_in_estimate && row.unit_price != null,
    ).length,
    unpricedRowCount: migrated.filter(
      (row) => row.included_in_estimate && row.unit_price == null,
    ).length,
    currencyCode: payload.currencyCode,
  };
  const revisionProjection = {
    sourceChecksumSha256,
    catalogId: job.catalog_id,
    totals,
    rows: migrated.map((row) => ({
      rowId: row.row_id,
      rowSha256: row.row_sha256,
    })),
    compilerVersion: COMPILER_VERSION,
  };
  await client.query(
    `select public.${CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION}($1,$2,$3::jsonb,$4::jsonb)`,
    [
      job.id,
      workerId,
      JSON.stringify({
        rowCount: migrated.length,
        currencyCode: payload.currencyCode,
        totals,
        checksumSha256: sha256(revisionProjection),
        compilerVersion: COMPILER_VERSION,
        migrationSource: {
          kind: "legacy_revision_post_line_v2",
          sourceEstimateId: payload.sourceEstimateId,
          sourceRevisionId: payload.sourceRevisionId,
          sourceChecksumSha256,
          sourceTotals,
          rowsPreserved: migrated.length,
          matchedRows,
          unmatchedRows,
          unmatchedDisposition: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
        },
      }),
      JSON.stringify(migrated),
    ],
  );
}

function artifactFilePath(storageKey: string): string {
  const safe = storageKey
    .replace(/[^a-zA-Z0-9._/-]+/g, "_")
    .replace(/^[/\\]+/, "");
  const filePath = resolve(ARTIFACT_ROOT, safe);
  if (
    filePath !== ARTIFACT_ROOT &&
    !filePath.startsWith(`${ARTIFACT_ROOT}\\`) &&
    !filePath.startsWith(`${ARTIFACT_ROOT}/`)
  ) {
    throw new Error("artifact path escaped local root");
  }
  return filePath;
}

function photoObjectFilePath(storageKey: string): string {
  if (
    !/^estimate-photo\/r55\/(?:staged|committed)\/[0-9a-f]{2}\/[0-9a-f]{64}\.(?:jpg|png)$/u.test(
      storageKey,
    )
  ) {
    throw Object.assign(new Error("invalid photo storage key"), {
      code: "PHOTO_STORAGE_KEY_INVALID",
      httpStatus: 400,
    });
  }
  const filePath = resolve(PHOTO_OBJECT_ROOT, storageKey);
  if (
    filePath !== PHOTO_OBJECT_ROOT &&
    !filePath.startsWith(`${PHOTO_OBJECT_ROOT}\\`) &&
    !filePath.startsWith(`${PHOTO_OBJECT_ROOT}/`)
  ) {
    throw Object.assign(new Error("photo path escaped local root"), {
      code: "PHOTO_STORAGE_KEY_INVALID",
      httpStatus: 400,
    });
  }
  return filePath;
}

function localPhotoMime(bytes: Buffer): "image/jpeg" | "image/png" | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  return null;
}

function localPhotoToken(input: {
  purpose: "upload" | "download";
  identity: string;
  expiresAt: number;
}): string {
  return createHmac("sha256", ARTIFACT_TOKEN_SECRET)
    .update(`${input.purpose}.${input.identity}.${input.expiresAt}`)
    .digest("base64url");
}

function localPhotoTokenMatches(input: {
  purpose: "upload" | "download";
  identity: string;
  expiresAt: number;
  signature: string;
}): boolean {
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= Date.now())
    return false;
  const expected = Buffer.from(localPhotoToken(input));
  const actual = Buffer.from(input.signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function createLocalRevisionPhotoUpload(
  body: JsonRecord,
  revisionId: string,
  host: string,
) {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const requestId = String(body.requestId ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const rowId = String(body.rowId ?? "").trim();
  const contentSha256 = String(body.contentSha256 ?? "")
    .trim()
    .toLowerCase();
  const mimeType = String(body.mimeType ?? "")
    .trim()
    .toLowerCase();
  const sizeBytes = Number(body.sizeBytes);
  const replacesAttachmentId =
    body.replacesAttachmentId == null
      ? null
      : String(body.replacesAttachmentId).trim();
  if (
    !idempotencyKey ||
    idempotencyKey.length > 200 ||
    !requestId ||
    requestId.length > 240 ||
    !catalogId ||
    catalogId.length > 240 ||
    !rowId ||
    rowId.length > 240 ||
    !/^[0-9a-f]{64}$/u.test(contentSha256) ||
    !["image/jpeg", "image/png"].includes(mimeType) ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 1 ||
    sizeBytes > MAX_PHOTO_BYTES
  ) {
    throw Object.assign(new Error("invalid estimate photo upload request"), {
      code: "INVALID_ARGUMENT",
      httpStatus: 400,
    });
  }
  const databaseUrl = await modelDatabaseUrlForRevision(revisionId);
  const upload = await withDatabaseClient(databaseUrl, async (client) => {
    await client.query("begin");
    try {
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
        currentOwnerId(),
      ]);
      const row = (
        await client.query(
          `select * from public.estimate_create_row_photo_upload_r55(
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )`,
          [
            idempotencyKey,
            requestId,
            catalogId,
            revisionId,
            rowId,
            contentSha256,
            mimeType,
            sizeBytes,
            replacesAttachmentId,
          ],
        )
      ).rows[0];
      await client.query("commit");
      return row;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  const expiresAt = Math.min(
    new Date(upload.expires_at).getTime(),
    Date.now() + 30 * 60 * 1000,
  );
  const signature = localPhotoToken({
    purpose: "upload",
    identity: upload.upload_id,
    expiresAt,
  });
  return {
    apiVersion: API_VERSION,
    uploadId: upload.upload_id,
    attachmentId: upload.attachment_id,
    status: upload.upload_status,
    storageBucket: upload.storage_bucket,
    storageObjectKey: upload.staging_storage_key,
    uploadUrl:
      upload.upload_status === "staged"
        ? `http://${host}/canonical-estimate/photo-upload-files/${upload.upload_id}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`
        : null,
    uploadToken: upload.upload_status === "staged" ? signature : null,
    expiresAt: new Date(expiresAt).toISOString(),
    created: upload.created,
  };
}

async function localPhotoUploadReservation(
  uploadId: string,
  ownerUserId: string | null = currentOwnerId(),
) {
  return findAcrossModelDatabases(
    async (client) =>
      (
        await client.query(
          "select * from public.estimate_revision_photo_upload where id=$1 and ($2::uuid is null or owner_user_id=$2)",
          [uploadId, ownerUserId],
        )
      ).rows[0],
  );
}

function localPhotoAttachmentView(row: Record<string, any>, host: string) {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const signature = localPhotoToken({
    purpose: "download",
    identity: row.attachment_id,
    expiresAt,
  });
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
    createdBy: row.created_by,
    signedUrl:
      row.attachment_status === "committed"
        ? `http://${host}/canonical-estimate/photo-attachment-files/${row.attachment_id}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`
        : null,
    signedUrlExpiresAt:
      row.attachment_status === "committed"
        ? new Date(expiresAt).toISOString()
        : null,
  };
}

async function listLocalRevisionPhotoAttachments(
  revisionId: string,
  includeDeleted: boolean,
  host: string,
) {
  const databaseUrl = await modelDatabaseUrlForRevision(revisionId);
  const rows = await withDatabaseClient(databaseUrl, async (client) => {
    await client.query("begin");
    try {
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
        currentOwnerId(),
      ]);
      const result = (
        await client.query(
          "select * from public.estimate_list_revision_photo_attachments_r55($1,$2)",
          [revisionId, includeDeleted],
        )
      ).rows;
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  return {
    apiVersion: API_VERSION,
    revisionId,
    attachments: rows.map((row) => localPhotoAttachmentView(row, host)),
  };
}

async function finalizeLocalRevisionPhotoUpload(
  revisionId: string,
  uploadId: string,
  host: string,
) {
  const reservation = await localPhotoUploadReservation(uploadId);
  if (!reservation || reservation.parent_revision_id !== revisionId) {
    throw Object.assign(new Error("photo upload not found"), {
      code: "NOT_FOUND",
      httpStatus: 404,
    });
  }
  if (reservation.status === "committed") {
    const projection = await listLocalRevisionPhotoAttachments(
      revisionId,
      false,
      host,
    );
    const attachment = projection.attachments.find(
      (candidate) => candidate.attachmentId === reservation.attachment_id,
    );
    if (!attachment)
      throw Object.assign(new Error("committed photo projection missing"), {
        code: "PHOTO_ATTACHMENT_PROJECTION_MISSING",
        httpStatus: 409,
      });
    return { apiVersion: API_VERSION, attachment, created: false };
  }
  const stagedPath = photoObjectFilePath(reservation.staging_storage_key);
  if (!existsSync(stagedPath))
    throw Object.assign(new Error("photo object missing"), {
      code: "PHOTO_UPLOAD_OBJECT_MISSING",
      httpStatus: 409,
    });
  const bytes = readFileSync(stagedPath);
  const contentSha256 = createHash("sha256").update(bytes).digest("hex");
  const mimeType = localPhotoMime(bytes);
  if (
    bytes.length !== Number(reservation.expected_size_bytes) ||
    contentSha256 !== reservation.expected_content_sha256 ||
    mimeType !== reservation.expected_mime_type
  ) {
    unlinkSync(stagedPath);
    throw Object.assign(new Error("photo object integrity mismatch"), {
      code: "PHOTO_UPLOAD_INTEGRITY_MISMATCH",
      httpStatus: 422,
    });
  }
  const committedPath = photoObjectFilePath(reservation.committed_storage_key);
  mkdirSync(dirname(committedPath), { recursive: true });
  if (existsSync(committedPath)) {
    const committedBytes = readFileSync(committedPath);
    if (
      createHash("sha256").update(committedBytes).digest("hex") !==
      contentSha256
    ) {
      throw Object.assign(new Error("photo object collision"), {
        code: "PHOTO_UPLOAD_OBJECT_COLLISION",
        httpStatus: 409,
      });
    }
    unlinkSync(stagedPath);
  } else {
    renameSync(stagedPath, committedPath);
  }
  const databaseUrl = await modelDatabaseUrlForRevision(revisionId);
  try {
    const finalized = await withDatabaseClient(
      databaseUrl,
      async (client) =>
        (
          await client.query(
            `
      select * from public.estimate_finalize_row_photo_upload_r55($1,$2,$3,$4,$5,$6)
    `,
            [
              currentOwnerId(),
              uploadId,
              reservation.committed_storage_key,
              contentSha256,
              mimeType,
              bytes.length,
            ],
          )
        ).rows[0],
    );
    return {
      apiVersion: API_VERSION,
      attachment: localPhotoAttachmentView(finalized, host),
      created: finalized.created,
    };
  } catch (error) {
    const latest = await localPhotoUploadReservation(uploadId);
    if (
      latest?.status !== "committed" &&
      existsSync(committedPath) &&
      !existsSync(stagedPath)
    ) {
      mkdirSync(dirname(stagedPath), { recursive: true });
      renameSync(committedPath, stagedPath);
    }
    throw error;
  }
}

async function artifactBrowser(): Promise<Browser> {
  if (artifactBrowserInstance?.isConnected()) return artifactBrowserInstance;
  artifactBrowserInstance = null;
  if (artifactBrowserPromise) return artifactBrowserPromise;

  const launch = chromium.launch({ headless: true });
  artifactBrowserPromise = launch;
  try {
    const browser = await launch;
    artifactBrowserInstance = browser;
    browser.once("disconnected", () => {
      if (artifactBrowserInstance === browser) artifactBrowserInstance = null;
    });
    return browser;
  } finally {
    if (artifactBrowserPromise === launch) artifactBrowserPromise = null;
  }
}

function artifactBrowserDisconnected(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Target page, context or browser has been closed|browser.*(?:closed|disconnected)|Connection closed/iu.test(
    message,
  );
}

async function newArtifactPage(
  options?: Parameters<Browser["newPage"]>[0],
): ReturnType<Browser["newPage"]> {
  let lastError: unknown = new Error("artifact browser is unavailable");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const browser = await artifactBrowser();
    try {
      return await browser.newPage(options);
    } catch (error) {
      lastError = error;
      if (browser.isConnected() && !artifactBrowserDisconnected(error)) throw error;
      if (artifactBrowserInstance === browser) artifactBrowserInstance = null;
    }
  }
  throw Object.assign(
    new Error(lastError instanceof Error ? lastError.message : String(lastError)),
    { code: "ARTIFACT_BROWSER_DISCONNECTED", cause: lastError },
  );
}

async function withArtifactRenderTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Object.assign(new Error("PDF render timed out"), {
                code: "ARTIFACT_RENDER_TIMEOUT",
              }),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function countPdfPages(bytes: Buffer): number {
  const markers = bytes.toString("latin1").match(/\/Type\s*\/Page(?!s)\b/g);
  return Math.max(1, markers?.length ?? 0);
}

function professionalArtifactToken(input: {
  artifactId: string;
  expiresAt: number;
  ownerUserId: string;
  organizationId: string | null;
}): string {
  const claim = `${input.artifactId}.${input.expiresAt}.${input.ownerUserId}.${input.organizationId ?? "personal"}`;
  return createHmac("sha256", ARTIFACT_TOKEN_SECRET)
    .update(claim)
    .digest("base64url");
}

function artifactTokenMatches(input: {
  signature: string;
  artifactId: string;
  expiresAt: number;
  ownerUserId: string;
  organizationId: string | null;
}): boolean {
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= Date.now())
    return false;
  const expected = professionalArtifactToken(input);
  const actualBytes = Buffer.from(input.signature);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

async function buildArtifactClaimedJob(
  client: PoolClient,
  workerId: string,
  job: JsonRecord,
): Promise<void> {
  const revisionId = String(job.parent_revision_id ?? "");
  const revision = (
    await client.query("select * from public.estimate_revision where id=$1", [
      revisionId,
    ])
  ).rows[0];
  const allRows = (
    await client.query(
      "select * from public.estimate_revision_row where revision_id=$1 order by ordinal",
      [revisionId],
    )
  ).rows;
  if (!revision || allRows.length !== revision.row_count)
    throw Object.assign(new Error("artifact source invalid"), {
      code: "ARTIFACT_SOURCE_INVALID",
    });
  const selection = selectCanonicalArtifactRows(allRows);
  const estimateRows = selection.estimateRows;
  const rows =
    job.operation === "procurement" ? selection.procurementRows : estimateRows;
  let bytes: Buffer;
  let contentType: string;
  let extension: string;
  let renderer: string;
  let pageCount: number | null = null;
  let definitionVersionId: string | null = null;
  let grandTotalStatus: "COMPLETE" | "PARTIAL_NEEDS_PRICE" | null = null;
  if (job.operation === "procurement") {
    bytes = Buffer.from(
      canonicalEstimateStableJson(
        buildCanonicalProcurementProjection({
          revision,
          procurementRows: selection.procurementRows,
        }),
      ),
      "utf8",
    );
    contentType = "application/json; charset=utf-8";
    extension = "json";
    renderer = "canonical-procurement-local.r2";
  } else if (job.operation === "professional_pdf") {
    const identity = (
      await client.query(
        "select title_ru from public.estimate_work_identity where catalog_id=$1",
        [revision.catalog_id],
      )
    ).rows[0];
    definitionVersionId =
      String(revision.definition_version_id ?? "").trim() || null;
    if (!definitionVersionId) {
      throw Object.assign(
        new Error("professional artifact identity load failed"),
        { code: "ARTIFACT_IDENTITY_LOAD_FAILED" },
      );
    }
    const projection = buildCanonicalProfessionalPdfProjection({
      revision,
      rows,
      workTitleRu: String(
        revision.canonical_work_title_ru
          ?? revision.display_title_ru
          ?? identity?.title_ru
          ?? "Строительно-монтажные работы",
      ),
      definitionVersionId,
    });
    const page = await newArtifactPage({
      viewport: { width: 1240, height: 1754 },
    });
    try {
      await withArtifactRenderTimeout(
        page.setContent(projection.html, { waitUntil: "load" }),
        60_000,
      );
      bytes = Buffer.from(
        await withArtifactRenderTimeout(
          page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: projection.footerTemplate,
          }),
          90_000,
        ),
      );
    } finally {
      await page.close();
    }
    pageCount = countPdfPages(bytes);
    grandTotalStatus = projection.grandTotalStatus;
    contentType = "application/pdf";
    extension = "pdf";
    renderer = CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION;

  } else {
    const body = rows
      .map(
        (row) =>
          `<tr><td>${Number(row.ordinal) + 1}</td><td>${String(row.title_ru).replace(/[<>&]/g, "")}</td><td>${row.unit_id}</td><td>${row.quantity ?? "—"}</td><td>${row.amount ?? "—"}</td></tr>`,
      )
      .join("");
    const page = await newArtifactPage();
    try {
      await page.setContent(
        `<!doctype html><html lang="ru"><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:10px}td,th{border:1px solid #ccc;padding:4px}</style><h1>Каноническая смета</h1><p>Ревизия ${revisionId} · release ${revision.release_id}</p><table>${body}</table></html>`,
      );
      bytes = await page.pdf({ format: "A4", printBackground: true });
    } finally {
      await page.close();
    }
    contentType = "application/pdf";
    extension = "pdf";
    renderer = "playwright-local.r2";
  }
  const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `${job.owner_user_id}/${revisionId}/${job.operation}/${revision.checksum_sha256}.${extension}`;
  const path = artifactFilePath(storageKey);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  await client.query(
    "select public.estimate_commit_artifact_job_v1($1,$2,$3::jsonb)",
    [
      job.id,
      workerId,
      JSON.stringify({
        kind: job.operation,
        storageBucket: "local-estimate-artifacts",
        storageKey,
        contentType,
        byteSize: bytes.byteLength,
        sha256: artifactSha256,
        metadata: buildCanonicalArtifactMetadata({
          operation: job.operation as
            "pdf" | "professional_pdf" | "procurement",
          renderer,
          revision,
          sourceRowCount: selection.sourceRows.length,
          projectedRowCount: rows.length,
          selectedProcurementRowCount: selection.procurementRows.length,
          definitionVersionId,
          pageCount,
          grandTotalStatus,
        }),
      }),
    ],
  );
}

function cursorAfter(raw: string | null): number {
  if (!raw) return -1;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(decoded.ordinal) || decoded.ordinal < 0)
      throw new Error("invalid");
    return decoded.ordinal;
  } catch {
    throw Object.assign(new Error("invalid rows cursor"), {
      code: "INVALID_CURSOR",
      httpStatus: 400,
    });
  }
}

type LocalSearchCursor = {
  releaseId: string;
  snapshotSha256: string;
  orderKey: string;
  shown: number;
};

function searchCursor(raw: string | null): LocalSearchCursor | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      !decoded ||
      typeof decoded.releaseId !== "string" ||
      typeof decoded.snapshotSha256 !== "string" ||
      typeof decoded.orderKey !== "string" ||
      !Number.isSafeInteger(decoded.shown) ||
      decoded.shown < 0
    )
      throw new Error("invalid");
    return decoded;
  } catch {
    throw Object.assign(new Error("invalid search cursor"), {
      code: "INVALID_CURSOR",
      httpStatus: 400,
    });
  }
}

function normalizeSearchQuery(value: string): string {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/gu, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

type LocalCanonicalResourceSearchRow = {
  resourceId: string;
  definitionVersionId: string;
  sourceCatalogId: string | null;
  rowId: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste";
  unitId: string;
  semanticOwnerId: string;
  procurementEligible: boolean;
  sourceSearchText: string;
  publicSearchText: string;
};

let localCanonicalResourceIndexPromise: Promise<LocalCanonicalResourceSearchRow[]> | null = null;

function catalogIdFromResourceSemanticOwner(semanticOwnerId: string): string | null {
  return /^(canonical-work:(?:base|expanded):[^:]+):/u.exec(semanticOwnerId)?.[1] ?? null;
}

function resourceSearchTokens(query: string): string[] {
  return [...new Set(normalizeSearchQuery(query)
    .split(/\s+/u)
    .filter((token) => token.length >= 2)
    .map((token) => token.length > 4 ? token.slice(0, 4) : token))];
}

function localCanonicalResourceIndex(): Promise<LocalCanonicalResourceSearchRow[]> {
  if (localCanonicalResourceIndexPromise) return localCanonicalResourceIndexPromise;
  localCanonicalResourceIndexPromise = withSearchClient(async (client) => {
    const release = await localSearchRelease(client);
    const definitionVersionIds = (await client.query(`
      select distinct definition_version_id::text id
      from public.estimate_search_document
      where search_release_id=$1 and adjudication_class='EFFECTIVE_WORK'
        and selectable and definition_version_id is not null
      order by id
    `, [release.id])).rows.map((row) => String(row.id));
    return definitionVersionIds;
  }).then((definitionVersionIds) => Promise.all([
    withClient(async (client) => (await client.query(`
      select distinct on(lower(title_ru),row_type,unit_id)
        id::text resource_id,definition_version_id::text,row_id,title_ru,row_type,unit_id,
        semantic_owner,procurement_eligible
      from public.estimate_resource_spec
      where definition_version_id=any($1::uuid[]) and trim(title_ru)<>''
      order by lower(title_ru),row_type,unit_id,definition_version_id,row_id
    `, [definitionVersionIds])).rows),
    withClient(async (client) => (await client.query(`
      select catalog_id,title_ru from public.estimate_work_identity
      where retired_at is null
      order by catalog_id
    `)).rows),
  ])).then(([resources, identities]) => {
    const workTitleByCatalogId = new Map(
      identities.map((identity: Record<string, any>) => [
        String(identity.catalog_id),
        String(identity.title_ru),
      ]),
    );
    const unique = new Map<string, LocalCanonicalResourceSearchRow>();
    for (const resource of resources as Record<string, any>[]) {
      const semanticOwnerId = String(resource.semantic_owner ?? "").trim();
      const sourceCatalogId = catalogIdFromResourceSemanticOwner(semanticOwnerId);
      const workTitleRu = sourceCatalogId
        ? workTitleByCatalogId.get(sourceCatalogId) ?? null
        : null;
      const titleRu = normalizePublicBoqNameRu({
        sourceNameRu: String(resource.title_ru),
        workNameRu: workTitleRu,
      });
      if (
        !isPublicBoqNameStructurallyValid(titleRu, workTitleRu) ||
        isGenericPublicBoqResourceName(titleRu)
      ) continue;
      const rowType = String(resource.row_type) as LocalCanonicalResourceSearchRow["rowType"];
      if (!["material", "labor", "equipment", "service", "waste"].includes(rowType)) continue;
      const unitId = String(resource.unit_id ?? "").trim() || "pcs";
      const key = `${normalizeSearchQuery(titleRu)}\u001f${rowType}\u001f${unitId}`;
      if (unique.has(key)) continue;
      unique.set(key, {
        resourceId: String(resource.resource_id),
        definitionVersionId: String(resource.definition_version_id),
        sourceCatalogId,
        rowId: String(resource.row_id),
        titleRu,
        rowType,
        unitId,
        semanticOwnerId,
        procurementEligible: resource.procurement_eligible === true,
        sourceSearchText: normalizeSearchQuery(String(resource.title_ru)),
        publicSearchText: normalizeSearchQuery(titleRu),
      });
    }
    return [...unique.values()];
  }).catch((error) => {
    localCanonicalResourceIndexPromise = null;
    throw error;
  });
  return localCanonicalResourceIndexPromise;
}

type LocalSearchMode = "ANY" | "ALL" | "PHRASE";

function parseSearchIntent(
  rawQuery: string,
  requestedMode: string | null,
  requestedTokens: string[],
) {
  const quantityPattern =
    /(?:^|\s)(\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[,.](\d+))?\s*(кв\.?\s*м(?:етр(?:ов|а)?)?|квадратн(?:ых|ого|ые)?\s+метр(?:ов|а)?|м[²2]|шт(?:ук|ука|уки)?|штук(?:а|и)?|метр(?:ов|а|ы)?|тонн?(?:а|ы)?|кг|м|т)(?=\s|$)/iu;
  const quantityMatch = quantityPattern.exec(rawQuery.normalize("NFC"));
  const quantity = quantityMatch
    ? Number(
        `${quantityMatch[1]!.replace(/[\s\u00a0]/gu, "")}.${quantityMatch[2] ?? "0"}`,
      )
    : null;
  const rawUnit = String(quantityMatch?.[3] ?? "").toLocaleLowerCase("ru");
  const unit = !quantityMatch
    ? null
    : /^(?:кв|квадрат|м[²2])/u.test(rawUnit)
      ? "м²"
      : /^(?:шт|штук)/u.test(rawUnit)
        ? "шт"
        : /^(?:тон|т$)/u.test(rawUnit)
          ? "т"
          : rawUnit === "кг"
            ? "кг"
            : "м";
  const searchText = normalizeSearchQuery(
    quantityMatch
      ? `${rawQuery.slice(0, quantityMatch.index)} ${rawQuery.slice(quantityMatch.index + quantityMatch[0].length)}`
      : rawQuery,
  );
  const explicitMode = String(requestedMode ?? "")
    .trim()
    .toUpperCase();
  const inferredMode: LocalSearchMode = /\s+или\s+/iu.test(searchText)
    ? "ANY"
    : "PHRASE";
  const mode: LocalSearchMode = ["ANY", "ALL", "PHRASE"].includes(explicitMode)
    ? (explicitMode as LocalSearchMode)
    : inferredMode;
  const tokenSource =
    requestedTokens.length > 0
      ? requestedTokens
      : mode === "ANY"
        ? searchText.split(/\s+или\s+|\s*[,;|]\s*/iu)
        : mode === "ALL"
          ? searchText.split(/\s+и\s+|\s*[,;|]\s*/iu)
          : [searchText];
  const tokens = [
    ...new Set(
      tokenSource
        .map(normalizeSearchQuery)
        .filter((token) => (token.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2),
    ),
  ];
  return { rawQuery, searchText, quantity, unit, mode, tokens };
}

async function localSearchRelease(
  client: PoolClient,
): Promise<Record<string, any>> {
  const release = (
    await client.query(
      `select * from public.estimate_search_index_release
    where (($1::uuid is not null and id=$1) or ($1::uuid is null and status='active'))
    order by case when id=$1 then 0 else 1 end,activated_at desc nulls last,created_at desc limit 1`,
      [TARGET_SEARCH_RELEASE_ID || null],
    )
  ).rows[0];
  if (!release)
    throw Object.assign(new Error("active search release not found"), {
      code: "NOT_FOUND",
      httpStatus: 404,
    });
  return release;
}

const LOCAL_LITERAL_SEARCH_R58 = `
with tokens as materialized(
  select distinct unnest($2::text[]) q
), token_state as(
  select count(*)::int token_count from tokens
), source_hits as materialized(
  select source.catalog_id source_catalog_id,
    coalesce(source.canonical_target_catalog_id,source.catalog_id) resolved_catalog_id,
    count(distinct token.q)::int matched_count,
    bool_or(source.normalized_catalog_id=token.q or source.normalized_canonical_name=token.q) exact_name,
    bool_or(token.q=any(source.normalized_aliases)) exact_alias,
    bool_or(source.normalized_canonical_name like token.q||'%') prefix_name,
    bool_or(position(token.q in source.normalized_canonical_name)>0) literal_name,
    bool_or(position(token.q in source.normalized_search_blob)>0
      and position(token.q in source.normalized_canonical_name)=0) literal_alias,
    string_agg(distinct token.q,' | ' order by token.q) matched_term
  from public.estimate_search_document source
  cross join tokens token
  where source.search_release_id=$1
    and case upper($8)
      when 'REFERENCES' then source.adjudication_class='EXTERNAL_REFERENCE'
      else source.adjudication_class='EFFECTIVE_WORK' and source.selectable
        or source.adjudication_class in('ALIAS','DUPLICATE') and exists(
          select 1 from public.estimate_search_document target
          where target.search_release_id=source.search_release_id
            and target.catalog_id=source.canonical_target_catalog_id
            and target.adjudication_class='EFFECTIVE_WORK' and target.selectable)
    end
    and position(token.q in source.normalized_search_blob)>0
  group by source.catalog_id,source.canonical_target_catalog_id
), accepted as materialized(
  select hit.*,
    case when hit.exact_name then 1 when hit.exact_alias then 2 when hit.prefix_name then 3
      when hit.literal_alias and not hit.literal_name then 4 else 5 end tier
  from source_hits hit cross join token_state state
  where (upper($3)='ANY' and hit.matched_count>0)
    or (upper($3)='ALL' and state.token_count>0 and hit.matched_count=state.token_count)
    or (upper($3)='PHRASE' and state.token_count=1 and hit.matched_count=1)
), filtered as materialized(
  select hit.*,target.catalog_origin,target.group_id,target.domain_id,target.system_id,target.work_family_id,
    row_number() over(partition by hit.resolved_catalog_id order by hit.tier,
      hit.source_catalog_id=hit.resolved_catalog_id desc,hit.source_catalog_id) resolved_ordinal
  from accepted hit
  join public.estimate_search_document target
    on target.search_release_id=$1 and target.catalog_id=hit.resolved_catalog_id
  where (coalesce($4,'')='' or target.domain_id=$4)
    and (coalesce($5,'')='' or target.group_id=$5)
    and (coalesce($6,'')='' or target.operation_kind=$6)
), deduplicated as materialized(
  select filtered.*,
    concat_ws(E'\\u001f',lpad(filtered.tier::text,2,'0'),filtered.domain_id,
      filtered.system_id,filtered.work_family_id,filtered.resolved_catalog_id) stable_order_key
  from filtered where resolved_ordinal=1
), summary as materialized(
  select count(*)::bigint literal_total_count,
    count(*) filter(where catalog_origin='GLOBAL')::bigint global_literal_total_count,
    count(*) filter(where catalog_origin<>'GLOBAL')::bigint external_literal_total_count,
    count(distinct group_id)::bigint group_total_count,
    encode(extensions.digest(convert_to(coalesce(string_agg(
      resolved_catalog_id||E'\\u001f'||tier::text||E'\\u001f'||stable_order_key,
      E'\\n' order by stable_order_key),''),'UTF8'),'sha256'),'hex') result_set_sha256
  from deduplicated
), page as(
  select hit.*,summary.* from deduplicated hit cross join summary
  where $7::text is null or hit.stable_order_key>$7
  order by hit.stable_order_key limit $9
)
select document.*,group_row.group_name_ru,page.source_catalog_id,page.tier,page.matched_term,
  page.stable_order_key,page.literal_total_count,page.global_literal_total_count,
  page.external_literal_total_count,page.group_total_count,page.result_set_sha256
from page
join public.estimate_search_document document
  on document.search_release_id=$1 and document.catalog_id=page.resolved_catalog_id
join public.estimate_search_group group_row
  on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
order by page.stable_order_key`;

function levenshtein(left: string, right: string): number {
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = prior[0]!;
    prior[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = prior[rightIndex]!;
      prior[rightIndex] = Math.min(
        prior[rightIndex]! + 1,
        prior[rightIndex - 1]! + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return prior[right.length]!;
}

function fuzzySearchPage(
  rows: Record<string, any>[],
  query: string,
  after: string | null,
  limit: number,
) {
  const queryTokens = query.split(" ").filter(Boolean);
  const ranked = rows
    .flatMap<Record<string, any>>((row) => {
      const terms = [
        ...new Set(
          [
            row.normalized_canonical_name,
            ...(row.normalized_search_terms ?? []),
          ]
            .map(String)
            .filter(Boolean),
        ),
      ];
      const best = queryTokens
        .map(
          (queryToken) =>
            terms
              .filter((term) => term.slice(0, 2) === queryToken.slice(0, 2))
              .map((term) => ({
                term,
                distance: levenshtein(queryToken, term),
              }))
              .sort(
                (left, right) =>
                  left.distance - right.distance ||
                  left.term.localeCompare(right.term, "ru"),
              )[0],
        )
        .filter(Boolean) as { term: string; distance: number }[];
      if (best.length !== queryTokens.length) return [];
      const maximumDistance = best.reduce(
        (sum, item) => sum + item.distance,
        0,
      );
      const allowedDistance = queryTokens.reduce(
        (sum, token) => sum + Math.max(1, Math.floor(token.length * 0.34)),
        0,
      );
      if (maximumDistance > allowedDistance) return [];
      const score = Math.max(
        0,
        1 - maximumDistance / Math.max(1, queryTokens.join("").length),
      );
      const stableOrderKey = `06\u001f${String(Math.round((1 - score) * 1_000_000)).padStart(7, "0")}\u001f${row.catalog_id}`;
      return [
        {
          ...row,
          source_catalog_id: row.catalog_id,
          tier: 6,
          matched_term: best.map((item) => item.term).join(" | "),
          stable_order_key: stableOrderKey,
          score,
        } as Record<string, any>,
      ];
    })
    .sort((left, right) =>
      String(left.stable_order_key).localeCompare(
        String(right.stable_order_key),
      ),
    );
  const resultSetSha256 = createHash("sha256")
    .update(
      canonicalEstimateStableJson(
        ranked.map((row) => [row.catalog_id, row.score, row.stable_order_key]),
      ),
    )
    .digest("hex");
  const groupTotalCount = new Set(ranked.map((row) => row.group_id)).size;
  const page = ranked
    .filter((row) => after == null || row.stable_order_key > after)
    .slice(0, limit)
    .map((row) => ({
      ...row,
      fuzzy_total_count: ranked.length,
      group_total_count: groupTotalCount,
      result_set_sha256: resultSetSha256,
      literal_total_count: 0,
      global_literal_total_count: 0,
      external_literal_total_count: 0,
    }));
  return page;
}

function localParameterGuideView(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source))
    return undefined;
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

function localParameterNormativeLinks(
  truth: Record<string, any>,
  effectiveGuide: unknown,
) {
  if (
    Array.isArray(truth.normative_links) &&
    truth.normative_links.length > 0
  ) {
    return truth.normative_links;
  }
  if (
    !effectiveGuide ||
    typeof effectiveGuide !== "object" ||
    Array.isArray(effectiveGuide)
  )
    return [];
  const guide = effectiveGuide as Record<string, unknown>;
  const sourceDocument = String(guide.source_document ?? "").trim();
  const sourceLocator = String(guide.source_locator ?? "").trim();
  if (!sourceDocument || !sourceLocator) return [];
  return [
    {
      sourceId: sourceDocument,
      documentTitleRu: sourceDocument,
      editionStatus: String(
        guide.source_edition_status ?? guide.guide_version ?? "",
      ).trim(),
      locator: sourceLocator,
      applicabilityRu: String(guide.applicability ?? "").trim(),
      verifiedAt: String(guide.verified_at ?? "").trim(),
      verifiedSource: String(
        guide.source_role ?? "APPROVED_TEMPLATE_BASELINE",
      ).trim(),
    },
  ];
}

function localDraftView(row: Record<string, any>) {
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

function localRevisionView(revision: Record<string, any>) {
  return {
    apiVersion: API_VERSION,
    revisionId: revision.id,
    parentRevisionId: revision.parent_revision_id,
    releaseId: revision.release_id,
    catalogId: revision.catalog_id,
    revisionNumber: revision.revision_number,
    status: revision.status,
    currencyCode: revision.currency_code,
    parameters: revision.input_parameters,
    sourceRequestText: revision.source_request_text ?? null,
    sourceRequestHash: revision.source_request_hash ?? null,
    canonicalWorkTitleRu: revision.canonical_work_title_ru ?? null,
    displayTitleRu: revision.display_title_ru ?? null,
    primaryMeasureParameterId: revision.primary_measure_parameter_id ?? null,
    primaryMeasureValue:
      revision.primary_measure_value == null
        ? null
        : String(revision.primary_measure_value),
    primaryMeasureUnitId: revision.primary_measure_unit_id ?? null,
    normalizedIntent: revision.normalized_intent ?? null,
    definitionVersionId: revision.definition_version_id ?? null,
    groupId: revision.group_id ?? null,
    searchReleaseId: revision.search_release_id ?? null,
    userInputSnapshot: revision.user_input_snapshot ?? null,
    acceptedBaselineSnapshot: revision.accepted_baseline_snapshot ?? null,
    assumptionSnapshot: revision.assumption_snapshot ?? null,
    formulaGraphVersion: revision.formula_graph_version ?? null,
    revisionContractVersion: revision.revision_contract_version ?? null,
    amendmentContract: revision.amendment_contract,
    totals: revision.totals,
    rowCount: revision.row_count,
    checksumSha256: revision.checksum_sha256,
    compilerVersion: revision.compiler_version,
    definitionVersion: revision.definition_version ?? null,
    compilerOwner: revision.compiler_owner ?? "backend",
    parameterSchemaHash: revision.parameter_schema_hash ?? null,
    inputHash: revision.input_hash ?? null,
    outputHash: revision.output_hash ?? revision.checksum_sha256,
    createdAt: revision.created_at,
  };
}

function localParameterSessionSchema(
  catalogId: string,
  parameters: Record<string, any>[],
  baseline: Record<string, any> | null,
) {
  return parameters.map((parameter) => {
    const truth =
      parameter.truth_metadata && typeof parameter.truth_metadata === "object"
        ? parameter.truth_metadata
        : {};
    const parameterId = String(parameter.parameter_id);
    const acceptedAsInput =
      baseline != null &&
      Object.prototype.hasOwnProperty.call(
        baseline.input_values ?? {},
        parameterId,
      );
    const acceptedGuide = String(
      baseline?.guide_provenance_ru?.[parameterId] ?? "",
    ).trim();
    const formulaConsumers =
      Array.isArray(truth.formula_consumers) &&
      truth.formula_consumers.length > 0
        ? truth.formula_consumers
        : Array.isArray(baseline?.formula_consumer_ids?.[parameterId])
          ? baseline.formula_consumer_ids[parameterId]
          : [];
    const resourceConsumers =
      Array.isArray(truth.resource_branch_consumers) &&
      truth.resource_branch_consumers.length > 0
        ? truth.resource_branch_consumers
        : Array.isArray(baseline?.resource_consumer_row_ids?.[parameterId])
          ? baseline.resource_consumer_row_ids[parameterId]
          : [];
    const normativeSources = Array.isArray(
      baseline?.normative_source_ids?.[parameterId],
    )
      ? baseline.normative_source_ids[parameterId]
      : [];
    const baselineGuide =
      acceptedGuide && baseline
        ? {
            guide_kind: "PROJECT_DEFINED",
            guide_short_ru: acceptedGuide,
            source_role: "PROJECT_DOCUMENTATION",
            guide_validation_policy: "INFORMATION_ONLY",
            source_document:
              normativeSources.join(", ") || "APPROVED_TEMPLATE_BASELINE",
            source_edition_status: baseline.contract_version,
            source_locator: String(
              baseline.proposal_source_refs?.[0]?.sha256 ?? baseline.id,
            ),
            guide_version: baseline.contract_version,
            source_snapshot_hash: baseline.acceptance_evidence_sha256,
            applicability: `Только для выбранной работы ${catalogId}.`,
            verified_at: baseline.accepted_at,
          }
        : undefined;
    const effectiveGuide = baselineGuide
      ? { ...baselineGuide, ...(truth.guide ?? {}) }
      : truth.guide;
    const composite =
      truth.composite_item_schema &&
      typeof truth.composite_item_schema === "object"
        ? (truth.composite_item_schema as Record<string, any>)
        : null;
    return {
      parameterId,
      ordinal: parameter.ordinal,
      valueType: parameter.value_type,
      unitId: parameter.unit_id,
      titleRu: parameter.title_ru,
      required: parameter.required,
      defaultValue:
        parameter.default_value ??
        (acceptedAsInput ? baseline?.input_values?.[parameterId] : null),
      constraints: parameter.constraints_json,
      semanticParameterKey:
        truth.semantic_parameter_key ?? (baseline ? parameterId : undefined),
      visibilityRole:
        truth.visibility_role ??
        (baseline
          ? acceptedAsInput
            ? "USER_INPUT"
            : "INTERNAL_ONLY"
          : undefined),
      descriptionRu: truth.description_ru,
      requiredWhen: truth.required_when,
      visibleWhen: truth.visible_when,
      allowedRangeOrOptions: truth.allowed_range_or_options,
      defaultPolicy: truth.default_policy,
      valueSourceRole:
        truth.value_source_role ??
        (baseline
          ? acceptedAsInput
            ? "PROJECT_DOCUMENTATION"
            : "BACKEND_DERIVED"
          : undefined),
      guide: localParameterGuideView(effectiveGuide),
      compositeItemSchema: composite
        ? {
            itemLabelRu: composite.item_label_ru,
            minimumItems: composite.minimum_items,
            maximumItems: composite.maximum_items,
            reorderable: composite.reorderable === true,
            subfields: Array.isArray(composite.subfields)
              ? composite.subfields.map((subfield: Record<string, any>) => ({
                  subfieldId: subfield.subfield_id,
                  labelRu: subfield.label_ru,
                  valueType: subfield.value_type,
                  unitId: subfield.unit_id,
                  required: subfield.required === true,
                  constraints: subfield.constraints ?? {},
                  guide: localParameterGuideView(subfield.guide),
                  formulaConsumers: subfield.formula_consumers ?? [],
                  resourceBranchConsumers:
                    subfield.resource_branch_consumers ?? [],
                }))
              : [],
          }
        : undefined,
      sharedInputBindingPolicy: truth.shared_input_binding_policy,
      derivedFrom: truth.derived_from,
      normativeLinks: localParameterNormativeLinks(truth, effectiveGuide),
      formulaConsumers,
      resourceBranchConsumers: resourceConsumers,
      validationRules:
        Array.isArray(truth.validation_rules) &&
        truth.validation_rules.length > 0
          ? truth.validation_rules
          : baseline
            ? ["declared_type", "work_specific_applicability"]
            : truth.validation_rules,
      conflictsWith: truth.conflicts_with,
      provenance:
        truth.provenance && Object.keys(truth.provenance).length > 0
          ? truth.provenance
          : baseline
            ? {
                owner: "backend",
                contract: baseline.contract_version,
                approvedTemplateBaselineId: baseline.id,
                acceptanceEvidenceSha256: baseline.acceptance_evidence_sha256,
              }
            : truth.provenance,
    };
  });
}

async function localParameterSessionSnapshot(revisionId: string) {
  const modelDatabaseUrl = await modelDatabaseUrlForRevision(revisionId);
  return withDatabaseClient(modelDatabaseUrl, async (client) => {
    const revision = (
      await client.query(
        "select * from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
        [revisionId, currentOwnerId(), currentTenantId()],
      )
    ).rows[0];
    if (!revision) return null;
    const parent =
      revision.parent_revision_id == null
        ? null
        : ((
            await client.query(
              "select * from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
              [
                revision.parent_revision_id,
                currentOwnerId(),
                currentTenantId(),
              ],
            )
          ).rows[0] ?? null);
    const identity = (
      await client.query(
        "select * from public.estimate_work_identity where catalog_id=$1 and retired_at is null",
        [revision.catalog_id],
      )
    ).rows[0];
    const definition = (
      await client.query(
        `select version.*,manifest.release_id cumulative_release_id,
        manifest.approved_template_baseline_id cumulative_baseline_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`,
        [revision.release_id, revision.catalog_id],
      )
    ).rows[0];
    if (!identity || !definition) return null;
    const parameters = (
      await client.query(
        "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
        [definition.id],
      )
    ).rows;
    const baseline =
      definition.cumulative_baseline_id == null
        ? null
        : ((
            await client.query(
              `
      select id,contract_version,acceptance_evidence_sha256,accepted_at,input_values,input_classification,
        formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs
      from public.estimate_approved_template_baseline where id=$1`,
              [definition.cumulative_baseline_id],
            )
          ).rows[0] ?? null);
    return {
      revision: localRevisionView(revision),
      parent: parent == null ? null : localRevisionView(parent),
      catalog: {
        catalogId: identity.catalog_id,
        releaseId: definition.cumulative_release_id,
        namespace: identity.namespace,
        domain: identity.domain,
        workKey: identity.work_key,
        titleRu: canonicalDefinitionTitleRu({ ...definition, title_ru: identity.title_ru }),
        definitionVersion: definition.definition_version,
        applicability: definition.applicability,
        professionalMetadata: definition.source_metadata,
        parameterSchema: localParameterSessionSchema(
          String(identity.catalog_id),
          parameters,
          baseline,
        ),
      },
    };
  });
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  const path = url.pathname
    .split("/")
    .filter(Boolean)
    .filter((part, index) => !(index === 0 && part === "canonical-estimate"));
  if (
    request.method === "GET" &&
    path.length === 2 &&
    path[0] === "artifact-files"
  ) {
    const artifact = await findAcrossModelDatabases(
      async (client) =>
        (
          await client.query(
            `
      select a.*,r.owner_user_id,r.organization_id from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
      where a.id=$1 and a.status='ready'
    `,
            [path[1]],
          )
        ).rows[0],
    );
    if (!artifact?.storage_key)
      throw Object.assign(new Error("artifact file not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    const expiresAt = Number(url.searchParams.get("expires"));
    const signature = String(url.searchParams.get("signature") ?? "");
    if (
      !artifactTokenMatches({
        signature,
        artifactId: artifact.id,
        expiresAt,
        ownerUserId: artifact.owner_user_id,
        organizationId: artifact.organization_id ?? null,
      })
    ) {
      throw Object.assign(new Error("artifact signature invalid"), {
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    }
    const bytes = readFileSync(artifactFilePath(artifact.storage_key));
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": artifact.content_type,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
    });
    response.end(bytes);
    return;
  }
  if (
    request.method === "PUT" &&
    path.length === 2 &&
    path[0] === "photo-upload-files"
  ) {
    const reservation = await localPhotoUploadReservation(path[1], null);
    if (!reservation || reservation.status !== "staged") {
      throw Object.assign(new Error("photo upload not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    }
    const expiresAt = Number(url.searchParams.get("expires"));
    const signature = String(url.searchParams.get("signature") ?? "");
    if (
      !localPhotoTokenMatches({
        purpose: "upload",
        identity: reservation.id,
        expiresAt,
        signature,
      })
    ) {
      throw Object.assign(new Error("photo upload signature invalid"), {
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    }
    const declaredMime = String(request.headers["content-type"] ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const bytes = await readBinaryBody(request);
    const contentSha256 = createHash("sha256").update(bytes).digest("hex");
    const detectedMime = localPhotoMime(bytes);
    if (
      bytes.length !== Number(reservation.expected_size_bytes) ||
      contentSha256 !== reservation.expected_content_sha256 ||
      detectedMime !== reservation.expected_mime_type ||
      declaredMime !== reservation.expected_mime_type
    ) {
      throw Object.assign(new Error("photo upload integrity mismatch"), {
        code: "PHOTO_UPLOAD_INTEGRITY_MISMATCH",
        httpStatus: 422,
      });
    }
    const destination = photoObjectFilePath(reservation.staging_storage_key);
    mkdirSync(dirname(destination), { recursive: true });
    if (existsSync(destination)) {
      const existingHash = createHash("sha256")
        .update(readFileSync(destination))
        .digest("hex");
      if (existingHash !== contentSha256) {
        throw Object.assign(new Error("photo upload collision"), {
          code: "PHOTO_UPLOAD_OBJECT_COLLISION",
          httpStatus: 409,
        });
      }
    } else {
      const temporary = `${destination}.incoming-${randomUUID()}`;
      try {
        writeFileSync(temporary, bytes, { flag: "wx" });
        const written = readFileSync(temporary);
        if (
          written.length !== bytes.length ||
          createHash("sha256").update(written).digest("hex") !== contentSha256
        ) {
          throw Object.assign(
            new Error("photo upload write verification failed"),
            { code: "PHOTO_UPLOAD_WRITE_FAILED", httpStatus: 507 },
          );
        }
        renameSync(temporary, destination);
      } finally {
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    }
    return send(response, 201, { uploaded: true, uploadId: reservation.id });
  }
  if (
    request.method === "GET" &&
    path.length === 2 &&
    path[0] === "photo-attachment-files"
  ) {
    const attachment = await findAcrossModelDatabases(
      async (client) =>
        (
          await client.query(
            `
      with latest as (
        select distinct on (attachment_id) attachment_id,status
        from public.estimate_revision_photo_attachment_event
        order by attachment_id,created_at desc,event_id desc
      )
      select a.*,latest.status attachment_status
      from public.estimate_revision_photo_attachment a
      join latest on latest.attachment_id=a.attachment_id
      where a.attachment_id=$1 and latest.status='committed'
    `,
            [path[1]],
          )
        ).rows[0],
    );
    if (!attachment)
      throw Object.assign(new Error("photo attachment not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    const expiresAt = Number(url.searchParams.get("expires"));
    const signature = String(url.searchParams.get("signature") ?? "");
    if (
      !localPhotoTokenMatches({
        purpose: "download",
        identity: attachment.attachment_id,
        expiresAt,
        signature,
      })
    ) {
      throw Object.assign(new Error("photo attachment signature invalid"), {
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    }
    const bytes = readFileSync(
      photoObjectFilePath(attachment.storage_object_key),
    );
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": attachment.mime_type,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(bytes);
    return;
  }
  if (!requestPrincipalStorage.getStore()) {
    const principal = await requireLocalPrincipal(request);
    return requestPrincipalStorage.run(principal, () =>
      route(request, response),
    );
  }
  if (
    request.method === "GET" &&
    path.length === 1 &&
    path[0] === "connection-audit"
  ) {
    const pools = [...databasePools.entries()].map(
      ([connectionString, pool]) => ({
        database: new URL(connectionString).pathname.replace(/^\//u, ""),
        maximum: LOCAL_DATABASE_POOL_MAX,
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      }),
    );
    return send(response, 200, {
      apiVersion: API_VERSION,
      poolMaximumPerDatabaseIdentity: LOCAL_DATABASE_POOL_MAX,
      distinctDatabasePools: pools.length,
      totalCheckouts: databaseConnectionAudit.totalCheckouts,
      activeCheckouts: databaseConnectionAudit.activeCheckouts,
      maximumActiveCheckouts: databaseConnectionAudit.maximumActiveCheckouts,
      burstConnections: false,
      pools,
    });
  }
  if (
    request.method === "GET" &&
    path.length === 1 &&
    path[0] === "runtime-manifest"
  ) {
    const modelDatabase = await withClient(async (client) => {
      const definitionRelease =
        (
          await client.query(`
        select id,status,source_manifest_sha256 from public.estimate_definition_release
        where (($1::uuid is not null and id=$1) or ($1::uuid is null and status='active'))
        order by case when id=$1 then 0 else 1 end,activated_at desc nulls last,created_at desc limit 1
      `, [TARGET_RELEASE_ID || null])
        ).rows[0] ?? null;
      const counts = (
        await client.query(`select
        (select count(*)::integer from public.estimate_definition_version d
          join public.estimate_definition_release r on r.id=d.release_id
          where (($1::uuid is not null and r.id=$1) or ($1::uuid is null and r.status='active'))) active_definitions,
        (select count(*)::integer from public.estimate_compile_job
          where upper(status) in ('QUEUED','RUNNING','CLAIMED','RETRY_WAIT')) active_compile_jobs
      `, [TARGET_RELEASE_ID || null])
      ).rows[0];
      const capability = (
        await client.query(`
          select id::text,environment,tenant_id::text,release_id::text,search_release_id::text,
                 source_head,source_tree,purpose,expires_at,revoked_at,issued_by,created_at
          from public.estimate_candidate_capability_r3
          where (($1::uuid is not null and id=$1) or (
            $1::uuid is null and environment=$2 and tenant_id=$3 and release_id=$4
            and search_release_id=$5 and source_head=$6 and source_tree=$7
          ))
          order by created_at desc,id limit 1
        `, [
          R3_CAPABILITY_ID || null,
          R3_CAPABILITY_ENVIRONMENT,
          currentTenantId(),
          R3_CAPABILITY_RELEASE_ID || null,
          R3_CAPABILITY_SEARCH_RELEASE_ID || null,
          R3_CAPABILITY_SOURCE_HEAD,
          R3_CAPABILITY_SOURCE_TREE,
        ])
      ).rows[0] ?? null;
      return { definitionRelease, counts, capability };
    });
    const searchDatabase = await withSearchClient(async (client) => {
      const searchRelease =
        (
          await client.query(
            `
        select id,status,snapshot_sha256,taxonomy_version,group_relation_version,ranking_contract_version
        from public.estimate_search_index_release
        where (($1::uuid is not null and id=$1) or ($1::uuid is null and status='active'))
        order by case when id=$1 then 0 else 1 end,activated_at desc nulls last,created_at desc limit 1
      `,
            [TARGET_SEARCH_RELEASE_ID || null],
          )
        ).rows[0] ?? null;
      const counts = (
        await client.query(`select
        (select count(*)::integer from public.estimate_search_document d
          join public.estimate_search_index_release r on r.id=d.search_release_id
          where (($1::uuid is not null and r.id=$1) or ($1::uuid is null and r.status='active'))) active_search_documents
      `, [TARGET_SEARCH_RELEASE_ID || null])
      ).rows[0];
      return { searchRelease, counts };
    });
    const parsedDatabaseUrl = new URL(DATABASE_URL);
    const parsedSearchDatabaseUrl = new URL(SEARCH_DATABASE_URL);
    const capabilityExpiresAt = modelDatabase.capability?.expires_at
      ? new Date(modelDatabase.capability.expires_at).getTime()
      : Number.NaN;
    const capabilityStatus = !modelDatabase.capability
      ? "MISSING"
      : modelDatabase.capability.revoked_at
        ? "REVOKED"
        : !Number.isFinite(capabilityExpiresAt) || capabilityExpiresAt <= Date.now()
          ? "EXPIRED"
          : "ACTIVE";
    return send(response, 200, {
      schemaVersion: "p0-estimate-truth-remediation-r568-r4-a4-runtime-manifest.v1",
      runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND",
      processId: process.pid,
      parentProcessId: process.ppid,
      startedAt: R45_RUNTIME_STARTED_AT,
      workingDirectory: process.cwd(),
      sourceHead: R45_RUNTIME_SOURCE_HEAD,
      sourceTree: R45_RUNTIME_SOURCE_TREE,
      runtimeSourceSha256: CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256,
      specSha256: R45_RUNTIME_SPEC_SHA256,
      authMode: LOCAL_AUTH_MODE,
      authPrincipalContractVersion: "r52-a7.strict-principal.v1",
      principalResolutionRpc:
        LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION"
          ? SUPABASE_PRINCIPAL_RPC
          : null,
      capabilityTenantBinding: R3_CAPABILITY_TENANT_BINDING,
      capability: modelDatabase.capability ? {
        id: modelDatabase.capability.id,
        environment: modelDatabase.capability.environment,
        tenantId: modelDatabase.capability.tenant_id,
        releaseId: modelDatabase.capability.release_id,
        searchReleaseId: modelDatabase.capability.search_release_id,
        sourceHead: modelDatabase.capability.source_head,
        sourceTree: modelDatabase.capability.source_tree,
        purpose: modelDatabase.capability.purpose,
        expiresAt: modelDatabase.capability.expires_at,
        status: capabilityStatus,
        ttlSeconds: Number.isFinite(capabilityExpiresAt)
          ? Math.max(0, Math.floor((capabilityExpiresAt - Date.now()) / 1_000))
          : 0,
      } : null,
      frontendBuildIdentity: {
        sourceTreeHash: R568_FRONTEND_SOURCE_TREE_HASH,
        productSourceHash: R568_FRONTEND_PRODUCT_SOURCE_HASH,
        jsBundleFingerprint: R568_FRONTEND_JS_BUNDLE_FINGERPRINT,
        buildCommit: R568_FRONTEND_BUILD_COMMIT,
      },
      databasePoolMaximum: LOCAL_DATABASE_POOL_MAX,
      database: {
        host: parsedDatabaseUrl.hostname,
        port: parsedDatabaseUrl.port,
        name: parsedDatabaseUrl.pathname.replace(/^\//, ""),
        searchOnly: false,
      },
      searchDatabase: {
        host: parsedSearchDatabaseUrl.hostname,
        port: parsedSearchDatabaseUrl.port,
        name: parsedSearchDatabaseUrl.pathname.replace(/^\//, ""),
      },
      definitionRelease: modelDatabase.definitionRelease,
      searchRelease: searchDatabase.searchRelease,
      activeDefinitionCount: Number(
        modelDatabase.counts?.active_definitions ?? 0,
      ),
      activeSearchDocumentCount: Number(
        searchDatabase.counts?.active_search_documents ?? 0,
      ),
      activeCompileJobCount: Number(modelDatabase.counts?.active_compile_jobs ?? 0),
      compatibilityTuple: {
        definitionReleaseId: modelDatabase.definitionRelease?.id ?? null,
        searchReleaseId: searchDatabase.searchRelease?.id ?? null,
        sourceHead: R45_RUNTIME_SOURCE_HEAD,
        sourceTree: R45_RUNTIME_SOURCE_TREE,
        frontendSourceTreeHash: R568_FRONTEND_SOURCE_TREE_HASH,
        frontendProductSourceHash: R568_FRONTEND_PRODUCT_SOURCE_HASH,
        frontendJsBundleFingerprint: R568_FRONTEND_JS_BUNDLE_FINGERPRINT,
        backendRuntimeSourceSha256: CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256,
        capabilityId: modelDatabase.capability?.id ?? null,
      },
    });
  }
  if (
    request.method === "GET" &&
    path.length === 2 &&
    path[0] === "search" &&
    path[1] === "resources"
  ) {
    const startedAt = performance.now();
    const query = String(url.searchParams.get("query") ?? "")
      .trim()
      .slice(0, 240);
    const normalizedQuery = normalizeSearchQuery(query);
    const tokens = resourceSearchTokens(query);
    if ((normalizedQuery.match(/[\p{L}\p{N}]/gu) ?? []).length < 2 || tokens.length === 0) {
      throw Object.assign(new Error("Введите не менее двух значимых символов."), {
        code: "SEARCH_MIN_SIGNIFICANT_CHARS",
        httpStatus: 400,
      });
    }
    const requestedKind = String(url.searchParams.get("kind") ?? "all")
      .trim()
      .toLocaleLowerCase("en-US");
    if (!["all", "material", "labor", "equipment", "service"].includes(requestedKind)) {
      throw Object.assign(new Error("invalid resource kind"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 50) || 50),
    );
    const candidates = (await localCanonicalResourceIndex())
      .filter((row) => requestedKind === "all"
        ? row.rowType !== "waste"
        : row.rowType === requestedKind)
      .filter((row) => tokens.every((token) =>
        row.publicSearchText.includes(token) || row.sourceSearchText.includes(token)))
      .map((row) => ({
        row,
        matchType: row.publicSearchText === normalizedQuery
          ? "EXACT" as const
          : row.publicSearchText.startsWith(normalizedQuery)
            ? "PREFIX" as const
            : "SUBSTRING" as const,
      }))
      .sort((left, right) => {
        const rank = { EXACT: 0, PREFIX: 1, SUBSTRING: 2 } as const;
        return rank[left.matchType] - rank[right.matchType]
          || left.row.titleRu.localeCompare(right.row.titleRu, "ru")
          || left.row.rowType.localeCompare(right.row.rowType)
          || left.row.unitId.localeCompare(right.row.unitId)
          || left.row.resourceId.localeCompare(right.row.resourceId);
      });
    return send(response, 200, {
      apiVersion: API_VERSION,
      definitionReleaseId: TARGET_RELEASE_ID,
      searchIndexReleaseId: TARGET_SEARCH_RELEASE_ID,
      normalizedQuery,
      resourceIndexContractVersion: "canonical-resource-search.r568.v1",
      totalCount: candidates.length,
      shownCount: Math.min(candidates.length, limit),
      items: candidates.slice(0, limit).map(({ row, matchType }) => ({
        resourceId: row.resourceId,
        definitionVersionId: row.definitionVersionId,
        definitionReleaseId: TARGET_RELEASE_ID,
        sourceCatalogId: row.sourceCatalogId,
        rowId: row.rowId,
        titleRu: row.titleRu,
        rowType: row.rowType,
        unitId: row.unitId,
        semanticOwnerId: row.semanticOwnerId,
        procurementEligible: row.procurementEligible,
        matchType,
      })),
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
    });
  }
  if (
    request.method === "GET" &&
    path.length === 2 &&
    path[0] === "search" &&
    path[1] === "catalog"
  ) {
    const startedAt = performance.now();
    const query = String(url.searchParams.get("query") ?? "")
      .trim()
      .slice(0, 240);
    const intent = parseSearchIntent(
      query,
      url.searchParams.get("mode"),
      url.searchParams.getAll("token"),
    );
    if (intent.tokens.length === 0)
      throw Object.assign(
        new Error("Введите не менее двух значимых символов."),
        { code: "SEARCH_MIN_SIGNIFICANT_CHARS", httpStatus: 400 },
      );
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 50) || 50),
    );
    const cursor = searchCursor(url.searchParams.get("cursor"));
    const filters = Object.fromEntries(
      [
        ["domain_id", String(url.searchParams.get("domain") ?? "").trim()],
        ["group_id", String(url.searchParams.get("groupId") ?? "").trim()],
        [
          "operation_kind",
          String(url.searchParams.get("operationKind") ?? "").trim(),
        ],
      ].filter((entry) => entry[1]),
    );
    const scope =
      String(url.searchParams.get("scope") ?? "WORKS").toUpperCase() ===
      "REFERENCES"
        ? "REFERENCES"
        : "WORKS";
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (
        cursor &&
        (cursor.releaseId !== release.id ||
          cursor.snapshotSha256 !== release.snapshot_sha256)
      )
        throw Object.assign(
          new Error("Поисковый индекс обновился. Повторите запрос."),
          { code: "STALE_SEARCH_SNAPSHOT", httpStatus: 409 },
        );
      let rows = (
        await client.query(LOCAL_LITERAL_SEARCH_R58, [
          release.id,
          intent.tokens,
          intent.mode,
          filters.domain_id ?? "",
          filters.group_id ?? "",
          filters.operation_kind ?? "",
          cursor?.orderKey ?? null,
          scope,
          limit,
        ])
      ).rows;
      let resultLevel: "LITERAL" | "FUZZY" = "LITERAL";
      if (rows.length === 0 && intent.mode === "PHRASE" && scope === "WORKS") {
        const candidates = (
          await client.query(
            `select document.catalog_id,document.definition_version_id,
          document.definition_release_id,document.canonical_name_ru,document.group_id,group_row.group_name_ru,
          document.domain_id,document.system_id,document.subsystem_id,document.assembly_id,
          document.work_family_id,document.element_type,document.operation_kind,document.technology_variant,
          document.primary_uom,document.publication_state,document.catalog_origin,document.adjudication_class,
          document.selectable,document.short_scope_ru,document.key_distinguishing_parameters,
          document.required_inputs_count,document.clarification_fields,document.included_boundaries,
          document.excluded_boundaries,document.normalized_canonical_name,document.normalized_search_terms
        from public.estimate_search_document document
        join public.estimate_search_group group_row
          on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
        where document.search_release_id=$1 and document.adjudication_class='EFFECTIVE_WORK'
          and document.selectable and length(replace($2,' ',''))>2
          and exists(select 1 from unnest(document.normalized_search_terms) term
            where term like left($2,2)||'%')
          and (coalesce($3,'')='' or document.domain_id=$3)
          and (coalesce($4,'')='' or document.group_id=$4)
          and (coalesce($5,'')='' or document.operation_kind=$5)`,
            [
              release.id,
              intent.searchText,
              filters.domain_id ?? "",
              filters.group_id ?? "",
              filters.operation_kind ?? "",
            ],
          )
        ).rows;
        rows = fuzzySearchPage(
          candidates,
          intent.searchText,
          cursor?.orderKey ?? null,
          limit,
        );
        resultLevel = "FUZZY";
      }
      const inventoryAuditReleaseId = String(
        release.metadata?.parentSearchReleaseId ??
          release.metadata?.parent_search_release_id ??
          release.id,
      );
      const inventory =
        url.searchParams.get("auditInventory") === "true"
          ? (
              await client.query(
                `with tokens as(
        select distinct unnest($2::text[]) q
      ),hits as(
        select document.catalog_id,count(distinct token.q)::int matched
        from public.estimate_search_document document cross join tokens token
        where document.search_release_id=$1 and position(token.q in document.normalized_search_blob)>0
        group by document.catalog_id
      ) select count(*)::bigint inventory_literal_total_count from hits
      cross join (select count(*)::int token_count from tokens) state
      where (upper($3)='ANY' and hits.matched>0)
        or (upper($3)='ALL' and state.token_count>0 and hits.matched=state.token_count)
        or (upper($3)='PHRASE' and state.token_count=1 and hits.matched=1)`,
                [inventoryAuditReleaseId, intent.tokens, intent.mode],
              )
            ).rows[0]
          : null;
      return { release, rows, inventory, resultLevel };
    });
    const contentAdmissionByCatalog = await readContentAdmissions(
      result.rows.map((row: Record<string, any>) => String(row.catalog_id)),
    );
    const runtimeTargetState = await withClient(readRuntimeTargetState);
    const literalTotalCount = Number(result.rows[0]?.literal_total_count ?? 0);
    const globalLiteralTotalCount = Number(
      result.rows[0]?.global_literal_total_count ?? literalTotalCount,
    );
    const externalLiteralTotalCount = Number(
      result.rows[0]?.external_literal_total_count ?? 0,
    );
    const groupTotalCount = Number(result.rows[0]?.group_total_count ?? 0);
    const fuzzyTotalCount = Number(result.rows[0]?.fuzzy_total_count ?? 0);
    const shownCount = (cursor?.shown ?? 0) + result.rows.length;
    const last = result.rows[result.rows.length - 1];
    return send(response, 200, {
      apiVersion: API_VERSION,
      searchIndexReleaseId: result.release.id,
      searchIndexReleaseStatus: result.release.status,
      searchIndexSnapshotSha256: result.release.snapshot_sha256,
      taxonomyVersion: result.release.taxonomy_version,
      groupRelationVersion: result.release.group_relation_version,
      rankingContractVersion: result.release.ranking_contract_version,
      resultSetSha256:
        result.rows[0]?.result_set_sha256 ??
        createHash("sha256").update("[]").digest("hex"),
      rawQuery: intent.rawQuery,
      normalizedQuery: intent.searchText,
      searchText: intent.searchText,
      searchMode: intent.mode,
      searchTokens: intent.tokens,
      parsedQuantity: intent.quantity,
      parsedUnit: intent.unit,
      filters,
      scope,
      resultLevel: result.resultLevel,
      literalTotalCount,
      globalLiteralTotalCount,
      externalLiteralTotalCount,
      groupTotalCount,
      inventoryLiteralTotalCount:
        result.inventory == null
          ? null
          : Number(result.inventory.inventory_literal_total_count ?? 0),
      fuzzyTotalCount,
      suggestionTotalCount: fuzzyTotalCount,
      shownCount,
      items: result.rows.map((row: Record<string, any>) => {
        const matchTier = Number(row.tier) as 1 | 2 | 3 | 4 | 5 | 6;
        const matchType =
          matchTier === 1
            ? "T1_EXACT"
            : matchTier === 2
              ? "T2_EXACT_ALIAS"
              : matchTier === 3
                ? "T3_CANONICAL_PREFIX"
                : matchTier === 4
                  ? "T4_TOKEN_PREFIX"
                  : matchTier === 5
                    ? "T5_NORMALIZED_SUBSTRING"
                    : "T6_TYPO_TRANSLITERATION_SUGGESTION";
        const matchedAlias = matchTier === 2 || matchTier === 4;
        const contentAdmission =
          contentAdmissionByCatalog.get(String(row.catalog_id)) ?? null;
        const estimateReady =
          row.selectable === true &&
          Boolean(row.definition_version_id) &&
          row.publication_state === "ADMITTED_BACKEND" &&
          runtimeTargetState.userCompileAllowed &&
          contentAdmission?.status === "PROFESSIONAL_READY";
        return {
          catalogId: row.catalog_id,
          definitionVersionId: row.definition_version_id,
          definitionReleaseId: row.definition_release_id,
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
          adjudicationClass: row.adjudication_class,
          estimateReady,
          contentAdmission: contentAdmission?.decision ?? null,
          shortScopeRu: row.short_scope_ru,
          keyDistinguishingParameters: row.key_distinguishing_parameters,
          requiredInputsCount: row.required_inputs_count,
          clarificationFields: row.clarification_fields,
          includedBoundaries: row.included_boundaries,
          excludedBoundaries: row.excluded_boundaries,
          replacementCatalogId:
            row.source_catalog_id !== row.catalog_id ? row.catalog_id : null,
          matchTier,
          matchType,
          matchedTerm: row.matched_term,
          matchedField:
            matchTier === 6
              ? "fuzzy_name_or_alias"
              : matchedAlias
                ? "aliases"
                : "canonical_name_ru",
          rankingReasonRu:
            matchTier === 1
              ? "Точное совпадение идентификатора или названия"
              : matchTier === 2
                ? "Точный зарегистрированный синоним"
                : matchTier === 3
                  ? "Начало канонического названия"
                  : matchTier === 4
                    ? "Буквальное вхождение в разрешённый синоним"
                    : matchTier === 5
                      ? "Буквальное вхождение без ограничения первых 15 результатов"
                      : "Отдельная нечёткая подсказка; не смешана с literal-выдачей",
          selectableMode: estimateReady
            ? "PROFESSIONAL"
            : row.adjudication_class === "EXTERNAL_REFERENCE"
              ? "PRELIMINARY"
              : "NONE",
          nonselectableReasonRu: estimateReady
            ? null
            : row.adjudication_class === "EXTERNAL_REFERENCE"
              ? "Справочная запись; не является selectable профессиональной работой."
              : "Работа выведена из актуального каталога.",
        };
      }),
      nextCursor:
        last && shownCount < literalTotalCount + fuzzyTotalCount
          ? Buffer.from(
              JSON.stringify({
                releaseId: result.release.id,
                snapshotSha256: result.release.snapshot_sha256,
                orderKey: last.stable_order_key,
                shown: shownCount,
              }),
            ).toString("base64url")
          : null,
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
    });
  }
  if (
    request.method === "GET" &&
    path.length === 3 &&
    path[0] === "search" &&
    path[1] === "groups"
  ) {
    const groupId = decodeURIComponent(path[2]);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 50) || 50),
    );
    const cursor = searchCursor(url.searchParams.get("cursor"));
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (
        cursor &&
        (cursor.releaseId !== release.id ||
          cursor.snapshotSha256 !== release.snapshot_sha256)
      )
        throw Object.assign(
          new Error("Поисковый индекс обновился. Откройте группу заново."),
          { code: "STALE_SEARCH_SNAPSHOT", httpStatus: 409 },
        );
      const rows = (
        await client.query(
          "select * from public.estimate_list_search_group_r58($1,$2,$3,$4)",
          [release.id, groupId, cursor?.orderKey ?? null, limit],
        )
      ).rows;
      return { release, rows };
    });
    if (!result.rows.length && !cursor)
      throw Object.assign(new Error("search group not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    const admissions = await readContentAdmissions(
      result.rows.map((row: Record<string, any>) => String(row.catalog_id)),
      "search_selectable",
    );
    const totalCount = Number(result.rows[0]?.member_count ?? 0);
    const shownCount = (cursor?.shown ?? 0) + result.rows.length;
    const last = result.rows[result.rows.length - 1];
    return send(response, 200, {
      apiVersion: API_VERSION,
      searchIndexReleaseId: result.release.id,
      searchIndexSnapshotSha256: result.release.snapshot_sha256,
      taxonomyVersion: result.release.taxonomy_version,
      groupRelationVersion: result.release.group_relation_version,
      groupId,
      groupNameRu: result.rows[0]?.group_name_ru ?? "",
      totalCount,
      shownCount,
      items: result.rows.map((row: Record<string, any>) => ({
        catalogId: row.catalog_id,
        canonicalNameRu: row.canonical_name_ru,
        publicationState: row.publication_state,
        catalogOrigin: row.catalog_origin,
        operationKind: row.operation_kind,
        technologyVariant: row.technology_variant,
        estimateReady:
          admissions.get(String(row.catalog_id))?.status ===
          "PROFESSIONAL_READY",
        contentAdmission:
          admissions.get(String(row.catalog_id))?.decision ?? null,
      })),
      nextCursor:
        last && shownCount < totalCount
          ? Buffer.from(
              JSON.stringify({
                releaseId: result.release.id,
                snapshotSha256: result.release.snapshot_sha256,
                orderKey: String(last.catalog_id),
                shown: shownCount,
              }),
            ).toString("base64url")
          : null,
    });
  }
  if (
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "search" &&
    path[1] === "catalog" &&
    path[3] === "relations"
  ) {
    const catalogId = decodeURIComponent(path[2]);
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      const rows = (
        await client.query(
          `select r.*,d.canonical_name_ru target_name_ru from public.estimate_search_typed_relation r join public.estimate_search_document d on d.search_release_id=r.search_release_id and d.catalog_id=r.target_catalog_id where r.search_release_id=$1 and r.source_catalog_id=$2 order by r.relationship_type,r.target_catalog_id`,
          [release.id, catalogId],
        )
      ).rows;
      return { release, rows };
    });
    return send(response, 200, {
      apiVersion: API_VERSION,
      searchIndexReleaseId: result.release.id,
      groupRelationVersion: result.release.group_relation_version,
      items: result.rows.map((row: Record<string, any>) => ({
        sourceCatalogId: row.source_catalog_id,
        targetCatalogId: row.target_catalog_id,
        targetCanonicalNameRu: row.target_name_ru,
        relationshipType: row.relationship_type,
        direction: row.direction,
        sourceLocator: row.source_locator,
        applicabilityPredicate: row.applicability_predicate,
        requiredWhen: row.required_when,
        mutuallyExclusiveWith: row.mutually_exclusive_with,
        explanationRu: row.explanation_ru,
        relationSha256: row.relation_sha256,
      })),
    });
  }
  if (request.method === "POST" && path.length === 1 && path[0] === "drafts") {
    const body = (await readBody(request)) as Record<string, any>;
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (
        !release ||
        (body.searchIndexReleaseId && body.searchIndexReleaseId !== release.id)
      )
        throw Object.assign(new Error("stale search snapshot"), {
          code: "STALE_SEARCH_SNAPSHOT",
          httpStatus: 409,
        });
      const selected = Array.isArray(body.selectedCatalogIds)
        ? [...new Set(body.selectedCatalogIds.map(String))]
        : [];
      if (selected.length) {
        const known = Number(
          (
            await client.query(
              "select count(*) count from public.estimate_search_document where search_release_id=$1 and catalog_id=any($2::text[]) and adjudication_class='EFFECTIVE_WORK' and selectable and definition_version_id is not null",
              [release.id, selected],
            )
          ).rows[0].count,
        );
        if (known !== selected.length)
          throw Object.assign(new Error("invalid search selection"), {
            code: "INVALID_SEARCH_SELECTION",
            httpStatus: 409,
          });
        const runtimeTargetState = await withClient(readRuntimeTargetState);
        const admissions = await readContentAdmissions(
          selected,
          "search_selectable",
        );
        if (
          !runtimeTargetState.userCompileAllowed ||
          selected.some(
            (catalogId) =>
              admissions.get(catalogId)?.status !== "PROFESSIONAL_READY",
          )
        ) {
          throw Object.assign(
            new Error("selected estimate content is quarantined"),
            {
              code: "DEFINITION_CONTENT_NOT_ADMITTED",
              httpStatus: 409,
            },
          );
        }
      }
      return (
        await client.query(
          `insert into public.estimate_draft(owner_user_id,status,title,original_query,normalized_query,search_filters,search_index_release_id,taxonomy_version,group_relation_version,search_result_set_hash,candidate_set_hash,selected_result_hash,selected_catalog_ids,selected_work_order,last_device_id) values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$10,$11,$12,$12,$13) returning *`,
          [
            currentOwnerId(),
            selected.length ? "DRAFT_INPUT_REQUIRED" : "SEARCHING",
            String(body.title ?? body.originalQuery ?? ""),
            String(body.originalQuery ?? ""),
            normalizeSearchQuery(String(body.originalQuery ?? "")),
            JSON.stringify(body.searchFilters ?? {}),
            release.id,
            release.taxonomy_version,
            release.group_relation_version,
            body.searchResultSetHash ?? null,
            selected.length ? sha256(selected) : null,
            selected,
            body.deviceId ?? null,
          ],
        )
      ).rows[0];
    });
    return send(response, 201, {
      apiVersion: API_VERSION,
      draft: localDraftView(result),
    });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "drafts") {
    const draft = await withSearchClient(
      async (client) =>
        (
          await client.query(
            "select * from public.estimate_draft where id=$1 and owner_user_id=$2",
            [path[1], currentOwnerId()],
          )
        ).rows[0],
    );
    if (!draft)
      throw Object.assign(new Error("draft not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    return send(response, 200, {
      apiVersion: API_VERSION,
      draft: localDraftView(draft),
    });
  }
  if (
    request.method === "POST" &&
    path.length === 3 &&
    path[0] === "drafts" &&
    path[2] === "events"
  ) {
    const body = (await readBody(request)) as Record<string, any>;
    const draft = await withSearchClient(async (client) => {
      await client.query("begin");
      try {
        await client.query(
          "select set_config('request.jwt.claim.sub',$1,true)",
          [currentOwnerId()],
        );
        const row = (
          await client.query(
            "select public.estimate_apply_draft_event_r2($1,$2,$3,$4,$5::jsonb,$6) value",
            [
              path[1],
              body.idempotencyKey,
              body.baseOptimisticVersion,
              body.eventKind,
              JSON.stringify(body.patch ?? {}),
              body.deviceId ?? null,
            ],
          )
        ).rows[0]?.value;
        await client.query("commit");
        return row;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
    return send(response, 200, {
      apiVersion: API_VERSION,
      draft: localDraftView(draft),
    });
  }
  if (request.method === "POST" && path.join("/") === "jobs/compile")
    return send(
      response,
      202,
      await createJob(await readBody(request), "compile"),
    );
  if (request.method === "POST" && path.join("/") === "jobs/recalculate")
    return send(
      response,
      202,
      await createJob(await readBody(request), "recalculate"),
    );
  if (
    request.method === "POST" &&
    path.join("/") === "migrations/legacy-revisions"
  )
    return send(response, 202, await createLegacyJob(await readBody(request)));
  if (request.method === "GET" && path.length === 2 && path[0] === "jobs") {
    const job = await findAcrossModelDatabases(
      async (client) =>
        (
          await client.query(
            "select * from public.estimate_compile_job where id=$1 and owner_user_id=$2",
            [path[1], currentOwnerId()],
          )
        ).rows[0],
    );
    if (!job)
      throw Object.assign(new Error("job not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    return send(response, 200, {
      apiVersion: API_VERSION,
      jobId: job.id,
      operation: job.operation,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      attempt: job.attempt,
      resultRevisionId: job.result_revision_id,
      errorCode: job.error_code,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  }
  if (
    request.method === "POST" &&
    path.length === 3 &&
    path[0] === "jobs" &&
    path[2] === "cancel"
  ) {
    const modelDatabaseUrl = await modelDatabaseUrlForJob(path[1]);
    const cancelled = await withDatabaseClient(
      modelDatabaseUrl,
      async (client) => {
        await client.query("begin");
        try {
          await client.query(
            "select set_config('request.jwt.claim.sub',$1,true)",
            [currentOwnerId()],
          );
          const result = await client.query(
            "select public.estimate_cancel_compile_job_v1($1) cancelled",
            [path[1]],
          );
          await client.query("commit");
          return result.rows[0]?.cancelled === true;
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      },
    );
    if (!cancelled)
      throw Object.assign(new Error("job is not cancellable"), {
        code: "JOB_NOT_CANCELLABLE",
        httpStatus: 409,
      });
    return send(response, 200, {
      apiVersion: API_VERSION,
      jobId: path[1],
      status: "cancelled",
    });
  }
  if (
    request.method === "GET" &&
    path.length === 3 &&
    path[0] === "revisions" &&
    path[2] === "parameter-session"
  ) {
    const snapshot = await localParameterSessionSnapshot(path[1]);
    if (!snapshot)
      throw Object.assign(new Error("revision parameter session not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    return send(response, 200, { apiVersion: API_VERSION, ...snapshot });
  }
  if (
    request.method === "GET" &&
    path.length === 1 &&
    path[0] === "revisions"
  ) {
    const catalogId = String(url.searchParams.get("catalogId") ?? "").trim();
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30),
    );
    const before =
      url.searchParams.get("cursor") == null
        ? null
        : Number(url.searchParams.get("cursor"));
    if (
      !catalogId ||
      (before != null && (!Number.isSafeInteger(before) || before <= 0))
    )
      throw Object.assign(new Error("invalid revision history query"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
    const revisions = await withDatabaseClient(
      modelDatabaseUrl,
      async (client) =>
        (
          await client.query(
            `
      select * from public.estimate_revision
        where (owner_user_id=$1 or organization_id=$2) and catalog_id=$3
        and ($4::integer is null or revision_number<$4) order by revision_number desc limit $5
    `,
            [
              currentOwnerId(),
              currentTenantId(),
              catalogId,
              before,
              limit + 1,
            ],
          )
        ).rows,
    );
    const page = revisions.slice(0, limit);
    return send(response, 200, {
      apiVersion: API_VERSION,
      revisions: page.map((revision) => ({
        revisionId: revision.id,
        parentRevisionId: revision.parent_revision_id,
        releaseId: revision.release_id,
        catalogId: revision.catalog_id,
        revisionNumber: revision.revision_number,
        status: revision.status,
        currencyCode: revision.currency_code,
        parameters: revision.input_parameters,
        amendmentContract: revision.amendment_contract,
        totals: revision.totals,
        sourceRequestText: revision.source_request_text ?? null,
        sourceRequestHash: revision.source_request_hash ?? null,
        canonicalWorkTitleRu: revision.canonical_work_title_ru ?? null,
        displayTitleRu: revision.display_title_ru ?? null,
        primaryMeasureParameterId:
          revision.primary_measure_parameter_id ?? null,
        primaryMeasureValue:
          revision.primary_measure_value == null
            ? null
            : String(revision.primary_measure_value),
        primaryMeasureUnitId: revision.primary_measure_unit_id ?? null,
        normalizedIntent: revision.normalized_intent ?? null,
        definitionVersionId: revision.definition_version_id ?? null,
        groupId: revision.group_id ?? null,
        searchReleaseId: revision.search_release_id ?? null,
        userInputSnapshot: revision.user_input_snapshot ?? null,
        acceptedBaselineSnapshot: revision.accepted_baseline_snapshot ?? null,
        assumptionSnapshot: revision.assumption_snapshot ?? null,
        formulaGraphVersion: revision.formula_graph_version ?? null,
        revisionContractVersion: revision.revision_contract_version ?? null,
        rowCount: revision.row_count,
        checksumSha256: revision.checksum_sha256,
        compilerVersion: revision.compiler_version,
        definitionVersion: revision.definition_version ?? null,
        compilerOwner: revision.compiler_owner ?? "backend",
        parameterSchemaHash: revision.parameter_schema_hash ?? null,
        inputHash: revision.input_hash ?? null,
        outputHash: revision.output_hash ?? revision.checksum_sha256,
        contentAdmission: legacyReadContentAdmission(revision, "revision_read")
          .decision,
        legacyWarningRu:
          "Старая версия создана прежней моделью расчёта; для нового расчёта сформируйте исправленную версию.",
        createdAt: revision.created_at,
      })),
      nextCursor:
        revisions.length > limit
          ? String(page[page.length - 1].revision_number)
          : null,
    });
  }
  if (
    request.method === "GET" &&
    path.length === 2 &&
    path[0] === "revisions"
  ) {
    const revision = await findAcrossModelDatabases(
      async (client) =>
        (
          await client.query(
            "select * from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
            [path[1], currentOwnerId(), currentTenantId()],
          )
        ).rows[0],
    );
    if (!revision)
      throw Object.assign(new Error("revision not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    const contentAdmission = legacyReadContentAdmission(
      revision,
      "revision_read",
    );
    return send(response, 200, {
      apiVersion: API_VERSION,
      revisionId: revision.id,
      parentRevisionId: revision.parent_revision_id,
      releaseId: revision.release_id,
      catalogId: revision.catalog_id,
      revisionNumber: revision.revision_number,
      status: revision.status,
      currencyCode: revision.currency_code,
      parameters: revision.input_parameters,
      sourceRequestText: revision.source_request_text ?? null,
      sourceRequestHash: revision.source_request_hash ?? null,
      canonicalWorkTitleRu: revision.canonical_work_title_ru ?? null,
      displayTitleRu: revision.display_title_ru ?? null,
      primaryMeasureParameterId: revision.primary_measure_parameter_id ?? null,
      primaryMeasureValue:
        revision.primary_measure_value == null
          ? null
          : String(revision.primary_measure_value),
      primaryMeasureUnitId: revision.primary_measure_unit_id ?? null,
      normalizedIntent: revision.normalized_intent ?? null,
      definitionVersionId: revision.definition_version_id ?? null,
      groupId: revision.group_id ?? null,
      searchReleaseId: revision.search_release_id ?? null,
      userInputSnapshot: revision.user_input_snapshot ?? null,
      acceptedBaselineSnapshot: revision.accepted_baseline_snapshot ?? null,
      assumptionSnapshot: revision.assumption_snapshot ?? null,
      formulaGraphVersion: revision.formula_graph_version ?? null,
      revisionContractVersion: revision.revision_contract_version ?? null,
      amendmentContract: revision.amendment_contract,
      totals: revision.totals,
      rowCount: revision.row_count,
      checksumSha256: revision.checksum_sha256,
      compilerVersion: revision.compiler_version,
      definitionVersion: revision.definition_version ?? null,
      compilerOwner: revision.compiler_owner ?? "backend",
      parameterSchemaHash: revision.parameter_schema_hash ?? null,
      inputHash: revision.input_hash ?? null,
      outputHash: revision.output_hash ?? revision.checksum_sha256,
      contentAdmission: contentAdmission.decision,
      legacyWarningRu:
        "Старая версия создана прежней моделью расчёта; для нового расчёта сформируйте исправленную версию.",
      createdAt: revision.created_at,
    });
  }
  if (
    request.method === "GET" &&
    path.length === 3 &&
    path[0] === "revisions" &&
    path[2] === "rows"
  ) {
    const after = cursorAfter(url.searchParams.get("cursor"));
    const limit = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100),
    );
    const modelDatabaseUrl = await modelDatabaseUrlForRevision(path[1]);
    const revision = await withDatabaseClient(
      modelDatabaseUrl,
      async (client) =>
        (
          await client.query(
            "select id,release_id::text,catalog_id,definition_version_id::text from public.estimate_revision where id=$1 and (owner_user_id=$2 or organization_id=$3)",
            [path[1], currentOwnerId(), currentTenantId()],
          )
        ).rows[0] as JsonRecord | undefined,
    );
    if (!revision)
      throw Object.assign(new Error("revision not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    const contentAdmission = legacyReadContentAdmission(
      revision,
      "revision_read",
    );
    const rows = await withDatabaseClient(
      modelDatabaseUrl,
      async (client) =>
        (
          await client.query(
            `
      select rr.* from public.estimate_revision_row rr
      join public.estimate_revision r on r.id=rr.revision_id
      where rr.revision_id=$1 and (r.owner_user_id=$2 or r.organization_id=$3)
        and rr.ordinal>$4 order by rr.ordinal limit $5
    `,
            [
              path[1],
              currentOwnerId(),
              currentTenantId(),
              after,
              limit + 1,
            ],
          )
        ).rows,
    );
    const page = rows.slice(0, limit);
    return send(response, 200, {
      apiVersion: API_VERSION,
      revisionId: path[1],
      contentAdmission: contentAdmission.decision,
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
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify({ ordinal: page[page.length - 1].ordinal }),
            ).toString("base64url")
          : null,
    });
  }
  if (
    request.method === "POST" &&
    path.length === 5 &&
    path[0] === "revisions" &&
    path[2] === "attachments" &&
    path[3] === "photo" &&
    path[4] === "uploads"
  ) {
    const body = await readBody(request);
    return send(
      response,
      201,
      await createLocalRevisionPhotoUpload(
        body,
        path[1],
        request.headers.host ?? `127.0.0.1:${PORT}`,
      ),
    );
  }
  if (
    request.method === "POST" &&
    path.length === 7 &&
    path[0] === "revisions" &&
    path[2] === "attachments" &&
    path[3] === "photo" &&
    path[4] === "uploads" &&
    path[6] === "finalize"
  ) {
    return send(
      response,
      200,
      await finalizeLocalRevisionPhotoUpload(
        path[1],
        path[5],
        request.headers.host ?? `127.0.0.1:${PORT}`,
      ),
    );
  }
  if (
    request.method === "GET" &&
    path.length === 3 &&
    path[0] === "revisions" &&
    path[2] === "attachments"
  ) {
    return send(
      response,
      200,
      await listLocalRevisionPhotoAttachments(
        path[1],
        url.searchParams.get("includeDeleted") === "true",
        request.headers.host ?? `127.0.0.1:${PORT}`,
      ),
    );
  }
  if (
    request.method === "POST" &&
    path.length === 3 &&
    path[0] === "attachments" &&
    path[2] === "tombstone"
  ) {
    const body = await readBody(request);
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw Object.assign(new Error("invalid idempotency key"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    const targetDatabaseUrl = await modelDatabaseUrlForPhotoAttachment(path[1]);
    const eventId = await withDatabaseClient(
      targetDatabaseUrl,
      async (client) => {
        await client.query("begin");
        try {
          await client.query(
            "select set_config('request.jwt.claim.sub',$1,true)",
            [currentOwnerId()],
          );
          const value = (
            await client.query(
              "select public.estimate_tombstone_row_photo_attachment_r55($1,$2) value",
              [path[1], idempotencyKey],
            )
          ).rows[0]?.value;
          await client.query("commit");
          return value;
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      },
    );
    return send(response, 200, {
      apiVersion: API_VERSION,
      attachmentId: path[1],
      attachmentEventId: eventId,
      status: "deleted",
    });
  }
  if (
    path.length === 4 &&
    path[0] === "revisions" &&
    path[2] === "artifacts" &&
    (path[3] === "pdf" ||
      path[3] === "professional_pdf" ||
      path[3] === "procurement")
  ) {
    const publicKind = path[3] as "pdf" | "professional_pdf" | "procurement";
    const body = request.method === "POST" ? await readBody(request) : {};
    const requestedProfile = String(
      request.method === "POST"
        ? (body.documentProfile ?? "")
        : (url.searchParams.get("documentProfile") ?? ""),
    ).trim();
    if (requestedProfile && requestedProfile !== "professional_v1") {
      throw Object.assign(new Error("unsupported PDF document profile"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    if (requestedProfile && publicKind !== "pdf") {
      throw Object.assign(new Error("documentProfile is only valid for PDF"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    const kind = (
      publicKind === "pdf" && requestedProfile === "professional_v1"
        ? "professional_pdf"
        : publicKind
    ) as "pdf" | "professional_pdf" | "procurement";
    if (request.method === "POST")
      return send(response, 202, await createArtifactJob(body, path[1], kind));
    if (request.method === "GET") {
      const modelDatabaseUrl = await modelDatabaseUrlForRevision(path[1]);
      const artifact = await withDatabaseClient(
        modelDatabaseUrl,
        async (client) =>
          (
            await client.query(
              `
        select a.*,r.release_id,r.catalog_id,r.definition_version_id,r.row_count,r.checksum_sha256 revision_checksum_sha256,
          r.owner_user_id,r.organization_id
        from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
        where a.revision_id=$1 and a.artifact_kind=$2
          and (r.owner_user_id=$3 or r.organization_id=$4)
      `,
              [path[1], kind, currentOwnerId(), currentTenantId()],
            )
          ).rows[0],
      );
      if (!artifact)
        throw Object.assign(new Error("artifact not found"), {
          code: "NOT_FOUND",
          httpStatus: 404,
        });
      const forwardedProtocol = String(
        request.headers["x-forwarded-proto"] ?? "",
      )
        .split(",")[0]
        ?.trim();
      const protocol = forwardedProtocol === "https" ? "https" : "http";
      const signedUrlExpiresAtMs = Date.now() + 900_000;
      const signature = professionalArtifactToken({
        artifactId: artifact.id,
        expiresAt: signedUrlExpiresAtMs,
        ownerUserId: artifact.owner_user_id,
        organizationId: artifact.organization_id ?? null,
      });
      const signedUrl =
        artifact.status === "ready"
          ? `${protocol}://${request.headers.host ?? `127.0.0.1:${PORT}`}/canonical-estimate/artifact-files/${artifact.id}?expires=${signedUrlExpiresAtMs}&signature=${encodeURIComponent(signature)}`
          : null;
      const sourceMetadata = artifact.metadata ?? {};
      if (
        artifact.status === "ready" &&
        ((sourceMetadata.sourceReleaseId != null &&
          sourceMetadata.sourceReleaseId !== artifact.release_id) ||
          (sourceMetadata.sourceRevisionChecksumSha256 != null &&
            sourceMetadata.sourceRevisionChecksumSha256 !==
              artifact.revision_checksum_sha256) ||
          (sourceMetadata.sourceCatalogId != null &&
            sourceMetadata.sourceCatalogId !== artifact.catalog_id) ||
          (sourceMetadata.sourceRowCount != null &&
            Number(sourceMetadata.sourceRowCount) !==
              Number(artifact.row_count)) ||
          (sourceMetadata.sourceOwnerUserId != null &&
            sourceMetadata.sourceOwnerUserId !== artifact.owner_user_id) ||
          (sourceMetadata.sourceOrganizationId != null &&
            sourceMetadata.sourceOrganizationId !==
              (artifact.organization_id ?? null)) ||
          (kind === "professional_pdf" &&
            !canonicalProfessionalArtifactMetadataIdentityMatches({
              metadata: sourceMetadata,
              revision: {
                ...artifact,
                id: artifact.revision_id,
                checksum_sha256: artifact.revision_checksum_sha256,
              },
            })))
      )
        throw Object.assign(new Error("artifact revision identity mismatch"), {
          code: "ARTIFACT_REVISION_IDENTITY_MISMATCH",
          httpStatus: 409,
        });
      const metadata = {
        ...sourceMetadata,
        ...(kind === "professional_pdf"
          ? { documentProfile: "professional_v1" }
          : {}),
        sourceCatalogId: artifact.catalog_id,
        sourceRowCount: Number(artifact.row_count),
        sourceReleaseId: artifact.release_id,
        sourceRevisionChecksumSha256: artifact.revision_checksum_sha256,
        sourceOwnerUserId: artifact.owner_user_id,
        sourceOrganizationId: artifact.organization_id ?? null,
      };
      const contentAdmission = legacyReadContentAdmission(
        artifact,
        "artifact_read",
        true,
      );
      return send(response, 200, {
        apiVersion: API_VERSION,
        artifactId: artifact.id,
        revisionId: artifact.revision_id,
        releaseId: artifact.release_id,
        kind: publicKind,
        status: artifact.status,
        contentType: artifact.content_type,
        byteSize:
          artifact.byte_size == null ? null : Number(artifact.byte_size),
        sha256: artifact.sha256,
        metadata,
        contentAdmission: contentAdmission.decision,
        errorCode: artifact.error_code,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
        readyAt: artifact.ready_at,
        signedUrl,
        signedUrlExpiresAt: signedUrl
          ? new Date(signedUrlExpiresAtMs).toISOString()
          : null,
      });
    }
  }
  if (request.method === "GET" && path.length === 1 && path[0] === "catalog") {
    return send(response, 410, {
      error: {
        code: "LEGACY_SEARCH_ROUTE_RETIRED",
        message: "use server-owned /search/catalog R2",
      },
    });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "catalog") {
    const catalogId = decodeURIComponent(path[1]);
    const requestedReleaseId = String(
      url.searchParams.get("releaseId") ?? TARGET_RELEASE_ID,
    ).trim();
    if (
      requestedReleaseId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestedReleaseId,
      )
    ) {
      throw Object.assign(new Error("invalid catalog release identity"), {
        code: "INVALID_ARGUMENT",
        httpStatus: 400,
      });
    }
    const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
    const contentAdmission = await withDatabaseClient(
      modelDatabaseUrl,
      async (client) =>
        (
          await assertUserCompilationAdmission(
            client,
            catalogId,
            "catalog_read",
          )
        ).decision,
    );
    const item = await withDatabaseClient(modelDatabaseUrl, async (client) => {
      const identity = (
        await client.query(
          "select * from public.estimate_work_identity where catalog_id=$1 and retired_at is null",
          [catalogId],
        )
      ).rows[0];
      const definition = (
        await client.query(
          `select version.*,manifest.release_id cumulative_release_id,
          manifest.approved_template_baseline_id cumulative_baseline_id
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_definition_release release on release.id=manifest.release_id
        where manifest.catalog_id=$1
          and manifest.baseline_ready and manifest.scenario_ready
          and (release.status='active' or (release.status='prepared' and $3::boolean))
          and (($2::uuid is not null and release.id=$2) or ($2::uuid is null and release.status='active'))`,
          [
            catalogId,
            requestedReleaseId || null,
            ALLOW_PREPARED_RELEASE_COMPILE,
          ],
        )
      ).rows[0];
      if (!identity || !definition) return null;
      const parameters = (
        await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [definition.id],
        )
      ).rows;
      const baseline =
        definition.cumulative_baseline_id == null
          ? null
          : ((
              await client.query(
                `
        select id,contract_version,acceptance_evidence_sha256,accepted_at,input_values,input_classification,
          formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
          proposal_source_refs
        from public.estimate_approved_template_baseline where id=$1`,
                [definition.cumulative_baseline_id],
              )
            ).rows[0] ?? null);
      return {
        catalogId: identity.catalog_id,
        releaseId: definition.cumulative_release_id,
        namespace: identity.namespace,
        domain: identity.domain,
        workKey: identity.work_key,
        titleRu: canonicalDefinitionTitleRu({ ...definition, title_ru: identity.title_ru }),
        definitionVersion: definition.definition_version,
        applicability: definition.applicability,
        professionalMetadata: definition.source_metadata,
        contentAdmission,
        parameterSchema: parameters.map((parameter) => {
          const truth =
            parameter.truth_metadata &&
            typeof parameter.truth_metadata === "object"
              ? parameter.truth_metadata
              : {};
          const parameterId = String(parameter.parameter_id);
          const acceptedAsInput =
            baseline != null &&
            Object.prototype.hasOwnProperty.call(
              baseline.input_values ?? {},
              parameterId,
            );
          const acceptedGuide = String(
            baseline?.guide_provenance_ru?.[parameterId] ?? "",
          ).trim();
          const acceptedFormulaConsumers = Array.isArray(
            baseline?.formula_consumer_ids?.[parameterId],
          )
            ? baseline.formula_consumer_ids[parameterId]
            : [];
          const acceptedResourceConsumers = Array.isArray(
            baseline?.resource_consumer_row_ids?.[parameterId],
          )
            ? baseline.resource_consumer_row_ids[parameterId]
            : [];
          const acceptedNormativeSources = Array.isArray(
            baseline?.normative_source_ids?.[parameterId],
          )
            ? baseline.normative_source_ids[parameterId]
            : [];
          const baselineGuide =
            acceptedGuide && baseline
              ? {
                  guide_kind: "PROJECT_DEFINED",
                  guide_short_ru: acceptedGuide,
                  source_role: "PROJECT_DOCUMENTATION",
                  guide_validation_policy: "INFORMATION_ONLY",
                  source_document:
                    acceptedNormativeSources.join(", ") ||
                    "APPROVED_TEMPLATE_BASELINE",
                  source_edition_status: baseline.contract_version,
                  source_locator: String(
                    baseline.proposal_source_refs?.[0]?.sha256 ?? baseline.id,
                  ),
                  guide_version: baseline.contract_version,
                  source_snapshot_hash: baseline.acceptance_evidence_sha256,
                  applicability: `Только для выбранной работы ${catalogId}; параметр подтверждён её индивидуальным baseline и связан с её формулами или ресурсами.`,
                  verified_at: baseline.accepted_at,
                }
              : undefined;
          const effectiveGuide = baselineGuide
            ? { ...baselineGuide, ...(truth.guide ?? {}) }
            : truth.guide;
          const effectiveFormulaConsumers =
            Array.isArray(truth.formula_consumers) &&
            truth.formula_consumers.length > 0
              ? truth.formula_consumers
              : acceptedFormulaConsumers;
          const effectiveResourceConsumers =
            Array.isArray(truth.resource_branch_consumers) &&
            truth.resource_branch_consumers.length > 0
              ? truth.resource_branch_consumers
              : acceptedResourceConsumers;
          const effectiveProvenance =
            truth.provenance && Object.keys(truth.provenance).length > 0
              ? truth.provenance
              : baseline
                ? {
                    owner: "backend",
                    contract: baseline.contract_version,
                    approvedTemplateBaselineId: baseline.id,
                    acceptanceEvidenceSha256:
                      baseline.acceptance_evidence_sha256,
                  }
                : truth.provenance;
          const composite =
            truth.composite_item_schema &&
            typeof truth.composite_item_schema === "object"
              ? (truth.composite_item_schema as Record<string, any>)
              : null;
          return {
            parameterId: parameter.parameter_id,
            ordinal: parameter.ordinal,
            valueType: parameter.value_type,
            unitId: parameter.unit_id,
            titleRu: parameter.title_ru,
            required: parameter.required,
            // The worker already merges this exact immutable approved baseline
            // before validation. Expose the same persisted value to the client
            // for readiness validation; it remains backend-owned and is not
            // resubmitted as a user parameter.
            defaultValue:
              parameter.default_value ??
              (acceptedAsInput ? baseline?.input_values?.[parameterId] : null),
            constraints: parameter.constraints_json,
            semanticParameterKey:
              truth.semantic_parameter_key ??
              (baseline ? parameterId : undefined),
            visibilityRole:
              truth.visibility_role ??
              (baseline
                ? acceptedAsInput
                  ? "USER_INPUT"
                  : "INTERNAL_ONLY"
                : undefined),
            descriptionRu: truth.description_ru,
            requiredWhen: truth.required_when,
            visibleWhen: truth.visible_when,
            allowedRangeOrOptions: truth.allowed_range_or_options,
            defaultPolicy: truth.default_policy,
            valueSourceRole:
              truth.value_source_role ??
              (baseline
                ? acceptedAsInput
                  ? "PROJECT_DOCUMENTATION"
                  : "BACKEND_DERIVED"
                : undefined),
            guide: localParameterGuideView(effectiveGuide),
            compositeItemSchema: composite
              ? {
                  itemLabelRu: composite.item_label_ru,
                  minimumItems: composite.minimum_items,
                  maximumItems: composite.maximum_items,
                  reorderable: composite.reorderable === true,
                  subfields: Array.isArray(composite.subfields)
                    ? composite.subfields.map(
                        (subfield: Record<string, any>) => ({
                          subfieldId: subfield.subfield_id,
                          labelRu: subfield.label_ru,
                          valueType: subfield.value_type,
                          unitId: subfield.unit_id,
                          required: subfield.required === true,
                          constraints: subfield.constraints ?? {},
                          guide: localParameterGuideView(subfield.guide),
                          formulaConsumers: subfield.formula_consumers ?? [],
                          resourceBranchConsumers:
                            subfield.resource_branch_consumers ?? [],
                        }),
                      )
                    : [],
                }
              : undefined,
            sharedInputBindingPolicy: truth.shared_input_binding_policy,
            derivedFrom: truth.derived_from,
            normativeLinks: localParameterNormativeLinks(truth, effectiveGuide),
            formulaConsumers: effectiveFormulaConsumers,
            resourceBranchConsumers: effectiveResourceConsumers,
            validationRules:
              Array.isArray(truth.validation_rules) &&
              truth.validation_rules.length > 0
                ? truth.validation_rules
                : baseline
                  ? ["declared_type", "work_specific_applicability"]
                  : truth.validation_rules,
            conflictsWith: truth.conflicts_with,
            provenance: effectiveProvenance,
          };
        }),
      };
    });
    if (!item)
      throw Object.assign(new Error("catalog item not found"), {
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    return send(response, 200, { apiVersion: API_VERSION, item });
  }
  throw Object.assign(new Error("route not found"), {
    code: "ROUTE_NOT_FOUND",
    httpStatus: 404,
  });
}

const server = createServer((request, response) => {
  if (REQUEST_AUDIT_LOG) {
    response.once("finish", () => {
      mkdirSync(dirname(resolve(REQUEST_AUDIT_LOG)), { recursive: true });
      appendFileSync(
        resolve(REQUEST_AUDIT_LOG),
        `${JSON.stringify({
          at: new Date().toISOString(),
          method: request.method ?? null,
          path: request.url ?? null,
          status: response.statusCode,
          userAgent: request.headers["user-agent"] ?? null,
          authorizationPresent: Boolean(request.headers.authorization),
          remoteAddress: request.socket.remoteAddress ?? null,
        })}\n`,
        "utf8",
      );
    });
  }
  void route(request, response).catch(
    (error: { code?: string; httpStatus?: number; message?: string }) => {
      const databaseCode = String(error.code ?? "");
      const conflict = databaseCode === "23505";
      const mappedStatus =
        databaseCode === "42501"
          ? 403
          : databaseCode === "28000"
            ? 401
            : databaseCode === "22023"
              ? 400
              : databaseCode === "40001"
                ? 409
                : conflict
                  ? 409
                  : 500;
      const httpStatus = Number(error.httpStatus ?? mappedStatus);
      const code = conflict
        ? "IDEMPOTENCY_PAYLOAD_CONFLICT"
        : databaseCode === "42501"
          ? "AUTH_FORBIDDEN"
          : databaseCode === "40001"
            ? "STALE_PARENT_REVISION"
            : String(error.code ?? "INTERNAL_ERROR");
      send(response, httpStatus, {
        error: {
          code,
          message: String(error.message ?? "local canonical backend failed"),
          retryable: false,
        },
      });
    },
  );
});

server.listen(PORT, "0.0.0.0", () => {
  const database = (() => {
    try {
      return new URL(DATABASE_URL).pathname.replace(/^\//, "");
    } catch {
      return "invalid";
    }
  })();
  const searchDatabase = (() => {
    try {
      return new URL(SEARCH_DATABASE_URL).pathname.replace(/^\//, "");
    } catch {
      return "invalid";
    }
  })();
  process.stdout.write(
    JSON.stringify({
      status: "READY",
      port: PORT,
      database,
      searchDatabase,
      ...(FIXTURE_CONFIG ? { fixtureOwnerId: FIXTURE_CONFIG.ownerUserId } : {}),
      authMode: LOCAL_AUTH_MODE,
      authPrincipalContractVersion: "r52-a7.strict-principal.v1",
      principalResolutionRpc:
        LOCAL_AUTH_MODE === "STRICT_SESSION_INTROSPECTION"
          ? SUPABASE_PRINCIPAL_RPC
          : null,
      capabilityTenantBinding: R3_CAPABILITY_TENANT_BINDING,
      targetReleaseId: TARGET_RELEASE_ID || null,
      databasePoolMaximum: LOCAL_DATABASE_POOL_MAX,
    }) + "\n",
  );
  for (const connectionString of MODEL_DATABASE_URLS) {
    void drainJobs(connectionString).catch((error) =>
      process.stderr.write(`[canonical-local-worker] ${String(error)}\n`),
    );
  }
  void localCanonicalResourceIndex()
    .then((rows) => process.stderr.write(
      `[canonical-resource-search] READY rows=${rows.length} release=${TARGET_RELEASE_ID}\n`,
    ))
    .catch((error) => process.stderr.write(
      `[canonical-resource-search] FAILED ${String(error)}\n`,
    ));
});
