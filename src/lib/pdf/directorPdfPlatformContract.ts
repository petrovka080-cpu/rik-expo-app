import { safeJsonParse } from "../format";

export const DIRECTOR_PDF_CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
});

export type DirectorPdfDocumentKind =
  | "finance_preview"
  | "management_report"
  | "supplier_summary"
  | "production_report"
  | "subcontract_report";

export type DirectorPdfRenderBranch =
  | "edge_render_v1"
  | "backend_supplier_summary_v1"
  | "backend_production_report_v1"
  | "backend_subcontract_report_v1";

export type DirectorPdfRenderer = "browserless_puppeteer" | "local_browser_puppeteer" | "artifact_cache";

export type DirectorPdfServerErrorCode =
  | "auth_failed"
  | "validation_failed"
  | "backend_pdf_failed";

export type DirectorPdfTransportErrorCode =
  | "cors_preflight_failed"
  | "edge_function_unreachable"
  | "edge_function_http_error"
  | "auth_failed"
  | "backend_pdf_failed"
  | "invalid_response"
  | "open_failed"
  | "unsupported_source";

export type DirectorPdfSuccessPayload = {
  ok: true;
  renderVersion: "v1";
  renderBranch: DirectorPdfRenderBranch;
  renderer: DirectorPdfRenderer;
  sourceKind: "remote-url";
  documentKind: DirectorPdfDocumentKind;
  signedUrl: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  expiresInSeconds: number;
  telemetry?: Record<string, unknown> | null;
};

export const DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION =
  "pdf_z1_director_finance_management_manifest_v1";
export const DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND =
  "director_finance_management_report";
export const DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION =
  "director_finance_management_template_v1";
export const DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION =
  "director_pdf_render_edge_v1";
export const DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION =
  "director_finance_management_artifact_v1";

export type DirectorFinanceManagementManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type DirectorFinanceManagementDocumentScope = {
  role: "director";
  family: "finance";
  report: "management";
  periodFrom: string | null;
  periodTo: string | null;
  topN: number;
  dueDaysDefault: number;
  criticalDays: number;
  evaluationDate: string;
};

export type DirectorFinanceManagementManifestContract = {
  version: typeof DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION;
  documentKind: typeof DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND;
  documentScope: DirectorFinanceManagementDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  templateVersion: typeof DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION;
  renderContractVersion: typeof DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastSourceChangeAt: string | null;
};

export type BuildDirectorFinanceManagementManifestContractArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  topN?: number | null;
  dueDaysDefault?: number | null;
  criticalDays?: number | null;
  evaluationDate?: string | null;
  financeRows?: unknown[] | null;
  spendRows?: unknown[] | null;
  sourceKind?: string | null;
};

const SOURCE_VERSION_PREFIX = "dfm_src_v1";
const ARTIFACT_VERSION_PREFIX = "dfm_art_v1";
const SCOPE_VERSION_PREFIX = "dfm_scope_v1";
const FINANCE_MANAGEMENT_FILE_NAME = "director_finance_management_report.pdf";
const FINANCE_MANAGEMENT_ARTIFACT_ROOT = "director/management_report/artifacts/v1";
const FINANCE_MANAGEMENT_MANIFEST_ROOT = "director/management_report/manifests/v1";
const FINANCE_MANAGEMENT_NOISE_KEYS = new Set([
  "_debug",
  "cache",
  "duration_ms",
  "durationMs",
  "fetched_at",
  "generated_at",
  "loaded_at",
  "nonce",
  "request_id",
  "signed_url",
  "signedUrl",
  "telemetry",
  "timing",
  "trace_id",
  "traceId",
  "transport",
]);

export type DirectorPdfErrorPayload = {
  ok: false;
  renderVersion: "v1";
  errorCode: DirectorPdfServerErrorCode;
  error: string;
  documentKind?: DirectorPdfDocumentKind;
  renderBranch?: DirectorPdfRenderBranch;
};

type JsonEnvelope = Record<string, unknown>;

export function createDirectorPdfOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: DIRECTOR_PDF_CORS_HEADERS,
  });
}

