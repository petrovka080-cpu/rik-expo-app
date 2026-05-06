import type { BffFlow, BffResponseEnvelope } from "./bffContracts";
import { buildBffError, redactBffText } from "./bffSafety";
import {
  getIdempotencyContract,
  containsSensitiveIdempotencyValue,
  type IdempotencyContract,
  type IdempotentOperationKind,
} from "./idempotency";
import {
  getIdempotencyPolicyForBffMutationOperation,
  type IdempotencyPolicyOperation,
} from "./idempotencyPolicies";
import {
  getRateLimitPolicy,
  type RateLimitBucket,
} from "./rateLimits";
import {
  getRateEnforcementPolicyForBffMutationOperation,
  type RateLimitEnforcementOperation,
  type RateLimitPolicyScope,
} from "./rateLimitPolicies";
import {
  BFF_MUTATION_OBSERVABILITY_EVENT_MAP,
  type BffObservabilityMetadata,
} from "./scaleObservabilityEvents";
import { getRetryPolicy, type RetryClass, type RetryPolicy } from "./retryPolicy";
import type { DeadLetterReason } from "./deadLetter";
import type {
  BffMutationContext,
  BffMutationPorts,
  CatalogRequestItemCancelPayload,
  CatalogRequestItemQtyUpdatePayload,
  CatalogRequestMetaNumberKey,
  CatalogRequestMetaPatch,
  CatalogRequestMetaTextKey,
  CatalogRequestMetaUpdatePayload,
} from "./bffMutationPorts";

export type BffMutationOperation =
  | "proposal.submit"
  | "warehouse.receive.apply"
  | "accountant.payment.apply"
  | "director.approval.apply"
  | "request.item.update"
  | "catalog.request.meta.update"
  | "catalog.request.item.cancel";

export type BffMutationInput = {
  idempotencyKey?: unknown;
  payload?: unknown;
  context?: BffMutationContext;
};

export type BffMutationHandlerMetadata = {
  operation: BffMutationOperation;
  bffFlow: BffFlow | null;
  mutation: true;
  writeOperation: true;
  requiresIdempotency: true;
  idempotencyContract: Pick<
    IdempotencyContract,
    "operation" | "scope" | "keySource" | "ttlSeconds" | "storesRawPayload" | "piiAllowedInKey"
  > | null;
  idempotencyPolicyOperation: IdempotencyPolicyOperation | null;
  idempotencyPolicyDefaultEnabled: false;
  idempotencyPersistenceEnabledByDefault: false;
  rateLimitBucket: RateLimitBucket;
  rateLimitPolicy: {
    operation: BffMutationOperation;
    enforcement: "disabled_scaffold";
    failMode: "allow_with_observation";
  } | null;
  rateEnforcementPolicy: {
    operation: RateLimitEnforcementOperation;
    scope: RateLimitPolicyScope;
    windowMs: number;
    maxRequests: number;
    burst: number;
    idempotencyKeyRequiredForMutations: true;
    defaultEnabled: false;
    enforcementEnabledByDefault: false;
  } | null;
  retryClass: RetryClass;
  retryPolicy: RetryPolicy;
  deadLetterPolicy: {
    reasonOnExhaustion: DeadLetterReason;
    rawPayloadStored: false;
    piiStored: false;
    attached: true;
  };
  observability: BffObservabilityMetadata;
  serverOnlyFutureBoundary: true;
  enabledInAppRuntime: false;
  wiredToAppRuntime: false;
  callsSupabaseDirectly: false;
  realMutationExecutedInTests: false;
};

export type BffMutationResponseEnvelope<T> =
  | (Extract<BffResponseEnvelope<T>, { ok: true }> & {
      metadata: BffMutationHandlerMetadata;
    })
  | (Extract<BffResponseEnvelope<T>, { ok: false }> & {
      metadata: BffMutationHandlerMetadata;
    });

type MutationHandlerDefinition = {
  operation: BffMutationOperation;
  bffFlow: BffFlow | null;
  rateLimitBucket: RateLimitBucket;
  retryClass: RetryClass;
  failureCode: string;
  failureMessage: string;
};

