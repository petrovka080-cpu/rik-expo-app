import { redactBffText } from "./bffSafety";

export type IdempotentOperationKind =
  | "proposal.submit"
  | "warehouse.receive.apply"
  | "accountant.payment.apply"
  | "accountant.invoice.update"
  | "director.approval.apply"
  | "request.item.update"
  | "catalog.request.meta.update"
  | "catalog.request.item.cancel"
  | "pdf.report.generate"
  | "notification.fanout"
  | "cache.readModel.refresh"
  | "offline.replay.bridge";

export type IdempotencyScope =
  | "user"
  | "company"
  | "request"
  | "proposal"
  | "invoice"
  | "warehouse"
  | "global";

export type IdempotencyKeySource =
  | "client_generated"
  | "server_generated"
  | "derived_from_safe_fingerprint";

export type IdempotencyContract = {
  operation: IdempotentOperationKind;
  scope: IdempotencyScope;
  requiresKey: true;
  keySource: IdempotencyKeySource;
  ttlSeconds: number;
  maxReplayWindowSeconds: number;
  storesRawPayload: false;
  piiAllowedInKey: false;
};

export type SafeIdempotencyFingerprint = {
  version: 1;
  operation: IdempotentOperationKind;
  scope: IdempotencyScope;
  opaqueKey: string;
  containsPii: false;
  containsRawPayload: false;
};

export type IdempotencyBoundaryConfig = {
  enabled: boolean;
  shadowMode?: boolean | null;
};

export const IDEMPOTENCY_DEFAULT_TTL_SECONDS = 86_400;
export const IDEMPOTENCY_MAX_TTL_SECONDS = 604_800;
export const IDEMPOTENCY_MIN_REPLAY_WINDOW_SECONDS = 60;

export const IDEMPOTENT_OPERATION_KINDS: readonly IdempotentOperationKind[] = [
  "proposal.submit",
  "warehouse.receive.apply",
  "accountant.payment.apply",
  "accountant.invoice.update",
  "director.approval.apply",
  "request.item.update",
  "catalog.request.meta.update",
  "catalog.request.item.cancel",
  "pdf.report.generate",
  "notification.fanout",
  "cache.readModel.refresh",
  "offline.replay.bridge",
] as const;

const IDEMPOTENCY_SCOPES: readonly IdempotencyScope[] = [
  "user",
  "company",
  "request",
  "proposal",
  "invoice",
  "warehouse",
  "global",
] as const;

const RAW_ID_OR_PII_HINT_PATTERN =
  /\b(?:user|company|request|proposal|invoice|payment|phone|email|address)[_-]?[a-z0-9-]{4,}\b/i;

export const IDEMPOTENCY_CONTRACTS: readonly IdempotencyContract[] = [
  {
    operation: "proposal.submit",
    scope: "request",
    requiresKey: true,
    keySource: "client_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "warehouse.receive.apply",
    scope: "warehouse",
    requiresKey: true,
    keySource: "derived_from_safe_fingerprint",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "accountant.payment.apply",
    scope: "invoice",
    requiresKey: true,
    keySource: "server_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "accountant.invoice.update",
    scope: "invoice",
    requiresKey: true,
    keySource: "server_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "director.approval.apply",
    scope: "proposal",
    requiresKey: true,
    keySource: "server_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "request.item.update",
    scope: "request",
    requiresKey: true,
    keySource: "client_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "catalog.request.meta.update",
    scope: "request",
    requiresKey: true,
    keySource: "client_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "catalog.request.item.cancel",
    scope: "request",
    requiresKey: true,
    keySource: "client_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "pdf.report.generate",
    scope: "global",
    requiresKey: true,
    keySource: "derived_from_safe_fingerprint",
    ttlSeconds: IDEMPOTENCY_MAX_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "notification.fanout",
    scope: "global",
    requiresKey: true,
    keySource: "server_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "cache.readModel.refresh",
    scope: "global",
    requiresKey: true,
    keySource: "derived_from_safe_fingerprint",
    ttlSeconds: 3_600,
    maxReplayWindowSeconds: 3_600,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
  {
    operation: "offline.replay.bridge",
    scope: "user",
    requiresKey: true,
    keySource: "client_generated",
    ttlSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    maxReplayWindowSeconds: IDEMPOTENCY_DEFAULT_TTL_SECONDS,
    storesRawPayload: false,
    piiAllowedInKey: false,
  },
] as const;

export function isIdempotencyBoundaryEnabled(config: IdempotencyBoundaryConfig): boolean {
  return config.enabled === true && config.shadowMode === true;
}

export function isKnownIdempotentOperationKind(value: unknown): value is IdempotentOperationKind {
  return IDEMPOTENT_OPERATION_KINDS.includes(value as IdempotentOperationKind);
}

export function isKnownIdempotencyScope(value: unknown): value is IdempotencyScope {
  return IDEMPOTENCY_SCOPES.includes(value as IdempotencyScope);
}

export function getIdempotencyContract(operation: IdempotentOperationKind): IdempotencyContract | null {
  return IDEMPOTENCY_CONTRACTS.find((contract) => contract.operation === operation) ?? null;
}

export function validateIdempotencyContract(contract: IdempotencyContract): boolean {
  return (
    isKnownIdempotentOperationKind(contract.operation) &&
    isKnownIdempotencyScope(contract.scope) &&
    contract.requiresKey === true &&
    contract.storesRawPayload === false &&
    contract.piiAllowedInKey === false &&
    Number.isFinite(contract.ttlSeconds) &&
    contract.ttlSeconds > 0 &&
    contract.ttlSeconds <= IDEMPOTENCY_MAX_TTL_SECONDS &&
    Number.isFinite(contract.maxReplayWindowSeconds) &&
    contract.maxReplayWindowSeconds >= IDEMPOTENCY_MIN_REPLAY_WINDOW_SECONDS &&
    contract.maxReplayWindowSeconds <= contract.ttlSeconds
  );
}

export function containsSensitiveIdempotencyValue(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed !== redactBffText(trimmed)) return true;
  return RAW_ID_OR_PII_HINT_PATTERN.test(trimmed);
}

export function buildSafeIdempotencyFingerprint(input: {
  operation: IdempotentOperationKind;
  scope: IdempotencyScope;
  opaqueKey: unknown;
}): SafeIdempotencyFingerprint {
  if (!isKnownIdempotentOperationKind(input.operation)) {
    throw new Error("Unknown idempotent operation");
  }
  if (!isKnownIdempotencyScope(input.scope)) {
    throw new Error("Unknown idempotency scope");
  }
  if (containsSensitiveIdempotencyValue(input.opaqueKey)) {
    throw new Error("Unsafe idempotency fingerprint");
  }

  return {
    version: 1,
    operation: input.operation,
    scope: input.scope,
    opaqueKey: String(input.opaqueKey).trim(),
    containsPii: false,
    containsRawPayload: false,
  };
}
