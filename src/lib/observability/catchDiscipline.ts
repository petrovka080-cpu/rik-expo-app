import { logError } from "../logError";
import { recordPlatformObservability } from "./platformObservability";

export type CatchDisciplineKind =
  | "critical_fail"
  | "soft_failure"
  | "cleanup_only"
  | "degraded_fallback";

type ObservabilityInput = Parameters<typeof recordPlatformObservability>[0];

type CatchDisciplineParams = {
  screen: ObservabilityInput["screen"];
  surface: string;
  event: string;
  error: unknown;
  kind: CatchDisciplineKind;
  category?: ObservabilityInput["category"];
  sourceKind?: string;
  errorStage?: string;
  trigger?: string;
  extra?: Record<string, unknown>;
  logContext?: string;
};

type ReportAndSwallowParams = Omit<CatchDisciplineParams, "kind"> & {
  kind?: Exclude<CatchDisciplineKind, "critical_fail">;
  scope?: string;
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

export function recordCatchDiscipline(params: CatchDisciplineParams) {
  const summary = getErrorSummary(params.error);
  const extra = {
    catchKind: params.kind,
    ...params.extra,
  };

  if (params.kind === "critical_fail") {
    logError(
      params.logContext ?? `${params.screen}.${params.surface}.${params.event}`,
      params.error,
      extra,
    );
  }

  return recordPlatformObservability({
    screen: params.screen,
    surface: params.surface,
    category: params.category ?? (params.kind === "cleanup_only" ? "reload" : "fetch"),
    event: params.event,
    result: "error",
    trigger: params.trigger ?? "catch",
    sourceKind: params.sourceKind,
    fallbackUsed: params.kind === "degraded_fallback",
    errorStage: params.errorStage,
    errorClass: summary.errorClass ?? undefined,
    errorMessage: summary.errorMessage || undefined,
    extra,
  });
}

export function reportAndSwallow(params: ReportAndSwallowParams) {
  const kind = params.kind ?? "soft_failure";
  const scope = trimText(params.scope) || `${params.screen}.${params.surface}.${params.event}`;
  const summary = getErrorSummary(params.error);

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn("[catch.swallow]", {
      scope,
      kind,
      errorClass: summary.errorClass,
      errorMessage: summary.errorMessage,
      extra: params.extra ?? {},
    });
  }

  return recordCatchDiscipline({
    ...params,
    kind,
    extra: {
      scope,
      ...params.extra,
    },
  });
}