const MUTATION_HANDLER_DEFINITIONS: Record<BffMutationOperation, MutationHandlerDefinition> = {
  "proposal.submit": {
    operation: "proposal.submit",
    bffFlow: "proposal.submit",
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_PROPOSAL_SUBMIT_ERROR",
    failureMessage: "Unable to process request",
  },
  "warehouse.receive.apply": {
    operation: "warehouse.receive.apply",
    bffFlow: "warehouse.receive",
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_WAREHOUSE_RECEIVE_APPLY_ERROR",
    failureMessage: "Unable to apply warehouse receive",
  },
  "accountant.payment.apply": {
    operation: "accountant.payment.apply",
    bffFlow: "accountant.payment.apply",
    rateLimitBucket: "external_side_effect",
    retryClass: "external_timeout",
    failureCode: "BFF_ACCOUNTANT_PAYMENT_APPLY_ERROR",
    failureMessage: "Unable to update accountant state",
  },
  "director.approval.apply": {
    operation: "director.approval.apply",
    bffFlow: null,
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_DIRECTOR_APPROVAL_APPLY_ERROR",
    failureMessage: "Unable to apply approval",
  },
  "request.item.update": {
    operation: "request.item.update",
    bffFlow: null,
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_REQUEST_ITEM_UPDATE_ERROR",
    failureMessage: "Unable to update request item",
  },
  "catalog.request.meta.update": {
    operation: "catalog.request.meta.update",
    bffFlow: null,
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_CATALOG_REQUEST_META_UPDATE_ERROR",
    failureMessage: "Unable to update catalog request metadata",
  },
  "catalog.request.item.cancel": {
    operation: "catalog.request.item.cancel",
    bffFlow: null,
    rateLimitBucket: "write_sensitive",
    retryClass: "server_error",
    failureCode: "BFF_CATALOG_REQUEST_ITEM_CANCEL_ERROR",
    failureMessage: "Unable to cancel catalog request item",
  },
};

export const BFF_MUTATION_HANDLER_OPERATIONS = Object.freeze(
  Object.keys(MUTATION_HANDLER_DEFINITIONS) as BffMutationOperation[],
);

const MAX_SANITIZE_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 50;

const hasPayload = (input: BffMutationInput): boolean =>
  Object.prototype.hasOwnProperty.call(input, "payload") && input.payload !== null && input.payload !== undefined;

const CATALOG_REQUEST_META_TEXT_KEYS = Object.freeze([
  "need_by",
  "comment",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "foreman_name",
  "contractor_job_id",
  "subcontract_id",
  "contractor_org",
  "subcontractor_org",
  "contractor_phone",
  "subcontractor_phone",
  "object_name",
  "level_name",
  "system_name",
  "zone_name",
] as const satisfies readonly CatalogRequestMetaTextKey[]);

const CATALOG_REQUEST_META_NUMBER_KEYS = Object.freeze([
  "planned_volume",
  "qty_plan",
  "volume",
] as const satisfies readonly CatalogRequestMetaNumberKey[]);

const CATALOG_REQUEST_META_ALLOWED_KEYS = new Set<string>([
  ...CATALOG_REQUEST_META_TEXT_KEYS,
  ...CATALOG_REQUEST_META_NUMBER_KEYS,
]);

export const CATALOG_REQUEST_MUTATION_CONTRACT = Object.freeze({
  updateRequestMeta: {
    operation: "catalog.request.meta.update",
    allowedPatchKeys: [...CATALOG_REQUEST_META_ALLOWED_KEYS].sort(),
  },
  requestItemUpdateQty: {
    operation: "request.item.update",
    payloadKind: "catalog.request.item.qty.update",
  },
  requestItemCancel: {
    operation: "catalog.request.item.cancel",
    payloadKind: "catalog.request.item.cancel",
  },
  mutationRoutesGloballyEnabledByDefault: false,
  rawPayloadLoggingAllowed: false,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeCatalogId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 160) return null;
  return trimmed;
};

const isSafeCatalogMutationContext = (context: BffMutationContext | undefined): boolean =>
  context?.idempotencyKeyStatus === "present_redacted" &&
  context.companyScope === "present_redacted" &&
  context.requestScope === "present_redacted";

const normalizeCatalogMetaPatch = (value: unknown): CatalogRequestMetaPatch | null => {
  if (!isRecord(value)) return null;

  const patch: CatalogRequestMetaPatch = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!CATALOG_REQUEST_META_ALLOWED_KEYS.has(key)) return null;

    if ((CATALOG_REQUEST_META_TEXT_KEYS as readonly string[]).includes(key)) {
      if (entry !== null && typeof entry !== "string") return null;
      if (typeof entry === "string" && entry.length > 2_000) return null;
      (patch as Record<string, string | null>)[key] = entry;
      continue;
    }

    if (entry !== null && (typeof entry !== "number" || !Number.isFinite(entry))) return null;
    (patch as Record<string, number | null>)[key] = entry;
  }

  return Object.keys(patch).length > 0 ? patch : null;
};

