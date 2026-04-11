import { recordPlatformObservability } from "./platformObservability";

type ObservabilityInput = Parameters<typeof recordPlatformObservability>[0];

type SwallowedErrorKind = "soft_failure" | "cleanup_only";

type SwallowedErrorParams = {
  screen: ObservabilityInput["screen"];
  surface: string;
  event: string;
  error: unknown;
  kind?: SwallowedErrorKind;
  category?: ObservabilityInput["category"];
  sourceKind?: string;
  errorStage?: string;
  extra?: Record<string, unknown>;
};

const trimText = (value: unknown) => String(value ?? "").trim();

const getErrorSummary = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorClass: trimText(error.name) || "Error",
      errorMessage: trimText(error.message) || "unknown_error",
    };
  }

  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  return {
    errorClass: trimText(record.name) || null,
    errorMessage: trimText(record.message ?? error) || "unknown_error",
  };
};

export function recordSwallowedError(params: SwallowedErrorParams) {
  const kind = params.kind ?? "soft_failure";
  const summary = getErrorSummary(params.error);

  return recordPlatformObservability({
    screen: params.screen,
    surface: params.surface,
    category: params.category ?? (kind === "cleanup_only" ? "reload" : "ui"),
    event: params.event,
    result: "error",
    trigger: "catch",
    sourceKind: params.sourceKind,
    fallbackUsed: false,
    errorStage: params.errorStage ?? params.event,
    errorClass: summary.errorClass ?? undefined,
    errorMessage: summary.errorMessage || undefined,
    extra: {
      catchKind: kind,
      ...params.extra,
    },
  });
}
