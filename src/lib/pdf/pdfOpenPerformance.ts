import type {
  PdfDocumentType,
  PdfOriginModule,
} from "../documents/pdfDocument";
import { recordPlatformObservability } from "../observability/platformObservability";

export type PdfOpenPerformanceStage =
  | "tap_start"
  | "document_prepare_start"
  | "document_prepare_done"
  | "viewer_route_push_attempt"
  | "viewer_route_mounted"
  | "first_open_visible"
  | "open_failed";

export type PdfOpenPerformanceMarks = Partial<Record<PdfOpenPerformanceStage, number>>;

type PdfOpenPerformanceScreen =
  | "foreman"
  | "buyer"
  | "accountant"
  | "director"
  | "warehouse"
  | "contractor"
  | "reports";

type PdfOpenPerformanceResult = "success" | "error";

export type PdfOpenPerformanceMetrics = {
  tapToSourceReadyMs: number | null;
  prepareDurationMs: number | null;
  tapToRoutePushMs: number | null;
  tapToRouteMountedMs: number | null;
  routePushToMountedMs: number | null;
  routeMountedToVisibleMs: number | null;
  sourceReadyToVisibleMs: number | null;
  routePushToVisibleMs: number | null;
  tapToVisibleMs: number | null;
  tapToTerminalMs: number | null;
};

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeScreen = (originModule: PdfOriginModule): PdfOpenPerformanceScreen => {
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

const finiteOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const durationBetween = (
  from: number | null | undefined,
  to: number | null | undefined,
) => {
  if (typeof from !== "number" || typeof to !== "number") return null;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.round(to - from));
};

export function recordPdfOpenPerformanceMark(
  marks: PdfOpenPerformanceMarks,
  stage: PdfOpenPerformanceStage,
  atMs: number,
) {
  if (!Number.isFinite(atMs)) return;
  if (typeof marks[stage] === "number") return;
  marks[stage] = atMs;
}

export function buildPdfOpenPerformanceMetrics(args: {
  marks: PdfOpenPerformanceMarks;
  startedAt: number;
  terminalAtMs: number;
  result: PdfOpenPerformanceResult;
}): PdfOpenPerformanceMetrics {
  const tap = finiteOrNull(args.marks.tap_start) ?? finiteOrNull(args.startedAt);
  const prepareStart = finiteOrNull(args.marks.document_prepare_start);
  const sourceReady = finiteOrNull(args.marks.document_prepare_done);
  const routePush = finiteOrNull(args.marks.viewer_route_push_attempt);
  const routeMounted = finiteOrNull(args.marks.viewer_route_mounted);
  const visible =
    args.result === "success"
      ? finiteOrNull(args.marks.first_open_visible) ?? finiteOrNull(args.terminalAtMs)
      : null;
  const terminal = finiteOrNull(args.terminalAtMs);

  return {
    tapToSourceReadyMs: durationBetween(tap, sourceReady),
    prepareDurationMs: durationBetween(prepareStart, sourceReady),
    tapToRoutePushMs: durationBetween(tap, routePush),
    tapToRouteMountedMs: durationBetween(tap, routeMounted),
    routePushToMountedMs: durationBetween(routePush, routeMounted),
    routeMountedToVisibleMs: durationBetween(routeMounted, visible),
    sourceReadyToVisibleMs: durationBetween(sourceReady, visible),
    routePushToVisibleMs: durationBetween(routePush, visible),
    tapToVisibleMs: durationBetween(tap, visible),
    tapToTerminalMs: durationBetween(tap, terminal),
  };
}

export function recordPdfOpenPerformanceSummary(args: {
  marks: PdfOpenPerformanceMarks;
  startedAt: number;
  terminalAtMs: number;
  result: PdfOpenPerformanceResult;
  sourceKind?: string | null;
  key?: string | null;
  label?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | null;
  fileName?: string | null;
  extra?: Record<string, unknown>;
}) {
  const metrics = buildPdfOpenPerformanceMetrics({
    marks: args.marks,
    startedAt: args.startedAt,
    terminalAtMs: args.terminalAtMs,
    result: args.result,
  });
  const durationMs = metrics.tapToVisibleMs ?? metrics.tapToTerminalMs ?? 0;

  return recordPlatformObservability({
    screen: normalizeScreen(args.originModule),
    surface: "pdf_open_performance",
    category: "ui",
    event: "pdf_open_latency",
    result: args.result,
    durationMs,
    sourceKind: trimText(args.sourceKind) || "pdf:document",
    extra: {
      key: trimText(args.key) || null,
      label: trimText(args.label) || null,
      documentType: args.documentType,
      originModule: args.originModule,
      entityId: trimText(args.entityId) || null,
      fileName: trimText(args.fileName) || null,
      hasSourceReadyMark: typeof args.marks.document_prepare_done === "number",
      hasRouteMountedMark: typeof args.marks.viewer_route_mounted === "number",
      ...metrics,
      ...args.extra,
    },
  });
}
