import { recordPlatformObservability } from "../observability/platformObservability";
import { normalizeAppError, type AppError } from "../errors/appError";

type RpcTransport = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{
    data: unknown;
    error: unknown;
  }>;
};

export type RpcBoundaryResult<TData> = {
  data: TData | null;
  error: NullableRpcErrorLike;
  appError: AppError | null;
};

export type RpcBoundaryContext = {
  screen: "buyer" | "contractor";
  surface: string;
  owner: string;
  sourceKind: string;
};

export type RpcErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} & Error;

export type NullableRpcErrorLike = RpcErrorLike | null;

export class RpcTransportBoundaryError extends Error {
  code: string | null;

  constructor(message: string, code = "rpc_transport_invalid") {
    super(message);
    this.name = "RpcTransportBoundaryError";
    this.code = code;
  }
}

export type RpcValidationContext = {
  rpcName: string;
  caller: string;
  domain:
    | "warehouse"
    | "accountant"
    | "contractor"
    | "director"
    | "buyer"
    | "proposal"
    | "catalog"
    | "unknown";
};

export type RpcResponseValidator<T> = (value: unknown) => value is T;

export class RpcValidationError extends Error {
  readonly name = "RpcValidationError";
  readonly rpcName: string;
  readonly caller: string;
  readonly domain: string;

  constructor(context: RpcValidationContext) {
    super(`Invalid RPC response shape for ${context.rpcName} at ${context.caller}`);
    this.rpcName = context.rpcName;
    this.caller = context.caller;
    this.domain = context.domain;
  }
}

export function validateRpcResponse<T>(
  value: unknown,
  validator: RpcResponseValidator<T>,
  context: RpcValidationContext,
): T {
  if (validator(value)) return value;
  throw new RpcValidationError(context);
}

export const isRpcRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isRpcString = (value: unknown): value is string =>
  typeof value === "string";

export const isRpcNonEmptyString = (value: unknown): value is string =>
  isRpcString(value) && value.trim().length > 0;

export const isRpcBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export const isRpcOptionalBoolean = (
  value: unknown,
): value is boolean | null | undefined => value == null || isRpcBoolean(value);

export const isRpcNumberLike = (value: unknown): value is number | string =>
  (typeof value === "number" || typeof value === "string") &&
  Number.isFinite(Number(value));

export const isRpcOptionalString = (
  value: unknown,
): value is string | null | undefined => value == null || isRpcString(value);

export const isRpcVoidResponse = (value: unknown): value is null | undefined =>
  value == null;

export const isRpcNonEmptyStringResponse = (value: unknown): value is string =>
  isRpcNonEmptyString(value);

export const isWarehouseIssueAtomicResponse = (value: unknown): value is unknown => {
  if (isRpcNumberLike(value)) return true;
  if (!isRpcRecord(value)) return false;

  const hasConfirmation =
    isRpcNumberLike(value.issue_id) ||
    isRpcNumberLike(value.issued_count) ||
    isRpcNumberLike(value.rows_affected) ||
    isRpcNonEmptyString(value.issue_id) ||
    isRpcNonEmptyString(value.id) ||
    isRpcNonEmptyString(value.client_mutation_id) ||
    isRpcBoolean(value.ok) ||
    isRpcNumberLike(value.ok);

  return (
    hasConfirmation &&
    isRpcOptionalString(value.client_mutation_id) &&
    isRpcOptionalBoolean(value.idempotent_replay)
  );
};

export const isDirectorApproveRequestResponse = (
  value: unknown,
): value is null | Record<string, unknown> => {
  if (value == null) return true;
  if (!isRpcRecord(value) || !isRpcBoolean(value.ok)) return false;

  if (value.ok === false) {
    return (
      isRpcOptionalString(value.failure_code) &&
      (isRpcNonEmptyString(value.failure_message) ||
        isRpcNonEmptyString(value.message))
    );
  }

  return (
    isRpcOptionalString(value.request_id) &&
    isRpcOptionalString(value.client_mutation_id) &&
    isRpcOptionalBoolean(value.idempotent_replay)
  );
};

export const isRequestItemUpdateQtyResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isRpcRecord(value) &&
  isRpcNonEmptyString(value.id) &&
  isRpcNonEmptyString(value.request_id) &&
  isRpcNumberLike(value.qty) &&
  isRpcNonEmptyString(value.name_human) &&
  isRpcOptionalString(value.status) &&
  isRpcOptionalString(value.note);

const isRpcRecordArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every(isRpcRecord);

