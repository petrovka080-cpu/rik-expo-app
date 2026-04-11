import type {
  PdfDocumentType,
  PdfOriginModule,
} from "../documents/pdfDocument";
import { recordPlatformObservability } from "../observability/platformObservability";
import {
  recordPdfCrashBreadcrumb,
  shouldRecordPdfCrashBreadcrumbs,
} from "./pdfCrashBreadcrumbs";
import {
  recordPdfCriticalPathEvent,
  type PdfCriticalPathEvent,
} from "./pdfCriticalPath";

type PdfOpenStage =
  | "tap_start"
  | "busy_shown"
  | "document_prepare_start"
  | "document_prepare_done"
  | "document_prepare_fail"
  | "viewer_or_handoff_start"
  | "viewer_route_payload_ready"
  | "viewer_route_push_attempt"
  | "viewer_route_push_crash"
  | "first_open_visible"
  | "open_failed"
  | "busy_cleared";

type PdfOpenResult = "success" | "error" | "skipped" | "joined_inflight";
type PdfOpenCategory = "fetch" | "ui";
type PdfOpenScreen =
  | "foreman"
  | "buyer"
  | "accountant"
  | "director"
  | "warehouse"
  | "contractor"
  | "reports";

export type PdfOpenFlowContext = {
  key?: string;
  label?: string;
  fileName?: string | null;
  entityId?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  startedAt: number;
};

type PdfOpenStageRecordArgs = {
  context?: PdfOpenFlowContext | null;
  stage: PdfOpenStage;
  result?: PdfOpenResult;
  category?: PdfOpenCategory;
  sourceKind?: string | null;
  error?: unknown;
  extra?: Record<string, unknown>;
};

type PdfOpenPendingVisibility = {
  context: PdfOpenFlowContext;
  settled: boolean;
  resolve: () => void;
  reject: (error: unknown) => void;
};

const pendingVisibility = new Map<string, PdfOpenPendingVisibility>();

let tokenSeq = 0;

const nowMs = () => {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
};

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeScreen = (originModule: PdfOriginModule): PdfOpenScreen => {
  switch (originModule) {
    case "foreman":
    case "buyer":
    case "accountant":
    case "director":
    case "warehouse":
    case "contractor":
    case "reports":
      return originModule;
    default:
      return "reports";
  }
};

const getErrorShape = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorClass: trimText(error.name) || undefined,
      errorMessage: trimText(error.message) || undefined,
    };
  }
  return {
    errorClass: undefined,
    errorMessage: trimText(error) || undefined,
  };
};

const PDF_CRITICAL_EVENT_BY_STAGE: Partial<
  Record<PdfOpenStage, PdfCriticalPathEvent>
> = {
  tap_start: "pdf_open_tap",
  document_prepare_start: "pdf_prepare_start",
  document_prepare_done: "pdf_prepare_success",
  document_prepare_fail: "pdf_prepare_fail",
  viewer_route_push_attempt: "pdf_viewer_route_push",
  first_open_visible: "pdf_terminal_success",
  open_failed: "pdf_terminal_fail",
};

export function createPdfOpenFlowContext(args: {
  key?: string;
  label?: string;
  fileName?: string | null;
  entityId?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
}): PdfOpenFlowContext {
  return {
    key: trimText(args.key) || undefined,
    label: trimText(args.label) || undefined,
    fileName: trimText(args.fileName) || undefined,
    entityId: trimText(args.entityId) || undefined,
    documentType: args.documentType,
    originModule: args.originModule,
    startedAt: nowMs(),
  };
}

