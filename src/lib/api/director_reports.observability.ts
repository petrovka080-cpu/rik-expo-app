import { recordPlatformObservability } from "../observability/platformObservability";

type DirectorReportsSourceChainMeta = {
  stage: "options" | "report" | "discipline";
  branch: string;
  chain: string[];
  cacheLayer: "none" | "rows" | "rows_slice";
  rowsSource?: string | null;
  pricedStage?: "base" | "priced";
};

const getDirectorReportsTransportErrorMessage = (error: unknown, fallback: string) => {
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

const recordDirectorReportsTransportWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const message = getDirectorReportsTransportErrorMessage(error, event);
  if (__DEV__) console.warn("[director_reports.transport]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "director",
    surface: "reports_transport",
    category: "fetch",
    event,
    result: "error",
    fallbackUsed: true,
    errorStage: event,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message,
    extra: {
      module: "director_reports.transport",
      owner: "reports_transport",
      severity: "warn",
      ...extra,
    },
  });
};

const getDirectorReportsPayloadRowCount = (payload: unknown): number => {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== "object") return 0;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.rows)) return record.rows.length;
  if (Array.isArray(record.works)) return record.works.length;
  if (Array.isArray(record.objects)) return record.objects.length;
  return 0;
};

const recordDirectorReportsSourceChain = (
  meta: DirectorReportsSourceChainMeta,
  payload: unknown,
) => {
  recordPlatformObservability({
    screen: "director",
    surface: "reports_transport",
    category: "fetch",
    event: "source_chain_success",
    result: "success",
    rowCount: getDirectorReportsPayloadRowCount(payload),
    extra: {
      module: "director_reports.transport",
      owner: "reports_transport",
      stage: meta.stage,
      branch: meta.branch,
      chain: meta.chain.join(" -> "),
      chainDepth: meta.chain.length,
      cacheLayer: meta.cacheLayer,
      rowsSource: meta.rowsSource ?? null,
      pricedStage: meta.pricedStage ?? null,
    },
  });
};

export {
  getDirectorReportsTransportErrorMessage,
  recordDirectorReportsSourceChain,
  recordDirectorReportsTransportWarning,
};