export function validateCatalogRequestMetaUpdatePayload(
  value: unknown,
): CatalogRequestMetaUpdatePayload | null {
  if (!isRecord(value) || value.kind !== "catalog.request.meta.update") return null;
  const requestId = normalizeCatalogId(value.requestId);
  const patch = normalizeCatalogMetaPatch(value.patch);
  if (!requestId || !patch) return null;
  return {
    kind: "catalog.request.meta.update",
    requestId,
    patch,
  };
}

export function validateCatalogRequestItemQtyUpdatePayload(
  value: unknown,
): CatalogRequestItemQtyUpdatePayload | null {
  if (!isRecord(value) || value.kind !== "catalog.request.item.qty.update") return null;
  const requestItemId = normalizeCatalogId(value.requestItemId);
  const qty = Number(value.qty);
  const requestIdHint =
    value.requestIdHint == null ? null : normalizeCatalogId(value.requestIdHint);
  if (!requestItemId || !Number.isFinite(qty) || qty <= 0) return null;
  if (value.requestIdHint != null && !requestIdHint) return null;
  return {
    kind: "catalog.request.item.qty.update",
    requestItemId,
    qty,
    requestIdHint,
  };
}

export function validateCatalogRequestItemCancelPayload(
  value: unknown,
): CatalogRequestItemCancelPayload | null {
  if (!isRecord(value) || value.kind !== "catalog.request.item.cancel") return null;
  const requestItemId = normalizeCatalogId(value.requestItemId);
  if (!requestItemId) return null;
  return {
    kind: "catalog.request.item.cancel",
    requestItemId,
  };
}

export function normalizeBffMutationIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (containsSensitiveIdempotencyValue(trimmed)) return null;
  return trimmed.slice(0, 160);
}

export function sanitizeBffMutationOutput(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return redactBffText(value).slice(0, 240);
  if (depth >= MAX_SANITIZE_DEPTH) return "[redacted]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => sanitizeBffMutationOutput(entry, depth + 1));
  }
  if (typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 80);
      if (!safeKey) continue;
      safe[safeKey] = sanitizeBffMutationOutput(entry, depth + 1);
    }
    return safe;
  }
  return null;
}

export function getBffMutationHandlerMetadata(operation: BffMutationOperation): BffMutationHandlerMetadata {
  const definition = MUTATION_HANDLER_DEFINITIONS[operation];
  const idempotencyContract = getIdempotencyContract(operation as IdempotentOperationKind);
  const idempotencyPolicy = getIdempotencyPolicyForBffMutationOperation(operation);
  const rateLimitPolicy = getRateLimitPolicy(operation);
  const rateEnforcementPolicy = getRateEnforcementPolicyForBffMutationOperation(operation);
  const retryPolicy = getRetryPolicy(definition.retryClass);

  return {
    operation,
    bffFlow: definition.bffFlow,
    mutation: true,
    writeOperation: true,
    requiresIdempotency: true,
    idempotencyContract: idempotencyContract
      ? {
          operation: idempotencyContract.operation,
          scope: idempotencyContract.scope,
          keySource: idempotencyContract.keySource,
          ttlSeconds: idempotencyContract.ttlSeconds,
          storesRawPayload: idempotencyContract.storesRawPayload,
          piiAllowedInKey: idempotencyContract.piiAllowedInKey,
        }
      : null,
    idempotencyPolicyOperation: idempotencyPolicy?.operation ?? null,
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitBucket: definition.rateLimitBucket,
    rateLimitPolicy: rateLimitPolicy
      ? {
          operation: rateLimitPolicy.operation as BffMutationOperation,
          enforcement: "disabled_scaffold",
          failMode: "allow_with_observation",
        }
      : null,
    rateEnforcementPolicy: rateEnforcementPolicy
      ? {
          operation: rateEnforcementPolicy.operation,
          scope: rateEnforcementPolicy.scope,
          windowMs: rateEnforcementPolicy.windowMs,
          maxRequests: rateEnforcementPolicy.maxRequests,
          burst: rateEnforcementPolicy.burst,
          idempotencyKeyRequiredForMutations: true,
          defaultEnabled: rateEnforcementPolicy.defaultEnabled,
          enforcementEnabledByDefault: rateEnforcementPolicy.enforcementEnabledByDefault,
        }
      : null,
    retryClass: definition.retryClass,
    retryPolicy,
    deadLetterPolicy: {
      reasonOnExhaustion: "retry_exhausted",
      rawPayloadStored: false,
      piiStored: false,
      attached: true,
    },
    observability: BFF_MUTATION_OBSERVABILITY_EVENT_MAP[operation],
    serverOnlyFutureBoundary: true,
    enabledInAppRuntime: false,
    wiredToAppRuntime: false,
    callsSupabaseDirectly: false,
    realMutationExecutedInTests: false,
  };
}