export function recordPdfOpenStage(args: PdfOpenStageRecordArgs) {
  if (!args.context) return null;
  const screen = normalizeScreen(args.context.originModule);
  const criticalEvent = PDF_CRITICAL_EVENT_BY_STAGE[args.stage];
  if (criticalEvent) {
    recordPdfCriticalPathEvent({
      event: criticalEvent,
      screen,
      result: args.result,
      category:
        args.category ??
        (args.stage === "document_prepare_start" ||
        args.stage === "document_prepare_done" ||
        args.stage === "document_prepare_fail"
          ? "fetch"
          : "ui"),
      sourceKind: args.sourceKind,
      error: args.error,
      documentType: args.context.documentType,
      originModule: args.context.originModule,
      entityId: args.context.entityId,
      fileName: args.context.fileName,
      sessionId: args.extra?.sessionId,
      openToken: args.extra?.openToken,
      uri: args.extra?.uri,
      uriKind: args.extra?.uriKind,
      previewPath: args.extra?.previewPath ?? args.extra?.previewSourceMode,
      terminalState:
        args.stage === "first_open_visible"
          ? "success"
          : args.stage === "open_failed"
            ? "error"
            : null,
      extra: args.extra,
    });
  }
  if (shouldRecordPdfCrashBreadcrumbs(screen)) {
    recordPdfCrashBreadcrumb({
      marker: args.stage,
      screen,
      documentType: args.context.documentType,
      originModule: args.context.originModule,
      sourceKind: trimText(args.sourceKind) || "pdf:document",
      fileName: args.context.fileName,
      entityId: args.context.entityId,
      openToken: trimText(args.extra?.openToken),
      sessionId: trimText(args.extra?.sessionId),
      previewPath: trimText(
        args.extra?.previewPath ??
          args.extra?.previewSourceMode ??
          args.extra?.route,
      ),
      uriKind: trimText(args.extra?.uriKind),
      uri: args.extra?.uri,
      fileExists: args.extra?.fileExists,
      fileSizeBytes: args.extra?.fileSizeBytes,
      errorMessage: getErrorShape(args.error).errorMessage,
      terminalState:
        args.stage === "first_open_visible"
          ? "success"
          : args.stage === "open_failed"
            ? "error"
            : null,
      extra: args.extra,
    });
  }
  const errorShape = getErrorShape(args.error);
  return recordPlatformObservability({
    screen,
    surface: "pdf_open_family",
    category:
      args.category ??
      (args.stage === "document_prepare_start" ||
      args.stage === "document_prepare_done"
        ? "fetch"
        : "ui"),
    event: args.stage,
    result: args.result ?? "success",
    durationMs: Math.max(0, Math.round(nowMs() - args.context.startedAt)),
    sourceKind: trimText(args.sourceKind) || "pdf:document",
    errorStage: args.result === "error" ? args.stage : undefined,
    errorClass: errorShape.errorClass,
    errorMessage: errorShape.errorMessage,
    extra: {
      key: args.context.key ?? null,
      label: args.context.label ?? null,
      fileName: args.context.fileName ?? null,
      entityId: args.context.entityId ?? null,
      documentType: args.context.documentType,
      originModule: args.context.originModule,
      ...args.extra,
    },
  });
}

export function beginPdfOpenVisibilityWait(context: PdfOpenFlowContext) {
  tokenSeq += 1;
  const token = `pdf_open_${Date.now().toString(36)}_${tokenSeq.toString(36)}`;
  const promise = new Promise<void>((resolve, reject) => {
    pendingVisibility.set(token, {
      context,
      settled: false,
      resolve,
      reject,
    });
  });
  return { token, promise };
}

export function markPdfOpenVisible(
  token: string | null | undefined,
  params?: {
    sourceKind?: string | null;
    extra?: Record<string, unknown>;
  },
) {
  const key = trimText(token);
  if (!key) return false;
  const pending = pendingVisibility.get(key);
  if (!pending || pending.settled) return false;
  pending.settled = true;
  pendingVisibility.delete(key);
  recordPdfOpenStage({
    context: pending.context,
    stage: "first_open_visible",
    sourceKind: params?.sourceKind,
    extra: params?.extra,
  });
  pending.resolve();
  return true;
}

export function failPdfOpenVisible(
  token: string | null | undefined,
  error: unknown,
  params?: {
    sourceKind?: string | null;
    extra?: Record<string, unknown>;
  },
) {
  const key = trimText(token);
  if (!key) return false;
  const pending = pendingVisibility.get(key);
  if (!pending || pending.settled) return false;
  pending.settled = true;
  pendingVisibility.delete(key);
  recordPdfOpenStage({
    context: pending.context,
    stage: "open_failed",
    result: "error",
    sourceKind: params?.sourceKind,
    error,
    extra: params?.extra,
  });
  pending.reject(error);
  return true;
}

export function resetPdfOpenFlowStateForTests() {
  pendingVisibility.clear();
  tokenSeq = 0;
}