export function createDirectorPdfJsonResponse(status: number, body: JsonEnvelope) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...DIRECTOR_PDF_CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function createDirectorPdfErrorResponse(args: {
  status: number;
  errorCode: DirectorPdfServerErrorCode;
  error: string;
  documentKind?: DirectorPdfDocumentKind;
  renderBranch?: DirectorPdfRenderBranch;
}) {
  return createDirectorPdfJsonResponse(args.status, {
    ok: false,
    renderVersion: "v1",
    errorCode: args.errorCode,
    error: String(args.error || "").trim() || "Director PDF request failed.",
    ...(args.documentKind ? { documentKind: args.documentKind } : {}),
    ...(args.renderBranch ? { renderBranch: args.renderBranch } : {}),
  } satisfies DirectorPdfErrorPayload);
}

export function createDirectorPdfSuccessResponse(payload: DirectorPdfSuccessPayload) {
  return createDirectorPdfJsonResponse(200, payload);
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeIso10(value: unknown) {
  const text = toText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function todayIso10() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function positiveInt(value: unknown, fallback: number, minValue = 0) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minValue, parsed);
}

function sanitizePathSegment(value: string) {
  return (
    toText(value)
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "version"
  );
}

function stripManifestNoise(value: unknown, key?: string): unknown {
  if (key && FINANCE_MANAGEMENT_NOISE_KEYS.has(key)) return undefined;
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => stripManifestNoise(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(source).sort()) {
      const childValue = stripManifestNoise(source[childKey], childKey);
      if (childValue !== undefined) output[childKey] = childValue;
    }
    return output;
  }
  return toText(value);
}

export function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(toText(value));
}

