import type { OfflineMutationErrorKind } from "./mutation.types";

const trim = (value: unknown) => String(value ?? "").trim();

const shortCode = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "unknown";

const getErrorRecord = (error: unknown): Record<string, unknown> =>
  error && typeof error === "object" ? (error as Record<string, unknown>) : {};

export const getOfflineMutationErrorMessage = (error: unknown) => {
  if (error instanceof Error) return trim(error.message) || error.name || "offline_mutation_error";
  const record = getErrorRecord(error);
  return trim(record.message ?? error) || "offline_mutation_error";
};

export const getOfflineMutationErrorStatusCode = (error: unknown): number | null => {
  const record = getErrorRecord(error);
  const status = Number(record.status ?? record.statusCode ?? record.code_status);
  return Number.isFinite(status) ? status : null;
};

export const getOfflineMutationErrorCode = (error: unknown, message?: string | null) => {
  const record = getErrorRecord(error);
  const explicit =
    trim(record.code) ||
    trim(record.error_code) ||
    trim(record.name) ||
    trim(record.error) ||
    trim(record.hint);
  if (explicit) return shortCode(explicit);
  const statusCode = getOfflineMutationErrorStatusCode(error);
  if (statusCode != null) return `http_${statusCode}`;
  return shortCode(trim(message) || getOfflineMutationErrorMessage(error));
};

export const classifyOfflineMutationErrorKind = (
  error: unknown,
): {
  message: string;
  errorCode: string;
  statusCode: number | null;
  errorKind: OfflineMutationErrorKind;
} => {
  const message = getOfflineMutationErrorMessage(error);
  const lower = message.toLowerCase();
  const statusCode = getOfflineMutationErrorStatusCode(error);

  let errorKind: OfflineMutationErrorKind = "runtime";
  if (
    lower.includes("offline") ||
    lower.includes("network request failed") ||
    lower.includes("internet") ||
    lower.includes("no connection")
  ) {
    errorKind = "network_unreachable";
  } else if (lower.includes("timeout") || lower.includes("timed out")) {
    errorKind = "timeout";
  } else if (
    statusCode === 409 ||
    statusCode === 412 ||
    lower.includes("version mismatch") ||
    lower.includes("stale") ||
    lower.includes("outdated")
  ) {
    errorKind = "stale_state";
  } else if (
    lower.includes("remote divergence") ||
    lower.includes("diverged") ||
    lower.includes("already changed") ||
    lower.includes("already modified")
  ) {
    errorKind = "remote_divergence";
  } else if (lower.includes("conflict")) {
    errorKind = "conflict";
  } else if (
    statusCode === 401 ||
    statusCode === 403 ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("session expired")
  ) {
    errorKind = "auth_invalid";
  } else if (
    (statusCode != null && statusCode >= 500) ||
    lower.includes("temporar") ||
    lower.includes("internal server") ||
    lower.includes("service unavailable")
  ) {
    errorKind = "transient_server";
  } else if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("connection") ||
    lower.includes("transport")
  ) {
    errorKind = "transport";
  } else if (
    statusCode === 400 ||
    statusCode === 404 ||
    statusCode === 422 ||
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("required") ||
    lower.includes("schema")
  ) {
    errorKind = "contract_validation";
  }

  return {
    message,
    errorCode: getOfflineMutationErrorCode(error, message),
    statusCode,
    errorKind,
  };
};

export const isOfflineMutationConflictKind = (kind: OfflineMutationErrorKind) =>
  kind === "stale_state" || kind === "remote_divergence" || kind === "conflict";

