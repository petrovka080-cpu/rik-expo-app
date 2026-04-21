export type PdfViewerErrorPhase =
  | "validation"
  | "resolution"
  | "render"
  | "timeout"
  | "action";

export type PdfViewerErrorKind =
  | "validation"
  | "runtime"
  | "unsupported"
  | "intentional_detach";

export type PdfViewerNormalizedError = {
  kind: PdfViewerErrorKind;
  phase: PdfViewerErrorPhase;
  message: string;
  isHardFailure: boolean;
};

function resolvePdfViewerErrorMessage(
  error: unknown,
  fallbackMessage?: string,
): string {
  if (error instanceof Error && String(error.message || "").trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallbackMessage || "Preview failed to load.";
}

function isIntentionalDetachError(error: unknown, message: string) {
  const lowerMessage = message.toLowerCase();
  const errorName =
    error instanceof Error ? String(error.name || "").toLowerCase() : "";
  return (
    errorName === "aborterror"
    || lowerMessage.includes("abort")
    || lowerMessage.includes("cancel")
    || lowerMessage.includes("dismiss")
    || lowerMessage.includes("detach")
  );
}

export function normalizePdfViewerError(args: {
  error: unknown;
  phase: PdfViewerErrorPhase;
  kind?: PdfViewerErrorKind;
  fallbackMessage?: string;
}): PdfViewerNormalizedError {
  const message = resolvePdfViewerErrorMessage(args.error, args.fallbackMessage);
  const requestedKind = args.kind ?? "runtime";
  const kind =
    requestedKind === "intentional_detach"
    || isIntentionalDetachError(args.error, message)
      ? "intentional_detach"
      : requestedKind;

  return {
    kind,
    phase: args.phase,
    message,
    isHardFailure: kind !== "intentional_detach",
  };
}