const buildSuccess = <T>(
  operation: BffMutationOperation,
  data: T,
): BffMutationResponseEnvelope<T> => ({
  ok: true,
  data,
  metadata: getBffMutationHandlerMetadata(operation),
});

const buildFailure = <T>(
  operation: BffMutationOperation,
  code: string,
  message: string,
): BffMutationResponseEnvelope<T> => ({
  ok: false,
  error: buildBffError(code, message),
  metadata: getBffMutationHandlerMetadata(operation),
});

const executeMutationHandler = async (
  operation: BffMutationOperation,
  input: BffMutationInput,
  mutate: (args: {
    idempotencyKey: string;
    payload: unknown;
    context?: BffMutationContext;
  }) => Promise<unknown>,
): Promise<BffMutationResponseEnvelope<unknown>> => {
  const idempotencyKey = normalizeBffMutationIdempotencyKey(input.idempotencyKey);
  if (!idempotencyKey) {
    return buildFailure(operation, "IDEMPOTENCY_KEY_REQUIRED", "Request cannot be processed safely");
  }
  if (!hasPayload(input)) {
    return buildFailure(operation, "BFF_MUTATION_PAYLOAD_REQUIRED", "Request cannot be processed safely");
  }

  try {
    const data = await mutate({
      idempotencyKey,
      payload: input.payload,
      context: input.context,
    });
    return buildSuccess(operation, sanitizeBffMutationOutput(data));
  } catch {
    const definition = MUTATION_HANDLER_DEFINITIONS[operation];
    return buildFailure(operation, definition.failureCode, definition.failureMessage);
  }
};

const executeCatalogMutationHandler = async <TPayload>(
  operation: BffMutationOperation,
  input: BffMutationInput,
  validatePayload: (value: unknown) => TPayload | null,
  mutate: (args: {
    idempotencyKey: string;
    payload: TPayload;
    context?: BffMutationContext;
  }) => Promise<unknown>,
): Promise<BffMutationResponseEnvelope<unknown>> => {
  const idempotencyKey = normalizeBffMutationIdempotencyKey(input.idempotencyKey);
  if (!idempotencyKey) {
    return buildFailure(operation, "IDEMPOTENCY_KEY_REQUIRED", "Request cannot be processed safely");
  }
  if (!hasPayload(input)) {
    return buildFailure(operation, "BFF_MUTATION_PAYLOAD_REQUIRED", "Request cannot be processed safely");
  }
  if (!isSafeCatalogMutationContext(input.context)) {
    return buildFailure(operation, "BFF_MUTATION_CONTEXT_REQUIRED", "Request cannot be processed safely");
  }

  const payload = validatePayload(input.payload);
  if (!payload) {
    return buildFailure(operation, "BFF_CATALOG_REQUEST_MUTATION_PAYLOAD_INVALID", "Request cannot be processed safely");
  }

  try {
    const data = await mutate({
      idempotencyKey,
      payload,
      context: input.context,
    });
    return buildSuccess(operation, sanitizeBffMutationOutput(data));
  } catch {
    const definition = MUTATION_HANDLER_DEFINITIONS[operation];
    return buildFailure(operation, definition.failureCode, definition.failureMessage);
  }
};

export async function handleProposalSubmit(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeMutationHandler("proposal.submit", input, (args) =>
    ports.proposalSubmit.submitProposal(args),
  );
}

export async function handleWarehouseReceiveApply(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeMutationHandler("warehouse.receive.apply", input, (args) =>
    ports.warehouseReceive.applyReceive(args),
  );
}

export async function handleAccountantPaymentApply(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeMutationHandler("accountant.payment.apply", input, (args) =>
    ports.accountantPayment.applyPayment(args),
  );
}

export async function handleDirectorApprovalApply(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeMutationHandler("director.approval.apply", input, (args) =>
    ports.directorApproval.approve(args),
  );
}

export async function handleRequestItemUpdate(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeCatalogMutationHandler("request.item.update", input, validateCatalogRequestItemQtyUpdatePayload, (args) =>
    ports.requestItemUpdate.updateRequestItem(args),
  );
}

export async function handleCatalogRequestMetaUpdate(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeCatalogMutationHandler(
    "catalog.request.meta.update",
    input,
    validateCatalogRequestMetaUpdatePayload,
    (args) => ports.catalogRequest.updateRequestMeta(args),
  );
}

export async function handleCatalogRequestItemCancel(
  ports: BffMutationPorts,
  input: BffMutationInput = {},
): Promise<BffMutationResponseEnvelope<unknown>> {
  return executeCatalogMutationHandler(
    "catalog.request.item.cancel",
    input,
    validateCatalogRequestItemCancelPayload,
    (args) => ports.catalogRequest.cancelRequestItem(args),
  );
}
