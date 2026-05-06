export type ForemanRequestPdfRequest = {
  version: "v1";
  role: "foreman";
  documentType: "request";
  requestId: string;
  generatedBy?: string | null;
  clientSourceFingerprint?: string | null;
};

export const FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS = {
  pageSize: 100,
  maxPageSize: 100,
  maxRows: 5000,
} as const;

const trimText = (value: unknown) => String(value ?? "").trim();

const sanitizePathSegment = (value: string) =>
  trimText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "version";

export function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(trimText(value));
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
  if (
    subtle &&
    typeof subtle.digest === "function" &&
    typeof TextEncoder !== "undefined"
  ) {
    const digest = await subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fnv1a32_${hashString32(text)}`;
}

const FOREMAN_REQUEST_NOISE_KEYS = new Set([
  "_debug",
  "cache",
  "duration_ms",
  "durationMs",
  "expiresInSeconds",
  "fetched_at",
  "generated_at",
  "generatedAt",
  "loaded_at",
  "nonce",
  "signed_url",
  "signedUrl",
  "telemetry",
  "timing",
  "trace_id",
  "traceId",
  "transport",
]);

function stripForemanRequestNoise(value: unknown, key?: string): unknown {
  if (key && FOREMAN_REQUEST_NOISE_KEYS.has(key)) return undefined;
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value))
    return value.map((item) => stripForemanRequestNoise(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(source).sort()) {
      const childValue = stripForemanRequestNoise(source[childKey], childKey);
      if (childValue !== undefined) output[childKey] = childValue;
    }
    return output;
  }
  return trimText(value);
}

export const FOREMAN_REQUEST_MANIFEST_VERSION =
  "pdf_z4_foreman_request_manifest_v1";
export const FOREMAN_REQUEST_DOCUMENT_KIND = "foreman_request";
export const FOREMAN_REQUEST_TEMPLATE_VERSION = "foreman_request_template_v1";
export const FOREMAN_REQUEST_RENDER_CONTRACT_VERSION =
  "backend_foreman_request_v1";
export const FOREMAN_REQUEST_ARTIFACT_CONTRACT_VERSION =
  "foreman_request_artifact_v1";

const FOREMAN_REQUEST_SOURCE_VERSION_PREFIX = "frq_src_v1";
const FOREMAN_REQUEST_ARTIFACT_VERSION_PREFIX = "frq_art_v1";
const FOREMAN_REQUEST_SCOPE_VERSION_PREFIX = "frq_scope_v1";
const FOREMAN_REQUEST_ARTIFACT_ROOT = "foreman/request/artifacts/v1";
const FOREMAN_REQUEST_MANIFEST_ROOT = "foreman/request/manifests/v1";

export type ForemanRequestManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type ForemanRequestDocumentScope = {
  role: "foreman";
  family: "request";
  report: "request";
  requestId: string;
};

export type ForemanRequestManifestContract = {
  version: typeof FOREMAN_REQUEST_MANIFEST_VERSION;
  documentKind: typeof FOREMAN_REQUEST_DOCUMENT_KIND;
  documentScope: ForemanRequestDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  templateVersion: typeof FOREMAN_REQUEST_TEMPLATE_VERSION;
  renderContractVersion: typeof FOREMAN_REQUEST_RENDER_CONTRACT_VERSION;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastSourceChangeAt: string | null;
};

export type BuildForemanRequestManifestContractArgs = {
  requestId: string;
  clientSourceFingerprint?: string | null;
  sourceModel?: unknown;
  fileName?: string | null;
  lastSourceChangeAt?: string | null;
};

export function buildForemanRequestClientSourceFingerprint(args: {
  requestId: string;
  displayNo?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  objectName?: string | null;
}) {
  const identity = {
    version: "foreman_request_client_source_v1",
    requestId: trimText(args.requestId),
    displayNo: trimText(args.displayNo) || null,
    status: trimText(args.status) || null,
    createdAt: trimText(args.createdAt) || null,
    updatedAt: trimText(args.updatedAt) || null,
    objectName: trimText(args.objectName) || null,
  };
  return `frq_client_v1_${hashString32(stableJsonStringify(stripForemanRequestNoise(identity)))}`;
}

export function buildForemanRequestDocumentScope(args: {
  requestId: string;
}): ForemanRequestDocumentScope {
  const requestId = trimText(args.requestId);
  if (!requestId) {
    throw new Error("foreman request manifest missing requestId");
  }
  return {
    role: "foreman",
    family: "request",
    report: "request",
    requestId,
  };
}

export async function buildForemanRequestManifestContract(
  args: BuildForemanRequestManifestContractArgs,
): Promise<ForemanRequestManifestContract> {
  const documentScope = buildForemanRequestDocumentScope(args);
  const fileName = trimText(args.fileName) || "foreman_request.pdf";
  const sourceIdentity = {
    contractVersion: FOREMAN_REQUEST_MANIFEST_VERSION,
    documentKind: FOREMAN_REQUEST_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "table:requests+request_items",
      clientSourceFingerprint: stripForemanRequestNoise(
        trimText(args.clientSourceFingerprint) || null,
      ),
      sourceModel: stripForemanRequestNoise(args.sourceModel ?? null),
    },
  };
  const sourceHash = await stableHash(sourceIdentity);
  const sourceVersion = `${FOREMAN_REQUEST_SOURCE_VERSION_PREFIX}_${sourceHash}`;
  const artifactHash = await stableHash({
    artifactContractVersion: FOREMAN_REQUEST_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: FOREMAN_REQUEST_TEMPLATE_VERSION,
    renderContractVersion: FOREMAN_REQUEST_RENDER_CONTRACT_VERSION,
  });
  const artifactVersion = `${FOREMAN_REQUEST_ARTIFACT_VERSION_PREFIX}_${artifactHash}`;
  const scopeHash = await stableHash({
    scopeVersion: FOREMAN_REQUEST_SCOPE_VERSION_PREFIX,
    documentKind: FOREMAN_REQUEST_DOCUMENT_KIND,
    documentScope,
  });

  return {
    version: FOREMAN_REQUEST_MANIFEST_VERSION,
    documentKind: FOREMAN_REQUEST_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion: FOREMAN_REQUEST_TEMPLATE_VERSION,
    renderContractVersion: FOREMAN_REQUEST_RENDER_CONTRACT_VERSION,
    artifactPath: `${FOREMAN_REQUEST_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${FOREMAN_REQUEST_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastSourceChangeAt: trimText(args.lastSourceChangeAt) || null,
  };
}

export function normalizeForemanRequestPdfRequest(
  value: unknown,
): ForemanRequestPdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("foreman request pdf payload must be an object");
  }

  const row = value as Record<string, unknown>;
  const version = trimText(row.version);
  const role = trimText(row.role).toLowerCase();
  const documentType = trimText(row.documentType);
  const requestId = trimText(row.requestId);
  const generatedBy = trimText(row.generatedBy);
  const clientSourceFingerprint = trimText(row.clientSourceFingerprint);

  if (version !== "v1") {
    throw new Error(
      `foreman request pdf payload invalid version: ${version || "<empty>"}`,
    );
  }
  if (role !== "foreman") {
    throw new Error(
      `foreman request pdf payload invalid role: ${role || "<empty>"}`,
    );
  }
  if (documentType !== "request") {
    throw new Error(
      `foreman request pdf payload invalid documentType: ${documentType || "<empty>"}`,
    );
  }
  if (!requestId) {
    throw new Error("foreman request pdf payload missing requestId");
  }

  return {
    version: "v1",
    role: "foreman",
    documentType: "request",
    requestId,
    generatedBy: generatedBy || null,
    ...(clientSourceFingerprint ? { clientSourceFingerprint } : {}),
  };
}
