import type { BffFlow, BffResponseEnvelope } from "./bffContracts";
import { buildBffError, redactBffText } from "./bffSafety";
import {
  getIdempotencyContract,
  containsSensitiveIdempotencyValue,
  type IdempotencyContract,
  type IdempotentOperationKind,
} from "./idempotency";
import {
  getRateLimitPolicy,
  type RateLimitBucket,
} from "./rateLimits";
import { getRetryPolicy, type RetryClass, type RetryPolicy } from "./retryPolicy";
import type { DeadLetterReason } from "./deadLetter";
import type { BffMutationContext, BffMutationPorts } from "./bffMutationPorts";

export type BffMutationOperation =
  | "proposal.submit"
  | "warehouse.receive.apply"
  | "accountant.payment.apply"
  | "director.approval.apply"
  | "request.item.update";

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
  rateLimitBucket: RateLimitBucket;
  rateLimitPolicy: {
    operation: BffMutationOperation;
    enforcement: "disabled_scaffold";
    failMode: "allow_with_observation";
  } | null;
  retryClass: RetryClass;
  retryPolicy: RetryPolicy;
  deadLetterPolicy: {
    reasonOnExhaustion: DeadLetterReason;
    rawPayloadStored: false;
    piiStored: false;
    attached: true;
  };
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
};

export const BFF_MUTATION_HANDLER_OPERATIONS = Object.freeze(
  Object.keys(MUTATION_HANDLER_DEFINITIONS) as BffMutationOperation[],
);

const MAX_SANITIZE_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 50;

const hasPayload = (input: BffMutationInput): boolean =>
  Object.prototype.hasOwnProperty.call(input, "payload") && input.payload !== null && input.payload !== undefined;

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
  const rateLimitPolicy = getRateLimitPolicy(operation);
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
    rateLimitBucket: definition.rateLimitBucket,
    rateLimitPolicy: rateLimitPolicy
      ? {
          operation: rateLimitPolicy.operation as BffMutationOperation,
          enforcement: "disabled_scaffold",
          failMode: "allow_with_observation",
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
  return executeMutationHandler("request.item.update", input, (args) =>
    ports.requestItemUpdate.updateRequestItem(args),
  );
}
