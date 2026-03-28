import { recordPlatformObservability } from "../observability/platformObservability";

export type CatalogObservabilityMode = "fail" | "degraded" | "fallback";

const catalogOnceWarnings = new Set<string>();

export const getCatalogErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }
  const raw = String(error ?? "").trim();
  return raw || fallback;
};

export const recordCatalogWarning = (params: {
  screen: "market" | "request";
  event: string;
  operation: string;
  error: unknown;
  mode: CatalogObservabilityMode;
  extra?: Record<string, unknown>;
  onceKey?: string;
  surface?: string;
  owner?: string;
  module?: string;
}) => {
  const {
    screen,
    event,
    operation,
    error,
    mode,
    extra,
    onceKey,
    surface = "catalog_api",
    owner = "catalog_api",
    module = "catalog_api",
  } = params;
  const message = getCatalogErrorMessage(error, operation);
  const dedupeKey = onceKey ? `${onceKey}:${message}` : null;
  if (dedupeKey && catalogOnceWarnings.has(dedupeKey)) return;
  if (dedupeKey) catalogOnceWarnings.add(dedupeKey);

  console.warn("[catalog]", { event, operation, mode, message, ...extra });
  recordPlatformObservability({
    screen,
    surface,
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: mode !== "fail",
    errorStage: operation,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message || undefined,
    extra: {
      module,
      owner,
      mode,
      ...extra,
    },
  });
};
