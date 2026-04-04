export type CanonicalPdfBackendRole = "foreman" | "warehouse";
export type CanonicalPdfBackendDocumentType =
  | "request"
  | "warehouse_document"
  | "warehouse_register"
  | "warehouse_materials";
export type CanonicalPdfBackendRenderer =
  | "browserless_puppeteer"
  | "local_browser_puppeteer";
export type CanonicalPdfBackendErrorCode =
  | "validation_failed"
  | "auth_failed"
  | "backend_pdf_failed";

type CanonicalPdfSuccessPayload = {
  ok: true;
  version: "v1";
  role: CanonicalPdfBackendRole;
  documentType: CanonicalPdfBackendDocumentType;
  sourceKind: "remote-url";
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  fileName: string;
  mimeType: "application/pdf";
  generatedAt: string;
  renderBranch: string;
  renderer: CanonicalPdfBackendRenderer;
  telemetry?: Record<string, unknown> | null;
};

type CanonicalPdfErrorPayload = {
  ok: false;
  version: "v1";
  role: CanonicalPdfBackendRole;
  documentType: CanonicalPdfBackendDocumentType;
  errorCode: CanonicalPdfBackendErrorCode;
  error: string;
  renderBranch?: string;
  telemetry?: Record<string, unknown> | null;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
} as const;

const trimText = (value: unknown) => String(value ?? "").trim();

const toObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const isDocumentType = (
  value: string,
): value is CanonicalPdfBackendDocumentType =>
  value === "request" ||
  value === "warehouse_document" ||
  value === "warehouse_register" ||
  value === "warehouse_materials";

const isRenderer = (
  value: string,
): value is CanonicalPdfBackendRenderer =>
  value === "browserless_puppeteer" || value === "local_browser_puppeteer";

export function createCanonicalPdfOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders,
  });
}

export function createCanonicalPdfErrorResponse(args: {
  status: number;
  role: CanonicalPdfBackendRole;
  documentType: CanonicalPdfBackendDocumentType;
  errorCode: CanonicalPdfBackendErrorCode;
  error: string;
  renderBranch?: string;
  telemetry?: Record<string, unknown> | null;
}) {
  const payload: CanonicalPdfErrorPayload = {
    ok: false,
    version: "v1",
    role: args.role,
    documentType: args.documentType,
    errorCode: args.errorCode,
    error: trimText(args.error) || "Canonical PDF render failed.",
    ...(trimText(args.renderBranch) ? { renderBranch: trimText(args.renderBranch) } : {}),
    ...(args.telemetry ? { telemetry: args.telemetry } : {}),
  };

  return new Response(JSON.stringify(payload), {
    status: args.status,
    headers: jsonHeaders,
  });
}

export function createCanonicalPdfSuccessResponse(args: {
  role: CanonicalPdfBackendRole;
  documentType: CanonicalPdfBackendDocumentType;
  bucketId: string;
  storagePath: string;
  signedUrl: string;
  fileName: string;
  generatedAt: string;
  renderBranch: string;
  renderer: CanonicalPdfBackendRenderer;
  telemetry?: Record<string, unknown> | null;
}) {
  const payload: CanonicalPdfSuccessPayload = {
    ok: true,
    version: "v1",
    role: args.role,
    documentType: args.documentType,
    sourceKind: "remote-url",
    bucketId: trimText(args.bucketId),
    storagePath: trimText(args.storagePath),
    signedUrl: trimText(args.signedUrl),
    fileName: trimText(args.fileName),
    mimeType: "application/pdf",
    generatedAt: trimText(args.generatedAt),
    renderBranch: trimText(args.renderBranch),
    renderer: args.renderer,
    ...(args.telemetry ? { telemetry: args.telemetry } : {}),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });
}

export function extractCanonicalPdfErrorPayload(value: unknown) {
  const row = toObject(value);
  if (!row || row.ok !== false) return null;

  const role = trimText(row.role);
  const documentType = trimText(row.documentType);
  const errorCode = trimText(row.errorCode);
  const error = trimText(row.error);

  if (!role || !documentType || !errorCode || !error) return null;
  return {
    role,
    documentType,
    errorCode,
    error,
  };
}

export function normalizeCanonicalPdfSuccessPayload(args: {
  value: unknown;
  expectedRole: CanonicalPdfBackendRole;
  expectedDocumentType: CanonicalPdfBackendDocumentType;
  expectedRenderBranch: string;
}) {
  const row = toObject(args.value);
  if (!row || row.ok !== true) {
    throw new Error("canonical pdf backend response must be an ok=true object");
  }

  const version = trimText(row.version);
  const role = trimText(row.role);
  const documentType = trimText(row.documentType);
  const sourceKind = trimText(row.sourceKind);
  const bucketId = trimText(row.bucketId);
  const storagePath = trimText(row.storagePath);
  const signedUrl = trimText(row.signedUrl);
  const fileName = trimText(row.fileName);
  const mimeType = trimText(row.mimeType);
  const generatedAt = trimText(row.generatedAt);
  const renderBranch = trimText(row.renderBranch);
  const renderer = trimText(row.renderer);
  const telemetry = toObject(row.telemetry);

  if (version !== "v1") {
    throw new Error(`canonical pdf backend invalid version: ${version || "<empty>"}`);
  }
  if (role !== args.expectedRole) {
    throw new Error(`canonical pdf backend invalid role: ${role || "<empty>"}`);
  }
  if (!isDocumentType(documentType) || documentType !== args.expectedDocumentType) {
    throw new Error(`canonical pdf backend invalid documentType: ${documentType || "<empty>"}`);
  }
  if (sourceKind !== "remote-url") {
    throw new Error(`canonical pdf backend invalid sourceKind: ${sourceKind || "<empty>"}`);
  }
  if (!bucketId || !storagePath || !signedUrl || !fileName || mimeType !== "application/pdf" || !generatedAt) {
    throw new Error("canonical pdf backend missing required success fields");
  }
  if (renderBranch !== args.expectedRenderBranch) {
    throw new Error(`canonical pdf backend invalid renderBranch: ${renderBranch || "<empty>"}`);
  }
  if (!isRenderer(renderer)) {
    throw new Error(`canonical pdf backend invalid renderer: ${renderer || "<empty>"}`);
  }

  return {
    ok: true as const,
    version: "v1" as const,
    role: args.expectedRole,
    documentType,
    sourceKind: "remote-url" as const,
    bucketId,
    storagePath,
    signedUrl,
    fileName,
    mimeType: "application/pdf" as const,
    generatedAt,
    renderBranch,
    renderer,
    telemetry,
  };
}
