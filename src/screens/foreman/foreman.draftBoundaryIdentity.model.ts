import type { ReqItemRow } from "../../lib/catalog_api";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

const trim = (value: unknown): string => String(value ?? "").trim();

export const normalizeForemanDraftOwnerId = (value: string | null | undefined): string => trim(value);

export function resolveForemanDraftQueueKey(params: {
  snapshot?: Pick<ForemanLocalDraftSnapshot, "requestId"> | null;
  fallbackRequestId?: string | number | null;
  activeRequestId?: string | number | null;
  localOnlyRequestId: string;
}) {
  const snapshotRequestId = trim(params.snapshot?.requestId);
  const currentRequestId = trim(params.fallbackRequestId ?? params.activeRequestId);
  return snapshotRequestId || currentRequestId || params.localOnlyRequestId;
}

export function resolveForemanDraftQueueKeys(params: {
  snapshot?: Pick<ForemanLocalDraftSnapshot, "requestId"> | null;
  fallbackRequestId?: string | number | null;
  activeRequestId?: string | number | null;
  localOnlyRequestId: string;
}) {
  const snapshotRequestId = trim(params.snapshot?.requestId);
  const currentRequestId = trim(params.fallbackRequestId ?? params.activeRequestId);
  if (snapshotRequestId) return [snapshotRequestId, params.localOnlyRequestId];
  if (currentRequestId) return [currentRequestId, params.localOnlyRequestId];
  return [params.localOnlyRequestId];
}

export function canEditForemanRequestItem(params: {
  row?: Pick<ReqItemRow, "request_id"> | null;
  isDraftActive: boolean;
  activeRequestDetailsId?: string | number | null;
  activeRequestStatusIsDraftLike: boolean;
  requestId?: string | number | null;
  localOnlyRequestId: string;
}) {
  if (!params.row || !params.isDraftActive) return false;
  const activeRequestId = trim(params.activeRequestDetailsId);
  const localRequestId = trim(params.requestId || params.localOnlyRequestId);
  const itemRequestId = trim(params.row.request_id);
  if (activeRequestId && itemRequestId === activeRequestId && params.activeRequestStatusIsDraftLike) {
    return true;
  }
  return itemRequestId === localRequestId || itemRequestId === params.localOnlyRequestId;
}

export type ForemanRemoteDetailsLoadEffectPlan =
  | { action: "skip" }
  | { action: "load"; requestId: string };

export function planForemanRemoteDetailsLoadEffect(params: {
  bootstrapReady: boolean;
  requestId?: string | number | null;
  skipRemoteDraftEffects: boolean;
  skipRemoteHydrationRequestId?: string | null;
}): ForemanRemoteDetailsLoadEffectPlan {
  if (!params.bootstrapReady || !params.requestId || params.skipRemoteDraftEffects) return { action: "skip" };
  const requestId = trim(params.requestId);
  if (!requestId || params.skipRemoteHydrationRequestId === requestId) return { action: "skip" };
  return { action: "load", requestId };
}

export type ForemanItemsLoadEffectPlan =
  | { action: "skip" }
  | { action: "clear_skip_remote_hydration" }
  | { action: "load_items" };

export function planForemanItemsLoadEffect(params: {
  bootstrapReady: boolean;
  requestId?: string | number | null;
  skipRemoteDraftEffects: boolean;
  skipRemoteHydrationRequestId?: string | null;
}): ForemanItemsLoadEffectPlan {
  if (!params.bootstrapReady || params.skipRemoteDraftEffects) return { action: "skip" };
  const requestId = trim(params.requestId);
  if (requestId && params.skipRemoteHydrationRequestId === requestId) {
    return { action: "clear_skip_remote_hydration" };
  }
  return { action: "load_items" };
}
