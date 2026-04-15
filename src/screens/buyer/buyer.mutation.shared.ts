import { recordPlatformObservability } from "../../lib/observability/platformObservability";

export type AlertFn = (title: string, message: string) => void;
export type FileLike = File | Blob | {
  name?: string | null;
  uri?: string | null;
  fileCopyUri?: string | null;
  mimeType?: string | null;
  type?: string | null;
  size?: number | null;
};
export type LogFn = (...args: unknown[]) => void;
export type MaybeId = { id?: string | number | null };

export type BuyerMutationFamily =
  | "submit"
  | "attachments"
  | "status"
  | "rfq"
  | "rework";

export type BuyerMutationWarning<Stage extends string> = {
  stage: Stage;
  message: string;
  degraded: boolean;
};

export type BuyerMutationSuccessResult<Stage extends string, Data = undefined> = {
  ok: true;
  family: BuyerMutationFamily;
  operation: string;
  status: "success" | "partial_success";
  completedStages: Stage[];
  warnings: BuyerMutationWarning<Stage>[];
  data?: Data;
};

export type BuyerMutationFailureResult<Stage extends string> = {
  ok: false;
  family: BuyerMutationFamily;
  operation: string;
  status: "failed";
  failedStage: Stage;
  completedStages: Stage[];
  warnings: BuyerMutationWarning<Stage>[];
  message: string;
  error: Error;
};

export type BuyerMutationResult<Stage extends string, Data = undefined> =
  | BuyerMutationSuccessResult<Stage, Data>
  | BuyerMutationFailureResult<Stage>;

export const isBuyerMutationFailure = <Stage extends string, Data>(
  result: BuyerMutationResult<Stage, Data>,
): result is BuyerMutationFailureResult<Stage> => result.ok === false;

export const isBuyerMutationSuccess = <Stage extends string, Data>(
  result: BuyerMutationResult<Stage, Data>,
): result is BuyerMutationSuccessResult<Stage, Data> => result.ok === true;

export class BuyerMutationStageError<Stage extends string = string> extends Error {
  readonly family: BuyerMutationFamily;
  readonly operation: string;
  readonly stage: Stage;
  readonly causeError: unknown;

  constructor(params: {
    family: BuyerMutationFamily;
    operation: string;
    stage: Stage;
    message: string;
    causeError: unknown;
  }) {
    super(params.message);
    this.name = "BuyerMutationStageError";
    this.family = params.family;
    this.operation = params.operation;
    this.stage = params.stage;
    this.causeError = params.causeError;
  }
}

type BuyerMutationTrackerParams = {
  family: BuyerMutationFamily;
  operation: string;
  entityId?: string | null;
  requestId?: string | null;
  proposalId?: string | null;
};

const isDevRuntime = () =>
  typeof globalThis !== "undefined" && (globalThis as { __DEV__?: unknown }).__DEV__ === true;

const toText = (value: unknown) => String(value ?? "").trim();

export const logBuyerActionDebug = (level: "info" | "warn", ...args: unknown[]) => {
  if (!isDevRuntime()) return;
  // eslint-disable-next-line no-console
  console[level](...args);
};

export const errMessage = (error: unknown, fallback = "Unknown error"): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = toText(record[key]);
      if (value) return value;
    }
  }

  return fallback;
};

export const normalizeRuntimeError = (error: unknown, fallback: string): Error =>
  new Error(errMessage(error, fallback));

export const toPriceString = (value: number | string | null | undefined): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const bytesToUuid = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

export const makeClientRequestId = (): string | null => {
  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
            getRandomValues?: (array: Uint8Array) => Uint8Array;
          };
        }).crypto
      : undefined;

  if (typeof cryptoLike?.randomUUID === "function") {
    return cryptoLike.randomUUID();
  }

  if (typeof cryptoLike?.getRandomValues === "function") {
    const bytes = cryptoLike.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
  }

  return null;
};

const stageEventExtra = (
  params: BuyerMutationTrackerParams,
  stage: string,
  lifecycle: "stage_started" | "stage_completed" | "stage_failed" | "stage_warning" | "operation_completed" | "operation_failed",
  extra?: Record<string, unknown>,
) => ({
  family: params.family,
  operation: params.operation,
  stage,
  lifecycle,
  entityId: params.entityId ?? null,
  requestId: params.requestId ?? null,
  proposalId: params.proposalId ?? null,
  ...(extra ?? {}),
});

export const formatBuyerMutationFailure = <Stage extends string>(
  result: BuyerMutationFailureResult<Stage>,
  labels: Record<Stage, string>,
  fallbackTitle: string,
) => {
  const stageLabel = labels[result.failedStage] ?? String(result.failedStage);
  const message = result.message || fallbackTitle;
  return `${stageLabel}: ${message}`;
};

export const formatBuyerMutationWarnings = <Stage extends string>(
  warnings: BuyerMutationWarning<Stage>[],
  labels: Record<Stage, string>,
) =>
  warnings
    .map((warning) => {
      const label = labels[warning.stage] ?? String(warning.stage);
      return `${label}: ${warning.message}`;
    })
    .join(" ");

