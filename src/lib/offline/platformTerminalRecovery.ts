import type { PlatformOfflineSyncStatus } from "./platformOffline.model";

export type PlatformRecoveryEntityKind =
  | "request"
  | "proposal"
  | "payment"
  | "warehouse_receive"
  | "contractor_progress"
  | "warehouse_entity"
  | "unknown";

export type PlatformTerminalTruth = {
  kind: PlatformRecoveryEntityKind;
  entityId?: string | null;
  status?: string | null;
  present?: boolean | null;
  remainingCount?: number | null;
  terminal?: boolean | null;
  draftLike?: boolean | null;
  recoverable?: boolean | null;
  retryable?: boolean | null;
  terminalWhenMissing?: boolean;
  reason?: string | null;
};

export type PlatformLocalRecoverySignal = {
  hasLocalState?: boolean | null;
  syncStatus?: PlatformOfflineSyncStatus | null;
  pendingCount?: number | null;
  retryCount?: number | null;
  hasSnapshot?: boolean | null;
  hasModalSource?: boolean | null;
};

export type PlatformLocalRecoveryCleanupTarget = {
  kind: PlatformRecoveryEntityKind;
  entityId: string;
};

export type PlatformLocalRecoveryCleanupResult = {
  kind: PlatformRecoveryEntityKind;
  entityId: string;
  cleared: boolean;
  clearedOwners: string[];
};

export type PlatformLocalRecoveryCleanupAdapter = {
  clearLocalRecoveryState: (
    target: PlatformLocalRecoveryCleanupTarget,
  ) => Promise<PlatformLocalRecoveryCleanupResult>;
};

const trim = (value: unknown) => String(value ?? "").trim();

const normalizeStatus = (value: unknown) =>
  trim(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

const TERMINAL_STATUS_BY_KIND: Record<PlatformRecoveryEntityKind, Set<string>> = {
  request: new Set([
    "submitted",
    "approved",
    "closed",
    "finalized",
    "cancelled",
    "canceled",
    "отправлено",
    "одобрено",
    "закрыто",
    "завершено",
    "отменено",
  ]),
  proposal: new Set([
    "submitted",
    "approved",
    "rejected",
    "cancelled",
    "canceled",
    "paid",
    "оплачено",
    "одобрено",
    "отклонено",
    "отменено",
  ]),
  payment: new Set(["paid", "completed", "closed", "void", "оплачено", "закрыто"]),
  warehouse_receive: new Set([
    "done",
    "received",
    "completed",
    "closed",
    "cancelled",
    "canceled",
    "оприходовано",
    "принято",
    "закрыто",
    "завершено",
    "отменено",
  ]),
  contractor_progress: new Set([
    "submitted",
    "finalized",
    "closed",
    "done",
    "completed",
    "cancelled",
    "canceled",
    "отправлено",
    "закрыто",
    "завершено",
    "выполнено",
    "отменено",
  ]),
  warehouse_entity: new Set(["done", "closed", "completed", "cancelled", "canceled"]),
  unknown: new Set(),
};

const DRAFT_LIKE_STATUS_BY_KIND: Record<PlatformRecoveryEntityKind, Set<string>> = {
  request: new Set(["draft", "черновик"]),
  proposal: new Set(["draft", "черновик"]),
  payment: new Set(["draft", "черновик"]),
  warehouse_receive: new Set(["pending", "ready", "partial", "draft", "черновик"]),
  contractor_progress: new Set(["ready", "in_progress", "progress", "work", "в работе", "начат"]),
  warehouse_entity: new Set(["pending", "ready", "draft"]),
  unknown: new Set(),
};

const RECOVERABLE_LOCAL_STATUSES = new Set<PlatformOfflineSyncStatus>([
  "dirty_local",
  "queued",
  "syncing",
  "retry_wait",
  "failed_terminal",
]);

export const isTerminal = (truth: PlatformTerminalTruth | null | undefined): boolean => {
  if (!truth) return false;
  if (truth.terminal != null) return truth.terminal === true;
  if (truth.present === false && truth.terminalWhenMissing === true) return true;
  if (
    truth.kind === "warehouse_receive" &&
    truth.remainingCount != null &&
    Number.isFinite(Number(truth.remainingCount)) &&
    Number(truth.remainingCount) <= 0
  ) {
    return true;
  }
  const status = normalizeStatus(truth.status);
  if (!status) return false;
  return TERMINAL_STATUS_BY_KIND[truth.kind]?.has(status) ?? false;
};

export const isDraftLike = (truth: PlatformTerminalTruth | null | undefined): boolean => {
  if (!truth || isTerminal(truth)) return false;
  if (truth.draftLike != null) return truth.draftLike === true;
  const status = normalizeStatus(truth.status);
  if (!status) return false;
  return DRAFT_LIKE_STATUS_BY_KIND[truth.kind]?.has(status) ?? false;
};

export const hasLocalRecoverySignal = (
  local: PlatformLocalRecoverySignal | null | undefined,
): boolean => {
  if (!local) return false;
  if (local.hasLocalState === true) return true;
  if (local.hasSnapshot === true || local.hasModalSource === true) return true;
  if ((local.pendingCount ?? 0) > 0 || (local.retryCount ?? 0) > 0) return true;
  return local.syncStatus ? RECOVERABLE_LOCAL_STATUSES.has(local.syncStatus) : false;
};

export const isRecoverable = (params: {
  remoteTruth?: PlatformTerminalTruth | null;
  local?: PlatformLocalRecoverySignal | null;
}): boolean => {
  const { remoteTruth, local } = params;
  if (isTerminal(remoteTruth)) return false;
  if (remoteTruth?.recoverable != null) return remoteTruth.recoverable === true;
  return hasLocalRecoverySignal(local);
};

export const shouldRenderRecoveryUI = (params: {
  remoteTruth?: PlatformTerminalTruth | null;
  local?: PlatformLocalRecoverySignal | null;
}): boolean => isRecoverable(params);

export const shouldAllowRetry = (params: {
  remoteTruth?: PlatformTerminalTruth | null;
  local?: PlatformLocalRecoverySignal | null;
}): boolean => {
  const { remoteTruth, local } = params;
  if (isTerminal(remoteTruth)) return false;
  if (remoteTruth?.retryable != null) return remoteTruth.retryable === true;
  if (!hasLocalRecoverySignal(local)) return false;
  return local?.syncStatus === "queued" || local?.syncStatus === "retry_wait";
};

export const shouldClearLocalRecoveryState = (params: {
  remoteTruth?: PlatformTerminalTruth | null;
}): boolean => isTerminal(params.remoteTruth);

export const clearLocalRecoveryState = async (
  adapter: PlatformLocalRecoveryCleanupAdapter,
  target: PlatformLocalRecoveryCleanupTarget,
): Promise<PlatformLocalRecoveryCleanupResult> =>
  await adapter.clearLocalRecoveryState(target);
