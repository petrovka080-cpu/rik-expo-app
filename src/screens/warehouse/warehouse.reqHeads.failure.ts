import type { WarehouseReqHeadsFailureClass } from "./warehouse.types";

export type WarehouseReqHeadsFailureDecision = {
  failureClass: WarehouseReqHeadsFailureClass;
  reason: string;
  retryAfterMs: number;
};

type WarehouseReqHeadsCompatKind =
  | "missing_function"
  | "permission"
  | "auth"
  | "validation"
  | "transient"
  | "unknown";

type WarehouseReqHeadsCompatDecision = {
  kind: WarehouseReqHeadsCompatKind;
  reason: string;
};

const SCHEMA_RETRY_AFTER_MS = 30_000;
const PERMISSION_RETRY_AFTER_MS = 20_000;
const TRANSIENT_RETRY_AFTER_MS = 5_000;
const SERVER_RETRY_AFTER_MS = 10_000;

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const normalizeErrorRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const errorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const record = normalizeErrorRecord(error);
  return String(record.message ?? record.error_description ?? error ?? "").trim();
};

const errorCode = (error: unknown) => {
  const record = normalizeErrorRecord(error);
  return String(record.code ?? "").trim().toLowerCase();
};

const classifyWarehouseReqHeadsCompatError = (
  message: string,
  code: string,
): WarehouseReqHeadsCompatDecision => {
  if (
    code === "pgrst302" ||
    message.includes("could not find") ||
    (message.includes("/rpc/") && message.includes("404")) ||
    (message.includes("function") && message.includes("does not exist")) ||
    message.includes("schema cache")
  ) {
    return {
      kind: "missing_function",
      reason: "rpc_missing_or_incompatible",
    };
  }

  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return {
      kind: "permission",
      reason: "permission_denied",
    };
  }

  if (
    code === "pgrst301" ||
    message.includes("jwt") ||
    message.includes("not authorized") ||
    message.includes("unauthorized") ||
    message.includes("invalid token") ||
    message.includes("auth")
  ) {
    return {
      kind: "auth",
      reason: "auth_error",
    };
  }

  if (
    code.startsWith("22") ||
    code.startsWith("23") ||
    message.includes("violates") ||
    message.includes("invalid input") ||
    message.includes("null value") ||
    message.includes("must not") ||
    message.includes("validation")
  ) {
    return {
      kind: "validation",
      reason: "validation_or_invariant_error",
    };
  }

  if (
    code.startsWith("08") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection")
  ) {
    return {
      kind: "transient",
      reason: "transient_transport_error",
    };
  }

  return {
    kind: "unknown",
    reason: "semantic_or_unknown_error",
  };
};

const isSchemaError = (message: string, code: string) =>
  code === "pgrst204" ||
  code === "pgrst302" ||
  message.includes("contract mismatch") ||
  message.includes("schema cache") ||
  message.includes("column") && message.includes("does not exist") ||
  message.includes("relation") && message.includes("does not exist") ||
  message.includes("payload") && message.includes("invalid") ||
  message.includes("payload") && message.includes("missing") ||
  message.includes("must be") ||
  message.includes("does not exist");

const isPermissionOrAuthError = (message: string, code: string) =>
  code === "42501" ||
  code === "pgrst301" ||
  message.includes("permission denied") ||
  message.includes("row-level security") ||
  message.includes("forbidden") ||
  message.includes("unauthorized") ||
  message.includes("not authorized") ||
  message.includes("invalid token") ||
  message.includes("jwt") ||
  message.includes("auth");

const isTransientError = (message: string, code: string) =>
  code.startsWith("08") ||
  message.includes("network") ||
  message.includes("failed to fetch") ||
  message.includes("fetch failed") ||
  message.includes("timeout") ||
  message.includes("timed out") ||
  message.includes("connection") ||
  message.includes("offline");

export function getWarehouseReqHeadsRetryAfterMs(
  failureClass: WarehouseReqHeadsFailureClass | null | undefined,
): number {
  switch (failureClass) {
    case "schema_incompatibility":
      return SCHEMA_RETRY_AFTER_MS;
    case "permission_auth_failure":
      return PERMISSION_RETRY_AFTER_MS;
    case "transport_transient_failure":
      return TRANSIENT_RETRY_AFTER_MS;
    case "server_failure":
    default:
      return SERVER_RETRY_AFTER_MS;
  }
}

export function classifyWarehouseReqHeadsFailure(error: unknown): WarehouseReqHeadsFailureDecision {
  const message = normalizeText(errorMessage(error));
  const code = errorCode(error);
  const compat = classifyWarehouseReqHeadsCompatError(message, code);

  if (compat.kind === "missing_function" || compat.kind === "validation" || isSchemaError(message, code)) {
    return {
      failureClass: "schema_incompatibility",
      reason: compat.kind === "missing_function" ? compat.reason : "schema_incompatibility",
      retryAfterMs: getWarehouseReqHeadsRetryAfterMs("schema_incompatibility"),
    };
  }

  if (compat.kind === "permission" || compat.kind === "auth" || isPermissionOrAuthError(message, code)) {
    return {
      failureClass: "permission_auth_failure",
      reason: compat.kind === "permission" || compat.kind === "auth" ? compat.reason : "permission_or_auth_failure",
      retryAfterMs: getWarehouseReqHeadsRetryAfterMs("permission_auth_failure"),
    };
  }

  if (compat.kind === "transient" || isTransientError(message, code)) {
    return {
      failureClass: "transport_transient_failure",
      reason: compat.kind === "transient" ? compat.reason : "transport_transient_failure",
      retryAfterMs: getWarehouseReqHeadsRetryAfterMs("transport_transient_failure"),
    };
  }

  return {
    failureClass: "server_failure",
    reason: compat.kind === "unknown" ? "server_failure" : compat.reason,
    retryAfterMs: getWarehouseReqHeadsRetryAfterMs("server_failure"),
  };
}