export const isAccountantFinancialStateResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isRpcRecord(value)) return false;
  const proposal = value.proposal;
  const invoice = value.invoice;
  const totals = value.totals;
  const eligibility = value.eligibility;
  const allocationSummary = value.allocation_summary ?? value.allocationSummary;

  return (
    isRpcRecord(proposal) &&
    isRpcNonEmptyString(proposal.proposal_id ?? proposal.proposalId) &&
    isRpcRecord(invoice) &&
    isRpcRecord(totals) &&
    isRpcNumberLike(totals.payable_amount ?? totals.payableAmount) &&
    isRpcNumberLike(totals.total_paid ?? totals.totalPaid) &&
    isRpcNumberLike(totals.outstanding_amount ?? totals.outstandingAmount) &&
    isRpcRecord(eligibility) &&
    isRpcBoolean(eligibility.approved) &&
    isRpcBoolean(eligibility.sent_to_accountant ?? eligibility.sentToAccountant) &&
    isRpcBoolean(eligibility.payment_eligible ?? eligibility.paymentEligible) &&
    isRpcRecord(allocationSummary) &&
    isRpcRecordArray(value.items) &&
    isRpcRecord(value.meta)
  );
};

const asRpcErrorLike = (value: unknown): NullableRpcErrorLike => {
  if (!value) return null;
  if (value instanceof Error) {
    return value as RpcErrorLike;
  }
  if (typeof value !== "object") {
    return new Error(String(value ?? "rpc_error")) as RpcErrorLike;
  }

  const error = value as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };
  const wrapped = new Error(
    typeof error.message === "string" && error.message.trim()
      ? error.message
      : "rpc_error",
  ) as RpcErrorLike;
  wrapped.details = typeof error.details === "string" ? error.details : null;
  wrapped.hint = typeof error.hint === "string" ? error.hint : null;
  wrapped.code = typeof error.code === "string" ? error.code : null;
  return wrapped;
};

const asRpcTransport = (client: unknown): RpcTransport | null => {
  if (!client || typeof client !== "object") return null;
  const maybeRpc = (client as { rpc?: unknown }).rpc;
  if (typeof maybeRpc !== "function") return null;
  return client as RpcTransport;
};

const recordBoundaryFailure = (
  context: RpcBoundaryContext | undefined,
  fn: string,
  error: RpcErrorLike,
  errorStage: "rpc_transport_guard" | "rpc_transport_call",
) => {
  if (!context) return;
  const appError = normalizeAppError(error, `rpc:${fn}:${errorStage}`, "fatal");
  recordPlatformObservability({
    screen: context.screen,
    surface: context.surface,
    category: "fetch",
    event: "rpc_transport_boundary_fail",
    result: "error",
    sourceKind: context.sourceKind,
    errorStage,
    errorClass: appError.code,
    errorMessage: appError.message,
    extra: {
      owner: context.owner,
      rpcName: fn,
      appErrorCode: appError.code,
      appErrorContext: appError.context,
      appErrorSeverity: appError.severity,
    },
  });
};

// Allowed suppression zone: generated Supabase RPC typings lag behind deployed RPC names.
// Keep the cast containment here instead of spreading `as never` across feature code.
export async function runContainedRpc<TData>(
  client: unknown,
  fn: string,
  args?: Record<string, unknown>,
  context?: RpcBoundaryContext,
): Promise<RpcBoundaryResult<TData>> {
  const transport = asRpcTransport(client);
  if (!transport) {
    const error = new RpcTransportBoundaryError(
      `RPC transport owner is unavailable for ${fn}`,
    ) as RpcErrorLike;
    recordBoundaryFailure(context, fn, error, "rpc_transport_guard");
    return {
      data: null,
      error,
      appError: normalizeAppError(error, `rpc:${fn}:transport_guard`, "fatal"),
    };
  }

  try {
    const result =
      args == null ? await transport.rpc(fn) : await transport.rpc(fn, args);
    return {
      data: (result.data ?? null) as TData | null,
      error: asRpcErrorLike(result.error),
      appError: result.error
        ? normalizeAppError(result.error, `rpc:${fn}:result_error`, "fatal")
        : null,
    };
  } catch (error) {
    const normalizedError =
      asRpcErrorLike(error) ??
      (new RpcTransportBoundaryError(
        `RPC invocation failed for ${fn}`,
      ) as RpcErrorLike);
    recordBoundaryFailure(context, fn, normalizedError, "rpc_transport_call");
    return {
      data: null,
      error: normalizedError,
      appError: normalizeAppError(
        normalizedError,
        `rpc:${fn}:transport_call`,
        "fatal",
      ),
    };
  }
}