export const createBuyerMutationTracker = <Stage extends string>(
  params: BuyerMutationTrackerParams,
) => {
  const completedStages: Stage[] = [];
  const warnings: BuyerMutationWarning<Stage>[] = [];
  const sourceKind = `mutation:${params.family}:${params.operation}`;

  const markStarted = (stage: Stage, extra?: Record<string, unknown>) => {
    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "stage_started",
      result: "success",
      sourceKind,
      extra: stageEventExtra(params, stage, "stage_started", extra),
    });
  };

  const markCompleted = (stage: Stage, extra?: Record<string, unknown>) => {
    if (!completedStages.includes(stage)) completedStages.push(stage);
    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "stage_completed",
      result: "success",
      sourceKind,
      extra: stageEventExtra(params, stage, "stage_completed", extra),
    });
  };

  const warn = (stage: Stage, error: unknown, extra?: Record<string, unknown>) => {
    const warning: BuyerMutationWarning<Stage> = {
      stage,
      message: errMessage(error),
      degraded: true,
    };
    warnings.push(warning);
    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "stage_warning",
      result: "error",
      sourceKind,
      fallbackUsed: true,
      errorStage: String(stage),
      errorClass: error instanceof Error ? error.name : "BuyerMutationWarning",
      errorMessage: warning.message,
      extra: stageEventExtra(params, stage, "stage_warning", extra),
    });
    return warning;
  };

  const asFailure = (stage: Stage, error: unknown, fallback: string): BuyerMutationFailureResult<Stage> => {
    const normalized =
      error instanceof BuyerMutationStageError
        ? error
        : new BuyerMutationStageError({
            family: params.family,
            operation: params.operation,
            stage,
            message: errMessage(error, fallback),
            causeError: error,
          });

    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "stage_failed",
      result: "error",
      sourceKind,
      errorStage: String(stage),
      errorClass: normalized.name,
      errorMessage: normalized.message,
      extra: stageEventExtra(params, stage, "stage_failed"),
    });
    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "operation_failed",
      result: "error",
      sourceKind,
      errorStage: String(stage),
      errorClass: normalized.name,
      errorMessage: normalized.message,
      extra: stageEventExtra(params, stage, "operation_failed"),
    });

    return {
      ok: false,
      family: params.family,
      operation: params.operation,
      status: "failed",
      failedStage: stage,
      completedStages: [...completedStages],
      warnings: [...warnings],
      message: normalized.message,
      error: normalized,
    };
  };

  const success = <Data,>(data?: Data, extra?: Record<string, unknown>): BuyerMutationSuccessResult<Stage, Data> => {
    const status = warnings.length ? "partial_success" : "success";
    recordPlatformObservability({
      screen: "buyer",
      surface: `buyer_${params.family}_mutation`,
      category: "ui",
      event: "operation_completed",
      result: "success",
      sourceKind,
      fallbackUsed: warnings.length > 0,
      extra: stageEventExtra(params, completedStages[completedStages.length - 1] ?? "completed", "operation_completed", {
        status,
        completedStages: [...completedStages],
        warningCount: warnings.length,
        ...(extra ?? {}),
      }),
    });

    return {
      ok: true,
      family: params.family,
      operation: params.operation,
      status,
      completedStages: [...completedStages],
      warnings: [...warnings],
      data,
    };
  };

  return {
    sourceKind,
    completedStages,
    warnings,
    markStarted,
    markCompleted,
    warn,
    asFailure,
    success,
  };
};

export const reportBuyerWriteFailure = (
  alert: AlertFn | undefined,
  title: string,
  error: unknown,
  log?: (...args: unknown[]) => void,
) => {
  const message = errMessage(error, "Не удалось сохранить изменения.");
  recordPlatformObservability({
    screen: "buyer",
    surface: "buyer_actions",
    category: "ui",
    event: "operation_failed",
    result: "error",
    errorClass: error instanceof Error ? error.name : "BuyerActionError",
    errorMessage: message,
    extra: {
      module: "buyer",
      action: title,
      owner: "buyer_actions",
      severity: "error",
    },
  });
  (log ?? console.warn)(`[buyer.write] ${title}: ${message}`);
  alert?.(title, message);
};

export const logBuyerSecondaryPhaseWarning = (scope: string, error: unknown) => {
  recordPlatformObservability({
    screen: "buyer",
    surface: "buyer_actions",
    category: "ui",
    event: "secondary_phase_failed",
    result: "error",
    errorClass: error instanceof Error ? error.name : "BuyerSecondaryError",
    errorMessage: errMessage(error),
    extra: {
      module: "buyer",
      action: scope,
      owner: "buyer_actions",
      fallbackUsed: true,
      severity: "warning",
    },
  });
  if (!isDevRuntime()) return;
  if (__DEV__) console.warn(`[buyer.secondary] ${scope}: ${errMessage(error)}`);
};
