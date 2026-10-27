import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  canEditForemanRequestItem,
  normalizeForemanDraftOwnerId,
  planForemanItemsLoadEffect,
  planForemanRemoteDetailsLoadEffect,
  resolveForemanDraftQueueKey,
  resolveForemanDraftQueueKeys,
} from "./foreman.draftBoundaryIdentity.model";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "./foreman.localDraft.constants";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

const snapshot = (requestId: string | null): Pick<ForemanLocalDraftSnapshot, "requestId"> => ({
  requestId: requestId ?? "",
});

describe("foreman draft boundary identity model", () => {
  it("normalizes active owner ids without generating a new owner", () => {
    expect(normalizeForemanDraftOwnerId("  owner-1  ")).toBe("owner-1");
    expect(normalizeForemanDraftOwnerId(null)).toBe("");
    expect(normalizeForemanDraftOwnerId(undefined)).toBe("");
  });

  it("keeps queue key precedence: snapshot, fallback, active request, local-only", () => {
    expect(resolveForemanDraftQueueKey({
      snapshot: snapshot("snap-1"),
      fallbackRequestId: "fallback-1",
      activeRequestId: "active-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe("snap-1");

    expect(resolveForemanDraftQueueKey({
      snapshot: snapshot(""),
      fallbackRequestId: "fallback-1",
      activeRequestId: "active-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe("fallback-1");

    expect(resolveForemanDraftQueueKey({
      snapshot: null,
      fallbackRequestId: null,
      activeRequestId: "active-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe("active-1");

    expect(resolveForemanDraftQueueKey({
      snapshot: null,
      fallbackRequestId: null,
      activeRequestId: "",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  });

  it("keeps queue key list parity for cleanup and pending-count queries", () => {
    expect(resolveForemanDraftQueueKeys({
      snapshot: snapshot("snap-1"),
      activeRequestId: "active-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toEqual(["snap-1", FOREMAN_LOCAL_ONLY_REQUEST_ID]);

    expect(resolveForemanDraftQueueKeys({
      snapshot: snapshot(""),
      activeRequestId: "active-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toEqual(["active-1", FOREMAN_LOCAL_ONLY_REQUEST_ID]);

    expect(resolveForemanDraftQueueKeys({
      snapshot: null,
      activeRequestId: "",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toEqual([FOREMAN_LOCAL_ONLY_REQUEST_ID]);
  });

  it("keeps can-edit branch parity for active draft request rows", () => {
    expect(canEditForemanRequestItem({
      row: { request_id: "remote-1" },
      isDraftActive: true,
      activeRequestDetailsId: "remote-1",
      activeRequestStatusIsDraftLike: true,
      requestId: "local-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(true);

    expect(canEditForemanRequestItem({
      row: { request_id: "remote-1" },
      isDraftActive: true,
      activeRequestDetailsId: "remote-1",
      activeRequestStatusIsDraftLike: false,
      requestId: "local-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(false);
  });

  it("allows local and local-only rows only while a draft is active", () => {
    expect(canEditForemanRequestItem({
      row: { request_id: "local-1" },
      isDraftActive: true,
      activeRequestDetailsId: null,
      activeRequestStatusIsDraftLike: false,
      requestId: "local-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(true);

    expect(canEditForemanRequestItem({
      row: { request_id: FOREMAN_LOCAL_ONLY_REQUEST_ID },
      isDraftActive: true,
      activeRequestDetailsId: null,
      activeRequestStatusIsDraftLike: false,
      requestId: "local-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(true);

    expect(canEditForemanRequestItem({
      row: { request_id: FOREMAN_LOCAL_ONLY_REQUEST_ID },
      isDraftActive: false,
      activeRequestDetailsId: null,
      activeRequestStatusIsDraftLike: false,
      requestId: "local-1",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    })).toBe(false);
  });

  it("plans remote details loading without mutating refs or running effects", () => {
    expect(planForemanRemoteDetailsLoadEffect({
      bootstrapReady: false,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
    })).toEqual({ action: "skip" });

    expect(planForemanRemoteDetailsLoadEffect({
      bootstrapReady: true,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: "req-1",
    })).toEqual({ action: "skip" });

    expect(planForemanRemoteDetailsLoadEffect({
      bootstrapReady: true,
      requestId: " req-1 ",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
    })).toEqual({ action: "load", requestId: "req-1" });
  });

  it("plans item loading and the skip-hydration ref cleanup branch", () => {
    expect(planForemanItemsLoadEffect({
      bootstrapReady: false,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
    })).toEqual({ action: "skip" });

    expect(planForemanItemsLoadEffect({
      bootstrapReady: true,
      requestId: "req-1",
      skipRemoteDraftEffects: true,
      skipRemoteHydrationRequestId: null,
    })).toEqual({ action: "skip" });

    expect(planForemanItemsLoadEffect({
      bootstrapReady: true,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: "req-1",
    })).toEqual({ action: "clear_skip_remote_hydration" });

    expect(planForemanItemsLoadEffect({
      bootstrapReady: true,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
    })).toEqual({ action: "load_items" });
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(join(__dirname, "foreman.draftBoundaryIdentity.model.ts"), "utf8");
    expect(source).not.toMatch(/from "react"|from "react-native"|supabase|mutationQueue|mutationWorker|offlineStorage/);
  });
});
