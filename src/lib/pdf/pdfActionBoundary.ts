import type {
  PdfDocumentType,
  PdfOriginModule,
} from "../documents/pdfDocument";
import { recordPlatformObservability } from "../observability/platformObservability";

export type PdfActionTerminalClass =
  | "success"
  | "denied"
  | "conflict"
  | "retryable_failure"
  | "terminal_failure"
  | "viewer_failure"
  | "access_expired";

export type PdfActionBoundaryStage =
  | "access"
  | "prepare"
  | "viewer_entry"
  | "visibility";

export type PdfActionBoundaryRun = {
  runId: string;
  key: string;
  label?: string;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | null;
  fileName?: string | null;
  startedAt: number;
};

export class PdfActionBoundaryError extends Error {
  readonly terminalClass: PdfActionTerminalClass;
  readonly stage: PdfActionBoundaryStage;
  readonly causeError: unknown;

  constructor(params: {
    message: string;
    terminalClass: PdfActionTerminalClass;
    stage: PdfActionBoundaryStage;
    causeError?: unknown;
  }) {
    super(params.message);
    this.name = "PdfActionBoundaryError";
    this.terminalClass = params.terminalClass;
    this.stage = params.stage;
    this.causeError = params.causeError;
  }
}

const trimText = (value: unknown): string => String(value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const normalizeBoundaryKeyPart = (value: unknown): string =>
  trimText(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9:_./-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);

export function createPdfActionBoundaryKey(args: {
  key?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | number | null;
  fileName?: string | null;
  uri?: string | null;
}): string {
  const explicit = trimText(args.key);
  if (explicit) return explicit;
  const parts = [
    "pdf",
    args.originModule,
    args.documentType,
    args.entityId ?? "",
    args.fileName ?? "",
    args.uri ?? "",
  ].map(normalizeBoundaryKeyPart);
  return parts.filter(Boolean).join(":") || "pdf:document";
}

export function createPdfActionBoundaryRun(args: {
  runId: string;
  key: string;
  label?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | number | null;
  fileName?: string | null;
}): PdfActionBoundaryRun {
  return {
    runId: trimText(args.runId),
    key: trimText(args.key),
    label: trimText(args.label) || undefined,
    documentType: args.documentType,
    originModule: args.originModule,
    entityId: trimText(args.entityId) || null,
    fileName: trimText(args.fileName) || null,
    startedAt: nowMs(),
  };
}

const errorHaystack = (error: unknown): string => {
  const lifecycleRecord = asRecord(error);
  const cause = lifecycleRecord?.causeValue ?? lifecycleRecord?.causeError;
  const record = asRecord(cause) ?? lifecycleRecord;
  return [
    record?.status,
    record?.code,
    record?.message,
    record?.details,
    record?.hint,
    record?.error,
    error instanceof Error ? error.message : error,
    cause instanceof Error ? cause.message : cause,
  ]
    .map(trimText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export function classifyPdfActionFailure(
  error: unknown,
  stage: PdfActionBoundaryStage,
): PdfActionTerminalClass {
  if (error instanceof PdfActionBoundaryError) return error.terminalClass;
  const record = asRecord(error);
  const causeRecord = asRecord(record?.causeValue ?? record?.causeError);
  const status = trimText(causeRecord?.status ?? record?.status);
  const code = trimText(causeRecord?.code ?? record?.code);
  const haystack = errorHaystack(error);

  if (
    haystack.includes("expired") ||
    haystack.includes("stale pdf") ||
    haystack.includes("stale result") ||
    haystack.includes("signature expired")
  ) {
    return "access_expired";
  }

  if (
    status === "401" ||
    status === "403" ||
    code === "401" ||
    code === "403" ||
    code === "42501" ||
    haystack.includes("forbidden") ||
    haystack.includes("permission") ||
    haystack.includes("denied") ||
    haystack.includes("rls")
  ) {
    return "denied";
  }

  if (
    status === "409" ||
    code === "409" ||
    haystack.includes("conflict") ||
    haystack.includes("already")
  ) {
    return "conflict";
  }

  const numeric = Number(status || code);
  if (
    numeric === 408 ||
    numeric === 429 ||
    (numeric >= 500 && numeric <= 599) ||
    haystack.includes("network") ||
    haystack.includes("timeout") ||
    haystack.includes("temporar") ||
    haystack.includes("fetch failed") ||
    haystack.includes("storage")
  ) {
    return "retryable_failure";
  }

  return stage === "viewer_entry" || stage === "visibility"
    ? "viewer_failure"
    : "terminal_failure";
}

export function toPdfActionBoundaryError(
  error: unknown,
  stage: PdfActionBoundaryStage,
  fallback: string,
): PdfActionBoundaryError {
  if (error instanceof PdfActionBoundaryError) return error;
  const record = asRecord(error);
  const message =
    (error instanceof Error ? trimText(error.message) : "") ||
    trimText(record?.message) ||
    trimText(record?.details) ||
    trimText(record?.hint) ||
    trimText(error) ||
    fallback;
  return new PdfActionBoundaryError({
    message,
    stage,
    terminalClass: classifyPdfActionFailure(error, stage),
    causeError: error,
  });
}

export function recordPdfActionBoundaryEvent(args: {
  run: PdfActionBoundaryRun;
  event: string;
  result?: "success" | "error" | "joined_inflight" | "skipped";
  category?: "fetch" | "ui";
  stage?: PdfActionBoundaryStage;
  terminalClass?: PdfActionTerminalClass;
  sourceKind?: string | null;
  error?: unknown;
  extra?: Record<string, unknown>;
}) {
  const error = args.error;
  const boundaryError = error
    ? toPdfActionBoundaryError(
        error,
        args.stage ?? "viewer_entry",
        "PDF action failed",
      )
    : null;
  return recordPlatformObservability({
    screen: args.run.originModule,
    surface: "pdf_action_boundary",
    category: args.category ?? (args.stage === "access" || args.stage === "prepare" ? "fetch" : "ui"),
    event: args.event,
    result: args.result ?? "success",
    durationMs: Math.max(0, Math.round(nowMs() - args.run.startedAt)),
    sourceKind: trimText(args.sourceKind) || "pdf:action",
    errorStage: args.result === "error" ? args.stage : undefined,
    errorClass: boundaryError?.name,
    errorMessage: boundaryError?.message,
    extra: {
      key: args.run.key,
      runId: args.run.runId,
      label: args.run.label ?? null,
      documentType: args.run.documentType,
      originModule: args.run.originModule,
      entityId: args.run.entityId ?? null,
      fileName: args.run.fileName ?? null,
      terminalClass: args.terminalClass ?? boundaryError?.terminalClass ?? null,
      ...args.extra,
    },
  });
}