function hashString32(input: string): string {
  let hash = 2166136261;
  const source = String(input || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function stableHash(value: unknown): Promise<string> {
  const text = stableJsonStringify(value);
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function" && typeof TextEncoder !== "undefined") {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fnv1a32_${hashString32(text)}`;
}

export function buildDirectorFinanceManagementDocumentScope(
  args: Pick<
    BuildDirectorFinanceManagementManifestContractArgs,
    "periodFrom" | "periodTo" | "topN" | "dueDaysDefault" | "criticalDays" | "evaluationDate"
  >,
): DirectorFinanceManagementDocumentScope {
  return {
    role: "director",
    family: "finance",
    report: "management",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    topN: positiveInt(args.topN, 15, 1),
    dueDaysDefault: positiveInt(args.dueDaysDefault, 7, 0),
    criticalDays: positiveInt(args.criticalDays, 14, 1),
    evaluationDate: normalizeIso10(args.evaluationDate) ?? todayIso10(),
  };
}

export async function buildDirectorFinanceManagementManifestContract(
  args: BuildDirectorFinanceManagementManifestContractArgs,
): Promise<DirectorFinanceManagementManifestContract> {
  const documentScope = buildDirectorFinanceManagementDocumentScope(args);
  const sourceIdentity = {
    contractVersion: DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
    documentKind: DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: toText(args.sourceKind) || "rpc:pdf_director_finance_source_v1",
      financeRows: stripManifestNoise(Array.isArray(args.financeRows) ? args.financeRows : []),
      spendRows: stripManifestNoise(Array.isArray(args.spendRows) ? args.spendRows : []),
    },
  };
  const sourceHash = await stableHash(sourceIdentity);
  const sourceVersion = `${SOURCE_VERSION_PREFIX}_${sourceHash}`;
  const artifactHash = await stableHash({
    artifactContractVersion: DIRECTOR_FINANCE_MANAGEMENT_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION,
    renderContractVersion: DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION,
  });
  const scopeHash = await stableHash({
    scopeVersion: SCOPE_VERSION_PREFIX,
    documentKind: DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND,
    documentScope,
  });
  const artifactVersion = `${ARTIFACT_VERSION_PREFIX}_${artifactHash}`;

  return {
    version: DIRECTOR_FINANCE_MANAGEMENT_MANIFEST_VERSION,
    documentKind: DIRECTOR_FINANCE_MANAGEMENT_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion: DIRECTOR_FINANCE_MANAGEMENT_TEMPLATE_VERSION,
    renderContractVersion: DIRECTOR_FINANCE_MANAGEMENT_RENDER_CONTRACT_VERSION,
    artifactPath: `${FINANCE_MANAGEMENT_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${FINANCE_MANAGEMENT_FILE_NAME}`,
    manifestPath: `${FINANCE_MANAGEMENT_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName: FINANCE_MANAGEMENT_FILE_NAME,
    lastSourceChangeAt: null,
  };
}

// ─── Director Production Report PDF Manifest (PDF-Z2) ──────────────────────

export const DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION =
  "pdf_z2_director_production_report_manifest_v1";
export const DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND =
  "director_production_report";
export const DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION =
  "director_production_report_template_v1";
export const DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION =
  "backend_production_report_v1";
export const DIRECTOR_PRODUCTION_REPORT_ARTIFACT_CONTRACT_VERSION =
  "director_production_report_artifact_v1";

const PRODUCTION_REPORT_SOURCE_VERSION_PREFIX = "dpr_src_v1";
const PRODUCTION_REPORT_ARTIFACT_VERSION_PREFIX = "dpr_art_v1";
const PRODUCTION_REPORT_SCOPE_VERSION_PREFIX = "dpr_scope_v1";
const PRODUCTION_REPORT_FILE_NAME = "director_production_report.pdf";
const PRODUCTION_REPORT_ARTIFACT_ROOT = "director/production_report/artifacts/v1";
const PRODUCTION_REPORT_MANIFEST_ROOT = "director/production_report/manifests/v1";

// Noise keys that should NOT affect source_version (timestamps, debug, cache meta)
const PRODUCTION_REPORT_NOISE_KEYS = new Set([
  "_debug",
  "cache",
  "duration_ms",
  "durationMs",
  "fetched_at",
  "generated_at",
  "loaded_at",
  "nonce",
  "request_id",
  "signed_url",
  "signedUrl",
  "telemetry",
  "timing",
  "trace_id",
  "traceId",
  "transport",
]);

function stripProductionReportNoise(value: unknown, key?: string): unknown {
  if (key && PRODUCTION_REPORT_NOISE_KEYS.has(key)) return undefined;
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => stripProductionReportNoise(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(source).sort()) {
      const childValue = stripProductionReportNoise(source[childKey], childKey);
      if (childValue !== undefined) output[childKey] = childValue;
    }
    return output;
  }
  return toText(value);
}

export type DirectorProductionReportManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type DirectorProductionReportDocumentScope = {
  role: "director";
  family: "reports";
  report: "production";
  periodFrom: string | null;
  periodTo: string | null;
  objectName: string | null;
  preferPriceStage: "base" | "priced";
};

export type DirectorProductionReportManifestContract = {
  version: typeof DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION;
  documentKind: typeof DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND;
  documentScope: DirectorProductionReportDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  templateVersion: typeof DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION;
  renderContractVersion: typeof DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastSourceChangeAt: string | null;
};

export type BuildDirectorProductionReportManifestContractArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  objectName?: string | null;
  preferPriceStage?: "base" | "priced" | null;
  // Business-significant client fingerprint — derived from repData + repDiscipline
  // Noise fields (timestamp, cache metadata) must be stripped before passing here.
  clientSourceFingerprint?: string | null;
};

export function buildDirectorProductionReportDocumentScope(
  args: Pick<
    BuildDirectorProductionReportManifestContractArgs,
    "periodFrom" | "periodTo" | "objectName" | "preferPriceStage"
  >,
): DirectorProductionReportDocumentScope {
  return {
    role: "director",
    family: "reports",
    report: "production",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    objectName: toText(args.objectName) || null,
    preferPriceStage: args.preferPriceStage === "base" ? "base" : "priced",
  };
}

export async function buildDirectorProductionReportManifestContract(
  args: BuildDirectorProductionReportManifestContractArgs,
): Promise<DirectorProductionReportManifestContract> {
  const documentScope = buildDirectorProductionReportDocumentScope(args);

  // source_version is deterministic from business inputs only.
  // companyName, generatedBy, timestamps are noise — excluded.
  const sourceIdentity = {
    contractVersion: DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION,
    documentKind: DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "rpc:director_production_report_v1",
      // clientSourceFingerprint already strips noise — it's hash(repData + repDiscipline)
      clientSourceFingerprint: stripProductionReportNoise(
        toText(args.clientSourceFingerprint) || null,
      ),
    },
  };
  const sourceHash = await stableHash(sourceIdentity);
  const sourceVersion = `${PRODUCTION_REPORT_SOURCE_VERSION_PREFIX}_${sourceHash}`;

  const artifactHash = await stableHash({
    artifactContractVersion: DIRECTOR_PRODUCTION_REPORT_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION,
    renderContractVersion: DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION,
  });
  const artifactVersion = `${PRODUCTION_REPORT_ARTIFACT_VERSION_PREFIX}_${artifactHash}`;

  const scopeHash = await stableHash({
    scopeVersion: PRODUCTION_REPORT_SCOPE_VERSION_PREFIX,
    documentKind: DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND,
    documentScope,
  });

  return {
    version: DIRECTOR_PRODUCTION_REPORT_MANIFEST_VERSION,
    documentKind: DIRECTOR_PRODUCTION_REPORT_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion: DIRECTOR_PRODUCTION_REPORT_TEMPLATE_VERSION,
    renderContractVersion: DIRECTOR_PRODUCTION_REPORT_RENDER_CONTRACT_VERSION,
    artifactPath: `${PRODUCTION_REPORT_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${PRODUCTION_REPORT_FILE_NAME}`,
    manifestPath: `${PRODUCTION_REPORT_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName: PRODUCTION_REPORT_FILE_NAME,
    lastSourceChangeAt: null,
  };
}

// ─── End Director Production Report PDF Manifest ───────────────────────────

function toInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

export function extractDirectorPdfErrorPayload(value: unknown): DirectorPdfErrorPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (payload.ok !== false) return null;
  const renderVersion = toText(payload.renderVersion);
  const errorCode = toText(payload.errorCode);
  const error = toText(payload.error);

  if (renderVersion !== "v1" || !error) return null;
  if (
    errorCode !== "auth_failed"
    && errorCode !== "validation_failed"
    && errorCode !== "backend_pdf_failed"
  ) {
    return null;
  }

  const documentKind = toText(payload.documentKind);
  const renderBranch = toText(payload.renderBranch);

  return {
    ok: false,
    renderVersion: "v1",
    errorCode,
    error,
    ...(documentKind ? { documentKind: documentKind as DirectorPdfDocumentKind } : {}),
    ...(renderBranch ? { renderBranch: renderBranch as DirectorPdfRenderBranch } : {}),
  };
}

export function normalizeDirectorPdfSuccessPayload(args: {
  value: unknown;
  expectedDocumentKind: DirectorPdfDocumentKind;
  expectedRenderBranch: DirectorPdfRenderBranch;
  allowedRenderers: readonly DirectorPdfRenderer[];
}) {
  if (!args.value || typeof args.value !== "object" || Array.isArray(args.value)) {
    throw new Error("director pdf backend returned non-object payload");
  }

  const payload = args.value as Record<string, unknown>;
  if (payload.ok !== true) {
    throw new Error("director pdf backend returned non-success payload");
  }

  const renderVersion = toText(payload.renderVersion);
  const renderBranch = toText(payload.renderBranch);
  const renderer = toText(payload.renderer);
  const sourceKind = toText(payload.sourceKind);
  const documentKind = toText(payload.documentKind);
  const signedUrl = toText(payload.signedUrl);
  const bucketId = toText(payload.bucketId);
  const storagePath = toText(payload.storagePath);
  const fileName = toText(payload.fileName);
  const expiresInSeconds = toInteger(payload.expiresInSeconds);

  if (renderVersion !== "v1") {
    throw new Error(`director pdf backend invalid renderVersion: ${renderVersion || "<empty>"}`);
  }
  if (renderBranch !== args.expectedRenderBranch) {
    throw new Error(`director pdf backend invalid renderBranch: ${renderBranch || "<empty>"}`);
  }
  if (!args.allowedRenderers.includes(renderer as DirectorPdfRenderer)) {
    throw new Error(`director pdf backend invalid renderer: ${renderer || "<empty>"}`);
  }
  if (sourceKind !== "remote-url") {
    throw new Error(`director pdf backend invalid sourceKind: ${sourceKind || "<empty>"}`);
  }
  if (documentKind !== args.expectedDocumentKind) {
    throw new Error(`director pdf backend invalid documentKind: ${documentKind || "<empty>"}`);
  }
  if (!signedUrl) {
    throw new Error("director pdf backend missing signedUrl");
  }
  if (!bucketId || !storagePath || !fileName) {
    throw new Error("director pdf backend missing storage metadata");
  }

  return {
    ok: true as const,
    renderVersion: "v1" as const,
    renderBranch: args.expectedRenderBranch,
    renderer: renderer as DirectorPdfRenderer,
    sourceKind: "remote-url" as const,
    documentKind: args.expectedDocumentKind,
    signedUrl,
    bucketId,
    storagePath,
    fileName,
    expiresInSeconds: expiresInSeconds ?? 0,
    telemetry:
      payload.telemetry && typeof payload.telemetry === "object" && !Array.isArray(payload.telemetry)
        ? (payload.telemetry as Record<string, unknown>)
        : null,
  };
}

export async function resolveDirectorPdfInvokeErrorDetails(error: unknown): Promise<{
  message: string;
  status: number | null;
  serverErrorCode: DirectorPdfServerErrorCode | null;
}> {
  const directStatus =
    error && typeof error === "object" && "status" in error
      ? toInteger((error as { status?: unknown }).status)
      : null;
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  const contextStatus =
    context && typeof context === "object" && "status" in context
      ? toInteger((context as { status?: unknown }).status)
      : null;

  const baseMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : toText(error);

  if (context && typeof (context as { text?: unknown }).text === "function") {
    try {
      const response = context as {
        clone?: () => { text: () => Promise<string> };
        text: () => Promise<string>;
      };
      const text = await (typeof response.clone === "function" ? response.clone().text() : response.text());
      const raw = toText(text);
      if (raw) {
        const parsedResult = safeJsonParse<unknown>(raw, null);
        if (parsedResult.ok) {
          const parsed = parsedResult.value;
          const payload = extractDirectorPdfErrorPayload(parsed);
          if (payload) {
            return {
              message: payload.error,
              status: directStatus ?? contextStatus,
              serverErrorCode: payload.errorCode,
            };
          }

          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const nestedMessage = toText((parsed as Record<string, unknown>).error);
            if (nestedMessage) {
              return {
                message: nestedMessage,
                status: directStatus ?? contextStatus,
                serverErrorCode: null,
              };
            }
          }
        } else {
          return {
            message: raw,
            status: directStatus ?? contextStatus,
            serverErrorCode: null,
          };
        }
      }
    } catch {
      // ignore response body parsing failures
    }
  }

  return {
    message: baseMessage || "Director PDF request failed.",
    status: directStatus ?? contextStatus,
    serverErrorCode: null,
  };
}

export function classifyDirectorPdfTransportError(args: {
  message: string;
  status: number | null;
  serverErrorCode: DirectorPdfServerErrorCode | null;
  isWeb?: boolean;
}): DirectorPdfTransportErrorCode {
  const message = toText(args.message).toLowerCase();
  const status = args.status;
  const serverErrorCode = args.serverErrorCode;
  const isWeb = args.isWeb === true;

  if (serverErrorCode === "auth_failed" || status === 401 || status === 403) {
    return "auth_failed";
  }
  if (serverErrorCode === "backend_pdf_failed" || (status != null && status >= 500)) {
    return "backend_pdf_failed";
  }
  if (message.includes("cors") || message.includes("preflight")) {
    return "cors_preflight_failed";
  }
  if (
    isWeb
    && status == null
    && (
      message.includes("failed to fetch")
      || message.includes("network request failed")
      || message.includes("failed to send a request to the edge function")
    )
  ) {
    return "cors_preflight_failed";
  }
  if (status != null) {
    return "edge_function_http_error";
  }
  if (serverErrorCode === "validation_failed") {
    return "edge_function_http_error";
  }
  return "edge_function_unreachable";
}
