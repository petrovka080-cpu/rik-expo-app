import { recordPlatformObservability } from "../observability/platformObservability";

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
  console.warn("[director_reports.transport]", { event, message, ...extra });
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

export {
  getDirectorReportsTransportErrorMessage,
  recordDirectorReportsTransportWarning,
};
