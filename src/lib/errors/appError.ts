export type AppErrorSeverity = "warn" | "fatal";

export type AppError = {
  code: string;
  message: string;
  context: string;
  severity: AppErrorSeverity;
  cause?: unknown;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeCode = (value: unknown) => {
  const text = trimText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return text || "unknown_error";
};

export function normalizeAppError(
  error: unknown,
  context: string,
  severity: AppErrorSeverity = "warn",
): AppError {
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const message =
    error instanceof Error
      ? trimText(error.message)
      : trimText(record.message ?? error);
  const code =
    trimText(record.code) ||
    (error instanceof Error ? trimText(error.name) : "") ||
    "unknown_error";

  return {
    code: normalizeCode(code),
    message: message || "Unknown error",
    context: trimText(context) || "unknown_context",
    severity,
    cause: error,
  };
}

export function okResult<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function errorResult<T = never>(
  error: unknown,
  context: string,
  severity: AppErrorSeverity = "warn",
): Result<T> {
  return {
    ok: false,
    error: normalizeAppError(error, context, severity),
  };
}
