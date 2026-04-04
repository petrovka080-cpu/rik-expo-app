import { Platform } from "react-native";
import { recordPlatformObservability } from "../observability/platformObservability";

export type CanonicalPdfBoundaryEvent =
  | "click_start"
  | "payload_ready"
  | "backend_invoke_start"
  | "backend_invoke_success"
  | "backend_invoke_failure"
  | "pdf_storage_uploaded"
  | "signed_url_received"
  | "viewer_open_start"
  | "viewer_before_render"
  | "render_success"
  | "render_failure"
  | "busy_enter"
  | "busy_exit"
  | "mobile_native_handoff_start"
  | "mobile_native_handoff_success"
  | "mobile_native_handoff_failure";

type CanonicalPdfBoundaryBase = {
  screen: "foreman" | "warehouse";
  surface: string;
  role: "foreman" | "warehouse";
  documentType: string;
  sourceKind?: string | null;
  sessionId?: string | null;
  openToken?: string | null;
  fallbackUsed?: boolean;
};

type CanonicalPdfBoundaryRecordArgs = CanonicalPdfBoundaryBase & {
  event: CanonicalPdfBoundaryEvent;
  result?: "success" | "error";
  category?: "fetch" | "ui" | "reload";
  durationMs?: number | null;
  errorStage?: string | null;
  failureClass?: string | null;
  errorMessage?: string | null;
  extra?: Record<string, unknown>;
};

const trimText = (value: unknown) => String(value ?? "").trim();

export function recordCanonicalPdfBoundary(args: CanonicalPdfBoundaryRecordArgs) {
  return recordPlatformObservability({
    screen: args.screen,
    surface: args.surface,
    category: args.category ?? (args.event.includes("render") ? "ui" : "fetch"),
    event: args.event,
    result: args.result ?? "success",
    durationMs:
      typeof args.durationMs === "number" && Number.isFinite(args.durationMs)
        ? Math.max(0, Math.round(args.durationMs))
        : undefined,
    sourceKind: trimText(args.sourceKind) || undefined,
    fallbackUsed: args.fallbackUsed === true,
    errorStage: trimText(args.errorStage) || undefined,
    errorClass: trimText(args.failureClass) || undefined,
    errorMessage: trimText(args.errorMessage) || undefined,
    extra: {
      role: args.role,
      documentType: args.documentType,
      sourceKind: trimText(args.sourceKind) || null,
      sessionId: trimText(args.sessionId) || null,
      openToken: trimText(args.openToken) || null,
      platform: Platform.OS,
      errorStage: trimText(args.errorStage) || null,
      failureClass: trimText(args.failureClass) || null,
      fallbackUsed: args.fallbackUsed === true,
      ...args.extra,
    },
  });
}

export function beginCanonicalPdfBoundary(base: CanonicalPdfBoundaryBase) {
  const startedAt = Date.now();

  return {
    success(
      event: CanonicalPdfBoundaryEvent,
      fields?: Omit<
        CanonicalPdfBoundaryRecordArgs,
        "screen" | "surface" | "role" | "documentType" | "event" | "result"
      >,
    ) {
      return recordCanonicalPdfBoundary({
        ...base,
        ...fields,
        event,
        result: "success",
        durationMs: fields?.durationMs ?? Date.now() - startedAt,
      });
    },
    error(
      event: CanonicalPdfBoundaryEvent,
      error: unknown,
      fields?: Omit<
        CanonicalPdfBoundaryRecordArgs,
        "screen" | "surface" | "role" | "documentType" | "event" | "result" | "errorMessage" | "failureClass"
      >,
    ) {
      const failureClass =
        error instanceof Error
          ? trimText(error.name) || "Error"
          : trimText((error as { name?: unknown })?.name) || undefined;
      const errorMessage =
        error instanceof Error
          ? trimText(error.message)
          : trimText((error as { message?: unknown })?.message ?? error);

      return recordCanonicalPdfBoundary({
        ...base,
        ...fields,
        event,
        result: "error",
        durationMs: fields?.durationMs ?? Date.now() - startedAt,
        failureClass,
        errorMessage,
      });
    },
  };
}
