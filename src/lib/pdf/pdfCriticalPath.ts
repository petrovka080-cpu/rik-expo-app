import { normalizeAppError } from "../errors/appError";
import { recordPlatformObservability } from "../observability/platformObservability";
import {
  recordPdfCrashBreadcrumb,
  shouldRecordPdfCrashBreadcrumbs,
} from "./pdfCrashBreadcrumbs";

export type PdfCriticalPathEvent =
  | "pdf_open_tap"
  | "pdf_prepare_start"
  | "pdf_prepare_success"
  | "pdf_prepare_fail"
  | "pdf_viewer_route_push"
  | "pdf_viewer_mounted"
  | "pdf_render_start"
  | "pdf_render_success"
  | "pdf_render_fail"
  | "pdf_terminal_success"
  | "pdf_terminal_fail";

type PdfCriticalPathResult =
  | "success"
  | "error"
  | "skipped"
  | "joined_inflight";

type PdfCriticalPathScreen =
  | "foreman"
  | "buyer"
  | "accountant"
  | "director"
  | "warehouse"
  | "contractor"
  | "reports"
  | "pdf_viewer";

type PdfCriticalPathRecordArgs = {
  event: PdfCriticalPathEvent;
  screen?: unknown;
  result?: PdfCriticalPathResult;
  category?: "fetch" | "ui" | "reload";
  sourceKind?: string | null;
  error?: unknown;
  documentType?: unknown;
  originModule?: unknown;
  entityId?: unknown;
  fileName?: unknown;
  sessionId?: unknown;
  openToken?: unknown;
  uri?: unknown;
  uriKind?: unknown;
  previewPath?: unknown;
  terminalState?: "success" | "error" | null;
  extra?: Record<string, unknown>;
};

const trimText = (value: unknown) => String(value ?? "").trim();

function normalizeScreen(value: unknown): PdfCriticalPathScreen {
  const text = trimText(value).toLowerCase();
  switch (text) {
    case "foreman":
    case "buyer":
    case "accountant":
    case "director":
    case "warehouse":
    case "contractor":
    case "reports":
    case "pdf_viewer":
      return text;
    default:
      return "reports";
  }
}

export function recordPdfCriticalPathEvent(args: PdfCriticalPathRecordArgs) {
  const screen = normalizeScreen(args.screen ?? args.originModule);
  const result = args.result ?? "success";
  const sourceKind = trimText(args.sourceKind) || "pdf:critical_path";
  const appError =
    result === "error"
      ? normalizeAppError(args.error, args.event, "fatal")
      : null;

  if (shouldRecordPdfCrashBreadcrumbs(screen)) {
    recordPdfCrashBreadcrumb({
      marker: args.event,
      screen,
      documentType: args.documentType,
      originModule: args.originModule,
      sourceKind,
      uriKind: args.uriKind,
      uri: args.uri,
      fileName: args.fileName,
      entityId: args.entityId,
      sessionId: args.sessionId,
      openToken: args.openToken,
      previewPath: args.previewPath,
      errorMessage: appError?.message,
      terminalState: args.terminalState ?? null,
      extra: {
        appErrorCode: appError?.code ?? null,
        appErrorContext: appError?.context ?? null,
        appErrorSeverity: appError?.severity ?? null,
        ...(args.extra ?? {}),
      },
    });
  }

  return recordPlatformObservability({
    screen,
    surface: "pdf_critical_path",
    category:
      args.category ?? (args.event.includes("prepare") ? "fetch" : "ui"),
    event: args.event,
    result,
    sourceKind,
    errorStage: result === "error" ? args.event : undefined,
    errorClass: appError?.code,
    errorMessage: appError?.message,
    extra: {
      documentType: trimText(args.documentType) || null,
      originModule: trimText(args.originModule) || null,
      entityId: trimText(args.entityId) || null,
      fileName: trimText(args.fileName) || null,
      sessionId: trimText(args.sessionId) || null,
      openToken: trimText(args.openToken) || null,
      previewPath: trimText(args.previewPath) || null,
      appErrorCode: appError?.code ?? null,
      appErrorContext: appError?.context ?? null,
      appErrorSeverity: appError?.severity ?? null,
      ...(args.extra ?? {}),
    },
  });
}
