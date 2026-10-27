import type { ReqItemRow, RequestDetails } from "../../lib/catalog_api";
import {
  type ForemanDraftHeaderState,
  patchForemanRequestDetailsComment,
  patchForemanRequestDetailsLevel,
  patchForemanRequestDetailsName,
  patchForemanRequestDetailsObjectType,
  patchForemanRequestDetailsSystem,
  patchForemanRequestDetailsZone,
} from "./foreman.draftBoundary.helpers";
import { isDraftLikeStatus } from "./foreman.helpers";
import {
  hasForemanLocalDraftContent,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";

const trim = (value: unknown): string => String(value ?? "").trim();

export const normalizeForemanDraftOwnerId = (value: string | null | undefined): string => trim(value);

export type ForemanDraftActivityState = {
  hasLocalDraft: boolean;
  isDraftActive: boolean;
};

export const resolveForemanDraftActivityState = (params: {
  activeLocalDraftSnapshot: ForemanLocalDraftSnapshot | null;
  requestStatus?: string | null;
}): ForemanDraftActivityState => {
  const hasLocalDraft = Boolean(
    params.activeLocalDraftSnapshot &&
      hasForemanLocalDraftContent(params.activeLocalDraftSnapshot),
  );
  return {
    hasLocalDraft,
    isDraftActive: hasLocalDraft || isDraftLikeStatus(params.requestStatus),
  };
};

export const buildForemanDraftHeaderState = (
  header: ForemanDraftHeaderState,
): ForemanDraftHeaderState => ({
  foreman: header.foreman,
  comment: header.comment,
  objectType: header.objectType,
  level: header.level,
  system: header.system,
  zone: header.zone,
});

export type ForemanDraftHeaderEditInput =
  | { field: "foreman"; value: string }
  | { field: "comment"; value: string }
  | { field: "objectType"; code: string; name?: string | null }
  | { field: "level"; code: string; name?: string | null }
  | { field: "system"; code: string; name?: string | null }
  | { field: "zone"; code: string; name?: string | null };

type ForemanDraftHeaderRequestDetailsPatch =
  | { kind: "foreman"; value: string }
  | { kind: "comment"; value: string }
  | { kind: "objectType"; code: string; name?: string | null }
  | { kind: "level"; code: string; name?: string | null }
  | { kind: "system"; code: string; name?: string | null }
  | { kind: "zone"; code: string; name?: string | null };

export type ForemanDraftHeaderEditPlan = {
  headerPatch: Partial<ForemanDraftHeaderState>;
  requestDetailsPatch: ForemanDraftHeaderRequestDetailsPatch;
};

export const resolveForemanDraftHeaderEditPlan = (
  input: ForemanDraftHeaderEditInput,
): ForemanDraftHeaderEditPlan => {
  switch (input.field) {
    case "foreman":
      return {
        headerPatch: { foreman: input.value },
        requestDetailsPatch: { kind: "foreman", value: input.value },
      };
    case "comment":
      return {
        headerPatch: { comment: input.value },
        requestDetailsPatch: { kind: "comment", value: input.value },
      };
    case "objectType":
      return {
        headerPatch: {
          objectType: input.code,
          level: "",
          system: "",
          zone: "",
        },
        requestDetailsPatch: {
          kind: "objectType",
          code: input.code,
          name: input.name,
        },
      };
    case "level":
      return {
        headerPatch: { level: input.code },
        requestDetailsPatch: {
          kind: "level",
          code: input.code,
          name: input.name,
        },
      };
    case "system":
      return {
        headerPatch: { system: input.code },
        requestDetailsPatch: {
          kind: "system",
          code: input.code,
          name: input.name,
        },
      };
    case "zone":
      return {
        headerPatch: { zone: input.code },
        requestDetailsPatch: {
          kind: "zone",
          code: input.code,
          name: input.name,
        },
      };
  }
};

export const applyForemanDraftHeaderEditPlanToRequestDetails = (
  previous: RequestDetails | null,
  plan: ForemanDraftHeaderEditPlan,
): RequestDetails | null => {
  const patch = plan.requestDetailsPatch;
  switch (patch.kind) {
    case "foreman":
      return patchForemanRequestDetailsName(previous, patch.value);
    case "comment":
      return patchForemanRequestDetailsComment(previous, patch.value);
    case "objectType":
      return patchForemanRequestDetailsObjectType(previous, patch.code, patch.name);
    case "level":
      return patchForemanRequestDetailsLevel(previous, patch.code, patch.name);
    case "system":
      return patchForemanRequestDetailsSystem(previous, patch.code, patch.name);
    case "zone":
      return patchForemanRequestDetailsZone(previous, patch.code, patch.name);
  }
};

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
